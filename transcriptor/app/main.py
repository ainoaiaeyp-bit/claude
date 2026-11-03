"""Transcriptor: TurboScribe self-hosted, sin límites de tiempo ni de tamaño."""
import base64
import hmac
import os
import re
from pathlib import Path

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

from . import exporters
from .db import DB
from .engine import MODELS, get_engine
from .jobs import Worker

BASE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("TRANSCRIPTOR_DATA", BASE / "data"))
(DATA / "media").mkdir(parents=True, exist_ok=True)

db = DB(str(DATA / "db.sqlite"))
worker = Worker(db, get_engine(), DATA)
app = FastAPI(title="Transcriptor")

PASSWORD = os.environ.get("TRANSCRIPTOR_PASSWORD")


@app.middleware("http")
async def auth(request: Request, call_next):
    if PASSWORD:
        h = request.headers.get("authorization", "")
        ok = False
        if h.startswith("Basic "):
            try:
                user_pass = base64.b64decode(h[6:]).decode()
                ok = hmac.compare_digest(user_pass.partition(":")[2], PASSWORD)
            except Exception:  # noqa: BLE001
                ok = False
        if not ok:
            return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="Transcriptor"'})
    return await call_next(request)


def _opts(model, language, task, word_timestamps, vad):
    if model not in MODELS:
        raise HTTPException(400, f"Modelo no válido: {model}")
    if task not in ("transcribe", "translate"):
        raise HTTPException(400, "task debe ser transcribe o translate")
    return {"model": model, "language": language or None, "task": task,
            "word_timestamps": word_timestamps, "vad": vad}


@app.get("/api/config")
def config():
    return {"models": MODELS, "summary": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "formats": list(exporters.FORMATS)}


@app.post("/api/transcripts")
async def upload(files: list[UploadFile] = File(...), model: str = Form("small"),
                 language: str = Form(""), task: str = Form("transcribe"),
                 word_timestamps: bool = Form(False), vad: bool = Form(True)):
    opts = _opts(model, language, task, word_timestamps, vad)
    ids = []
    for f in files:
        tid = db.create(f.filename or "sin título", "upload", opts, status="queued")
        d = DATA / "media" / tid
        d.mkdir(parents=True, exist_ok=True)
        dest = d / ("src" + (Path(f.filename or "").suffix or ".bin"))
        with open(dest, "wb") as out:  # streaming a disco: sin límite de tamaño
            while chunk := await f.read(1024 * 1024):
                out.write(chunk)
        db.update(tid, audio_path=str(dest))
        worker.submit(tid)
        ids.append(tid)
    return {"ids": ids}


class UrlIn(BaseModel):
    urls: list[str]
    model: str = "small"
    language: str = ""
    task: str = "transcribe"
    word_timestamps: bool = False
    vad: bool = True


@app.post("/api/transcripts/url")
def from_url(body: UrlIn):
    opts = _opts(body.model, body.language, body.task, body.word_timestamps, body.vad)
    ids = []
    for u in filter(None, (x.strip() for x in body.urls)):
        if not re.match(r"^https?://", u):
            raise HTTPException(400, f"URL no válida: {u}")
        tid = db.create(u, u, {**opts, "url": u})
        worker.submit(tid)
        ids.append(tid)
    return {"ids": ids}


@app.get("/api/transcripts")
def list_all(q: str = ""):
    return db.list(q or None)


def _get(tid):
    t = db.get(tid)
    if not t:
        raise HTTPException(404, "No existe")
    return t


@app.get("/api/transcripts/{tid}")
def get_one(tid: str):
    return _get(tid)


class PatchIn(BaseModel):
    title: str | None = None
    segments: list[dict] | None = None


@app.patch("/api/transcripts/{tid}")
def patch(tid: str, body: PatchIn):
    _get(tid)
    fields = {}
    if body.title is not None:
        fields["title"] = body.title.strip() or "sin título"
    if body.segments is not None:
        for s in body.segments:
            if not {"start", "end", "text"} <= s.keys():
                raise HTTPException(400, "Segmento inválido")
        fields["segments"] = body.segments
    if fields:
        db.update(tid, **fields)
    return _get(tid)


@app.delete("/api/transcripts/{tid}")
def delete(tid: str):
    _get(tid)
    db.delete(tid)
    import shutil
    shutil.rmtree(DATA / "media" / tid, ignore_errors=True)
    return {"ok": True}


@app.post("/api/transcripts/{tid}/retry")
def retry(tid: str):
    t = _get(tid)
    if t["status"] not in ("error", "done"):
        raise HTTPException(409, "Aún en proceso")
    db.update(tid, status="queued", progress=0, error=None)
    worker.submit(tid)
    return {"ok": True}


@app.get("/api/transcripts/{tid}/audio")
def audio(tid: str):
    p = db.audio_path(tid)
    if not p or not Path(p).exists():
        raise HTTPException(404, "Sin audio")
    return FileResponse(p)  # soporta Range para saltar en el reproductor


@app.get("/api/transcripts/{tid}/export")
def export(tid: str, format: str = "txt", timestamps: bool = False):
    t = _get(tid)
    try:
        body, mime = exporters.export(t, format, timestamps)
    except KeyError:
        raise HTTPException(400, "Formato desconocido")
    name = re.sub(r"[^\w\- ]+", "", Path(t["title"]).stem)[:80] or "transcripcion"
    return Response(body, media_type=f"{mime}; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}.{format}"'})


@app.post("/api/transcripts/{tid}/summary")
def summary(tid: str):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(501, "Define ANTHROPIC_API_KEY para activar los resúmenes")
    t = _get(tid)
    text = exporters.to_txt(t)
    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
        json={"model": os.environ.get("SUMMARY_MODEL", "claude-sonnet-5-5"), "max_tokens": 1500,
              "messages": [{"role": "user", "content":
                            "Resume esta transcripción en el mismo idioma: un párrafo breve, "
                            "luego puntos clave y, si los hay, tareas pendientes.\n\n" + text}]},
        timeout=120,
    )
    if r.status_code != 200:
        raise HTTPException(502, f"Error del servicio de resumen ({r.status_code})")
    s = "".join(b.get("text", "") for b in r.json()["content"])
    db.update(tid, summary=s)
    return {"summary": s}


@app.get("/")
def index():
    return FileResponse(BASE / "static" / "index.html")
