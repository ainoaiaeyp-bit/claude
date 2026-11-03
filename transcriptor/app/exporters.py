"""Exportadores: TXT, SRT, VTT, JSON, Markdown y CSV."""
import csv
import io
import json


def _ts(sec: float, sep: str = ",") -> str:
    ms = int(round(max(sec, 0) * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def _short(sec: float) -> str:
    s = int(sec)
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{h:d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def to_txt(t: dict, timestamps: bool = False) -> str:
    if not timestamps:
        return "\n".join(s["text"].strip() for s in t["segments"]) + "\n"
    return "\n".join(f"[{_short(s['start'])}] {s['text'].strip()}" for s in t["segments"]) + "\n"


def to_srt(t: dict) -> str:
    out = []
    for i, s in enumerate(t["segments"], 1):
        out.append(f"{i}\n{_ts(s['start'])} --> {_ts(s['end'])}\n{s['text'].strip()}\n")
    return "\n".join(out)


def to_vtt(t: dict) -> str:
    out = ["WEBVTT\n"]
    for s in t["segments"]:
        out.append(f"{_ts(s['start'], '.')} --> {_ts(s['end'], '.')}\n{s['text'].strip()}\n")
    return "\n".join(out)


def to_json(t: dict) -> str:
    keep = {k: t.get(k) for k in ("id", "title", "language", "duration", "model", "task", "summary", "segments")}
    return json.dumps(keep, ensure_ascii=False, indent=2)


def to_md(t: dict) -> str:
    out = [f"# {t['title']}\n"]
    if t.get("summary"):
        out += ["## Resumen\n", t["summary"].strip() + "\n"]
    out.append("## Transcripción\n")
    out += [f"**[{_short(s['start'])}]** {s['text'].strip()}\n" for s in t["segments"]]
    return "\n".join(out)


def to_csv(t: dict) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["inicio", "fin", "texto"])
    for s in t["segments"]:
        w.writerow([round(s["start"], 2), round(s["end"], 2), s["text"].strip()])
    return buf.getvalue()


FORMATS = {
    "txt": (to_txt, "text/plain"),
    "srt": (to_srt, "application/x-subrip"),
    "vtt": (to_vtt, "text/vtt"),
    "json": (to_json, "application/json"),
    "md": (to_md, "text/markdown"),
    "csv": (to_csv, "text/csv"),
}


def export(t: dict, fmt: str, timestamps: bool = False):
    if fmt not in FORMATS:
        raise KeyError(fmt)
    fn, mime = FORMATS[fmt]
    body = fn(t, timestamps) if fmt == "txt" else fn(t)
    return body, mime
