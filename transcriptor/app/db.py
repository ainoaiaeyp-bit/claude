"""Almacenamiento SQLite. Sin límites de tamaño ni de cantidad."""
import json
import sqlite3
import threading
import time
import uuid

SCHEMA = """
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT,
  status TEXT NOT NULL,          -- queued | downloading | processing | done | error
  progress REAL NOT NULL DEFAULT 0,
  error TEXT,
  language TEXT,
  duration REAL,
  model TEXT,
  task TEXT,
  options TEXT,
  audio_path TEXT,
  segments TEXT NOT NULL DEFAULT '[]',
  summary TEXT,
  created REAL NOT NULL
);
"""


class DB:
    def __init__(self, path: str):
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        with self.lock:
            self.conn.executescript(SCHEMA)

    def _row(self, r, full=True):
        if r is None:
            return None
        d = dict(r)
        d["options"] = json.loads(d["options"] or "{}")
        segs = json.loads(d.pop("segments") or "[]")
        d["segment_count"] = len(segs)
        if full:
            d["segments"] = segs
        d["has_audio"] = bool(d.pop("audio_path"))
        return d

    def create(self, title, source, options, audio_path=None, status="queued"):
        tid = uuid.uuid4().hex[:12]
        with self.lock:
            self.conn.execute(
                "INSERT INTO transcripts(id,title,source,status,options,audio_path,model,task,created)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (tid, title, source, status, json.dumps(options), audio_path,
                 options.get("model"), options.get("task"), time.time()),
            )
            self.conn.commit()
        return tid

    def update(self, tid, **fields):
        if "segments" in fields:
            fields["segments"] = json.dumps(fields["segments"], ensure_ascii=False)
        cols = ", ".join(f"{k}=?" for k in fields)
        with self.lock:
            self.conn.execute(f"UPDATE transcripts SET {cols} WHERE id=?", (*fields.values(), tid))
            self.conn.commit()

    def get(self, tid, full=True):
        with self.lock:
            r = self.conn.execute("SELECT * FROM transcripts WHERE id=?", (tid,)).fetchone()
        return self._row(r, full)

    def audio_path(self, tid):
        with self.lock:
            r = self.conn.execute("SELECT audio_path FROM transcripts WHERE id=?", (tid,)).fetchone()
        return r["audio_path"] if r else None

    def list(self, q=None):
        with self.lock:
            rows = self.conn.execute("SELECT * FROM transcripts ORDER BY created DESC").fetchall()
        items = [self._row(r, full=False) for r in rows]
        if q:
            ql = q.lower()
            full = {i["id"]: self.get(i["id"]) for i in items}
            items = [i for i in items if ql in i["title"].lower()
                     or any(ql in s["text"].lower() for s in full[i["id"]]["segments"])]
        return items

    def delete(self, tid):
        with self.lock:
            self.conn.execute("DELETE FROM transcripts WHERE id=?", (tid,))
            self.conn.commit()

    def pending_ids(self):
        with self.lock:
            rows = self.conn.execute(
                "SELECT id FROM transcripts WHERE status IN ('queued','processing') ORDER BY created").fetchall()
        return [r["id"] for r in rows]
