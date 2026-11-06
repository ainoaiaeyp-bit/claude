"""Servidor de Mielec: sirve la app (carpeta static/) y los datos de Red Eléctrica.

Solo biblioteca estándar de Python. Uso:
    python3 server.py            # http://127.0.0.1:8160
    MIELEC_DEMO=1 python3 server.py   # fuerza datos de ejemplo (sin llamar a REE)
Si REE no responde, la app recibe datos de EJEMPLO marcados con "demo": true y lo avisa en pantalla.
"""
import json
import math
import mimetypes
import os
import sys
from datetime import date, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import ree

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
FORZAR_DEMO = os.environ.get("MIELEC_DEMO") == "1"


# ---------- datos de ejemplo (solo si REE no responde) ----------
def _precio_demo(d: date, h: int):
    base = 0.135 + 0.025 * math.sin((d.toordinal() % 9) / 9 * 2 * math.pi)
    curva = 0.045 * math.sin((h - 9) / 24 * 2 * math.pi) + (0.03 if 19 <= h <= 22 else 0) - (0.035 if 1 <= h <= 6 else 0)
    return round(max(0.04, base + curva), 5)


def demo_hoy():
    out = {}
    for i in (0, 1):
        d = date.today() + timedelta(days=i)
        out[d.isoformat()] = [{"h": h, "pvpc": _precio_demo(d, h), "spot": round(_precio_demo(d, h) * 0.45, 5)} for h in range(24)]
    return out


def demo_diario(dias):
    out = []
    for i in range(dias - 1, -1, -1):
        d = date.today() - timedelta(days=i)
        # los últimos 4 días bajan para que se vea la alerta en el ejemplo
        ajuste = -0.02 * max(0, 4 - i)
        v = sum(_precio_demo(d, h) for h in range(24)) / 24 + ajuste
        out.append({"fecha": d.isoformat(), "pvpc": round(v, 5), "spot": round(v * 0.45, 5)})
    return out


def con_respaldo(real, demo):
    if FORZAR_DEMO:
        return {"demo": True, **demo()}
    try:
        return {"demo": False, **real()}
    except Exception as ex:  # noqa: BLE001 - cualquier fallo de red cae a ejemplo, pero se avisa
        print("REE no responde:", type(ex).__name__, ex, file=sys.stderr)
        return {"demo": True, **demo()}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def _json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api/ree/hoy":
            return self._json(con_respaldo(lambda: {"dias": ree.hoy()}, lambda: {"dias": demo_hoy()}))
        if u.path == "/api/ree/diario":
            try:
                n = max(3, min(60, int(parse_qs(u.query).get("dias", ["14"])[0])))
            except ValueError:
                n = 14
            return self._json(con_respaldo(lambda: {"dias": ree.diario(n)}, lambda: {"dias": demo_diario(n)}))
        if u.path == "/api/salud":
            return self._json({"ok": True})
        return super().do_GET()

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        if not self.path.startswith("/api/") and not self.path.startswith("/lib/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/manifest+json", ".webmanifest")

if __name__ == "__main__":
    puerto = int(os.environ.get("PORT", "8160"))
    host = os.environ.get("HOST", "127.0.0.1")  # en el VPS solo escucha en local; el proxy da la cara
    print(f"Mielec en http://{host}:{puerto}")
    ThreadingHTTPServer((host, puerto), H).serve_forever()
