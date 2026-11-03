"""Motores de transcripción. `faster` = Whisper real; `fake` = pruebas sin modelo."""
import os
import threading

MODELS = ["tiny", "base", "small", "medium", "large-v3", "large-v3-turbo", "distil-large-v3"]


class FakeEngine:
    """Devuelve segmentos deterministas. Sirve para tests y para probar la interfaz."""

    def transcribe(self, path, model, language, task, word_timestamps, vad, on_progress):
        words = "esto es una transcripción de prueba generada sin modelo real".split()
        segs = []
        for i in range(6):
            start, end = i * 4.0, i * 4.0 + 3.5
            seg = {"start": start, "end": end, "text": f" Segmento {i + 1}: {' '.join(words)}."}
            if word_timestamps:
                step = 3.5 / len(words)
                seg["words"] = [{"start": start + j * step, "end": start + (j + 1) * step, "word": w}
                                for j, w in enumerate(words)]
            segs.append(seg)
            on_progress(end / 24.0)
        return {"language": language or "es", "duration": 24.0}, segs


class FasterWhisperEngine:
    def __init__(self):
        self._models = {}
        self._lock = threading.Lock()

    def _get(self, name):
        with self._lock:
            if name not in self._models:
                from faster_whisper import WhisperModel
                device = os.environ.get("TRANSCRIPTOR_DEVICE", "auto")
                compute = os.environ.get("TRANSCRIPTOR_COMPUTE", "auto")
                self._models = {name: WhisperModel(name, device=device, compute_type=compute)}
            return self._models[name]

    def transcribe(self, path, model, language, task, word_timestamps, vad, on_progress):
        m = self._get(model)
        gen, info = m.transcribe(
            path,
            language=language or None,
            task=task,
            word_timestamps=word_timestamps,
            vad_filter=vad,
            beam_size=5,
        )
        segs = []
        for s in gen:  # generador: se procesa sin límite de duración
            seg = {"start": s.start, "end": s.end, "text": s.text}
            if word_timestamps and s.words:
                seg["words"] = [{"start": w.start, "end": w.end, "word": w.word} for w in s.words]
            segs.append(seg)
            if info.duration:
                on_progress(min(s.end / info.duration, 0.99))
        return {"language": info.language, "duration": info.duration}, segs


def get_engine():
    if os.environ.get("TRANSCRIPTOR_ENGINE") == "fake":
        return FakeEngine()
    return FasterWhisperEngine()
