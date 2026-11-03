"""Cola de trabajos: un hilo trabajador procesa los archivos de uno en uno."""
import queue
import shutil
import subprocess
import threading
from pathlib import Path


class Worker:
    def __init__(self, db, engine, data_dir: Path):
        self.db, self.engine, self.data_dir = db, engine, Path(data_dir)
        self.q = queue.Queue()
        threading.Thread(target=self._loop, daemon=True).start()
        for tid in db.pending_ids():  # reanuda lo pendiente tras un reinicio
            self.q.put(tid)

    def submit(self, tid):
        self.q.put(tid)

    def _loop(self):
        while True:
            tid = self.q.get()
            try:
                self._run(tid)
            except Exception as e:  # noqa: BLE001
                self.db.update(tid, status="error", error=str(e)[:500])

    def _run(self, tid):
        t = self.db.get(tid, full=False)
        if not t:
            return
        opts = t["options"]
        path = self.db.audio_path(tid)
        if not path and opts.get("url"):
            self.db.update(tid, status="downloading")
            path, title = self._download(tid, opts["url"])
            self.db.update(tid, audio_path=path, title=title)
        self.db.update(tid, status="processing", progress=0.0, error=None)
        info, segs = self.engine.transcribe(
            path, opts.get("model", "small"), opts.get("language") or None,
            opts.get("task", "transcribe"), bool(opts.get("word_timestamps")),
            bool(opts.get("vad", True)), lambda p: self.db.update(tid, progress=p),
        )
        self.db.update(tid, status="done", progress=1.0, segments=segs,
                       language=info["language"], duration=info["duration"])
        self._make_playable(tid, path)

    def _download(self, tid, url):
        import yt_dlp
        out = self.data_dir / "media" / tid
        out.mkdir(parents=True, exist_ok=True)
        with yt_dlp.YoutubeDL({"format": "bestaudio/best", "outtmpl": str(out / "src.%(ext)s"),
                               "quiet": True, "noplaylist": True}) as ydl:
            info = ydl.extract_info(url, download=True)
            return ydl.prepare_filename(info), info.get("title") or url

    def _make_playable(self, tid, path):
        """Convierte a Opus ligero para el reproductor (vídeos grandes → solo audio)."""
        if not shutil.which("ffmpeg"):
            return
        dst = Path(path).with_name("play.ogg")
        r = subprocess.run(["ffmpeg", "-y", "-i", path, "-vn", "-ac", "1", "-c:a", "libopus",
                            "-b:a", "32k", str(dst)], capture_output=True)
        if r.returncode == 0 and dst.exists():
            self.db.update(tid, audio_path=str(dst))
