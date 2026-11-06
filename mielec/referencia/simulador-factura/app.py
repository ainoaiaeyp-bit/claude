"""IA Simulador de factura: compara la factura de luz actual con una propuesta.

FastAPI + SQLite. El cálculo vive en static/calculo.js (se ve al momento y se prueba con `node prueba.mjs`).
Entrada desde IA Unity con ?hub=<token>, igual que IA Documentos.
Nunca se borra nada: las bajas son lógicas.
"""
import base64
import configparser
import json
import os
import re
import secrets
import sqlite3
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import ree
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

BASE = Path(__file__).parent
DATOS = Path(os.environ.get("SIM_DATOS", BASE / "datos"))
DATOS.mkdir(parents=True, exist_ok=True)
HUB = os.environ.get("SIM_HUB", "https://iaunity.ingenieriaaplicada.org")
DEV = os.environ.get("SIM_DEV") == "1"
FAKE = os.environ.get("SIM_FAKE") == "1"  # solo pruebas: la lectura devuelve una factura de ejemplo
MODULO_ID = os.environ.get("SIM_MODULO_ID")
COOKIE = "ssid"
DIAS_SESION = 14
MODELO = "claude-sonnet-5-5"
MAX_BYTES = 22 * 1024 * 1024

_cfg = configparser.ConfigParser()
_cfg.read(os.environ.get("SIM_CONFIG", BASE / "config.ini"))

app = FastAPI(title="IA Simulador de factura", docs_url=None, redoc_url=None)


def clave_ia():
    return os.environ.get("SIM_ANTHROPIC_KEY") or _cfg.get("anthropic", "clave", fallback="")


def conectar():
    con = sqlite3.connect(DATOS / "simulador.db")
    con.row_factory = sqlite3.Row
    return con


def ahora():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def iniciar():
    con = conectar()
    con.executescript("""
    CREATE TABLE IF NOT EXISTS sesiones(sid TEXT PRIMARY KEY, email TEXT, nombre TEXT, nivel TEXT, creada TEXT, caduca REAL);
    CREATE TABLE IF NOT EXISTS simulaciones(
        id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, datos TEXT NOT NULL, resumen TEXT DEFAULT '{}',
        activo INTEGER DEFAULT 1, baja_por TEXT, baja_en TEXT, creado_por TEXT, creado_por_nombre TEXT, creado TEXT, actualizado TEXT);
    CREATE TABLE IF NOT EXISTS versiones(
        id INTEGER PRIMARY KEY AUTOINCREMENT, simulacion_id INTEGER, datos TEXT, resumen TEXT, guardado_por TEXT, guardado TEXT);
    CREATE TABLE IF NOT EXISTS lecturas(
        id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT, lado TEXT, ficheros INTEGER, ok INTEGER, nota TEXT, ts TEXT);
    CREATE INDEX IF NOT EXISTS ix_sim_act ON simulaciones(activo, actualizado);
    """)
    con.commit()
    con.close()


iniciar()


# ---------- sesión ----------
def canjear(token):
    req = urllib.request.Request(HUB + "/api/sso/verificar", data=json.dumps({"hub": token}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.load(r)
    except Exception:
        return None


def crear_sesion(email, nombre, nivel):
    con = conectar()
    sid = secrets.token_urlsafe(32)
    con.execute("INSERT INTO sesiones VALUES (?,?,?,?,?,?)", (sid, email, nombre, nivel, ahora(), time.time() + DIAS_SESION * 86400))
    con.commit()
    con.close()
    return sid


def usuario(request: Request, minimo="ver"):
    sid = request.cookies.get(COOKIE)
    if not sid:
        raise HTTPException(401, "Sin sesión")
    con = conectar()
    f = con.execute("SELECT * FROM sesiones WHERE sid=?", (sid,)).fetchone()
    con.close()
    if not f or f["caduca"] < time.time():
        raise HTTPException(401, "Sesión caducada")
    orden = {"ver": 0, "editar": 1, "admin": 2}
    if orden.get(f["nivel"], 0) < orden[minimo]:
        raise HTTPException(403, "No tienes permiso para esto")
    return dict(f)


@app.middleware("http")
async def cabeceras(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE") and request.url.path.startswith("/api/") and request.headers.get("x-sim") != "1":
        return JSONResponse({"detail": "Falta cabecera"}, status_code=400)
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    if not request.url.path.startswith("/api/") and "cache-control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.get("/sso")
def sso(request: Request, hub: str = ""):
    if DEV and not hub:
        sid = crear_sesion("prueba@ingenieriaaplicada.com", "Usuario de prueba", "admin")
    else:
        u = canjear(hub) if hub else None
        if not u:
            return RedirectResponse(HUB + "/login.html")
        if MODULO_ID and str(u.get("modulo")) != str(MODULO_ID):
            return RedirectResponse(HUB)
        sid = crear_sesion(u["email"], u.get("nombre") or u["email"], u.get("nivel") or "ver")
    r = RedirectResponse("/")
    r.set_cookie(COOKIE, sid, max_age=DIAS_SESION * 86400, httponly=True, secure=not DEV, samesite="lax")
    return r


@app.get("/api/yo")
def yo(request: Request):
    u = usuario(request)
    return {"email": u["email"], "nombre": u["nombre"], "nivel": u["nivel"], "ia": bool(clave_ia()) or FAKE, "hub": HUB}


@app.post("/api/salir")
def salir(request: Request):
    sid = request.cookies.get(COOKIE)
    if sid:
        con = conectar()
        con.execute("DELETE FROM sesiones WHERE sid=?", (sid,))
        con.commit()
        con.close()
    r = JSONResponse({"ok": True})
    r.delete_cookie(COOKIE)
    return r


# ---------- simulaciones guardadas ----------
def _resumen(d):
    r = d.get("resumen") if isinstance(d, dict) else None
    return r if isinstance(r, dict) else {}


def _fila(f, con_datos=False):
    o = {"id": f["id"], "nombre": f["nombre"], "creado_por": f["creado_por_nombre"] or f["creado_por"],
         "creado": f["creado"], "actualizado": f["actualizado"], "resumen": json.loads(f["resumen"] or "{}")}
    if con_datos:
        o["datos"] = json.loads(f["datos"])
    return o


@app.get("/api/simulaciones")
def listar(request: Request, todas: int = 0):
    u = usuario(request)
    con = conectar()
    if u["nivel"] in ("editar", "admin") and todas:
        filas = con.execute("SELECT * FROM simulaciones WHERE activo=1 ORDER BY actualizado DESC LIMIT 500").fetchall()
    else:
        filas = con.execute("SELECT * FROM simulaciones WHERE activo=1 AND creado_por=? ORDER BY actualizado DESC LIMIT 500", (u["email"],)).fetchall()
    con.close()
    return [_fila(f) for f in filas]


def _cuerpo(b):
    nombre = str(b.get("nombre") or "").strip()[:160] or "Simulación sin nombre"
    datos = b.get("datos")
    if not isinstance(datos, dict):
        raise HTTPException(400, "Faltan los datos de la simulación")
    return nombre, datos, _resumen(b)


def _puede(u, f):
    return f["creado_por"] == u["email"] or u["nivel"] in ("editar", "admin")


@app.post("/api/simulaciones")
async def crear(request: Request):
    u = usuario(request)
    nombre, datos, res = _cuerpo(await request.json())
    con = conectar()
    cur = con.execute("INSERT INTO simulaciones(nombre,datos,resumen,creado_por,creado_por_nombre,creado,actualizado) VALUES (?,?,?,?,?,?,?)",
                      (nombre, json.dumps(datos), json.dumps(res), u["email"], u["nombre"], ahora(), ahora()))
    con.execute("INSERT INTO versiones(simulacion_id,datos,resumen,guardado_por,guardado) VALUES (?,?,?,?,?)",
                (cur.lastrowid, json.dumps(datos), json.dumps(res), u["email"], ahora()))
    con.commit()
    i = cur.lastrowid
    con.close()
    return {"id": i}


@app.get("/api/simulaciones/{sid}")
def abrir(sid: int, request: Request):
    u = usuario(request)
    con = conectar()
    f = con.execute("SELECT * FROM simulaciones WHERE id=? AND activo=1", (sid,)).fetchone()
    con.close()
    if not f or not _puede(u, f):
        raise HTTPException(404, "No existe")
    return _fila(f, True)


@app.put("/api/simulaciones/{sid}")
async def guardar(sid: int, request: Request):
    u = usuario(request)
    nombre, datos, res = _cuerpo(await request.json())
    con = conectar()
    f = con.execute("SELECT * FROM simulaciones WHERE id=? AND activo=1", (sid,)).fetchone()
    if not f or not _puede(u, f):
        con.close()
        raise HTTPException(404, "No existe")
    con.execute("UPDATE simulaciones SET nombre=?,datos=?,resumen=?,actualizado=? WHERE id=?", (nombre, json.dumps(datos), json.dumps(res), ahora(), sid))
    con.execute("INSERT INTO versiones(simulacion_id,datos,resumen,guardado_por,guardado) VALUES (?,?,?,?,?)",
                (sid, json.dumps(datos), json.dumps(res), u["email"], ahora()))
    con.commit()
    con.close()
    return {"ok": True}


@app.post("/api/simulaciones/{sid}/baja")
def baja(sid: int, request: Request):
    u = usuario(request)
    con = conectar()
    f = con.execute("SELECT * FROM simulaciones WHERE id=? AND activo=1", (sid,)).fetchone()
    if not f or not _puede(u, f):
        con.close()
        raise HTTPException(404, "No existe")
    con.execute("UPDATE simulaciones SET activo=0, baja_por=?, baja_en=? WHERE id=?", (u["email"], ahora(), sid))
    con.commit()
    con.close()
    return {"ok": True}


# ---------- Red Eléctrica ----------
@app.get("/api/ree/periodos")
def ree_periodos(request: Request, inicio: str, fin: str, tarifa: str = "2.0TD"):
    usuario(request)
    try:
        a, b = date.fromisoformat(inicio), date.fromisoformat(fin)
    except ValueError:
        raise HTTPException(400, "Fechas no válidas")
    if tarifa not in ("2.0TD", "3.0TD", "6.1TD") or b < a or (b - a).days > 400 or a < date(2021, 6, 1):
        raise HTTPException(400, "Rango no válido (desde junio de 2021, hasta 400 días)")
    if b >= date.today() + timedelta(days=1):
        b = date.today()
    try:
        r = ree.medias(a, b, tarifa)
    except Exception as ex:
        raise HTTPException(502, "Red Eléctrica no responde ahora mismo (" + type(ex).__name__ + "). Inténtalo en un minuto.")
    r.update({"inicio": a.isoformat(), "fin": b.isoformat(), "tarifa": tarifa})
    if tarifa != "2.0TD":
        r["pvpc"] = [None] * 6  # el PVPC solo existe para 2.0TD
    return r


@app.get("/api/ree/estacionalidad")
def ree_estacionalidad(request: Request):
    usuario(request)
    try:
        return ree.estacionalidad()
    except Exception as ex:
        raise HTTPException(502, "Red Eléctrica no responde ahora mismo (" + type(ex).__name__ + ")")


@app.get("/api/ree/hoy")
def ree_hoy(request: Request):
    usuario(request)
    try:
        return ree.hoy()
    except Exception as ex:
        raise HTTPException(502, "Red Eléctrica no responde ahora mismo (" + type(ex).__name__ + ")")


# ---------- lectura con IA ----------
PROMPT = """Eres el lector de facturas de electricidad y ofertas de comercializadoras de Ingeniería Aplicada (España).
Te paso una factura de luz o una oferta/propuesta (fotos o PDF, puede tener varias páginas). Devuelve SOLO un JSON con esta forma exacta.
Lo que no se vea con claridad va a null (o a [] en listas). NO inventes nada.

{
 "tipo_documento": "factura" | "oferta",
 "comercializadora": texto | null,
 "cliente": {"nombre": texto|null, "cups": texto|null, "tarifa": "2.0TD"|"3.0TD"|"6.1TD"|null, "dias": número de días del periodo facturado|null, "inicio": "AAAA-MM-DD"|null, "fin": "AAAA-MM-DD"|null},
 "consumo_kwh": [P1,P2,P3,P4,P5,P6]  (kWh de energía activa por periodo; en 2.0TD solo P1 punta, P2 llano, P3 valle; resto null; si solo hay un total pon el total en P1 y deja el resto null),
 "excedentes_kwh": kWh vertidos a la red|null,
 "potencia": {"contratada_kw": [P1..P6] (en 2.0TD solo P1 y P2), "precios": [P1..P6] tal y como aparecen, "unidad": "dia"|"mes"|"anio"  (€/kW·día, €/kW·mes o €/kW·año)},
 "energia": {"precios": [P1..P6] precio de la energía por periodo tal y como aparece (si hay un precio único repítelo en todos los periodos que existan; en 2.0TD: si solo hay punta y valle, pon el precio de punta en P1 y en P2 y el de valle en P3; si hay un precio por periodo, uno en cada uno), "unidad": "eur"|"cent"|"mwh"  (€/kWh, céntimos de €/kWh o €/MWh)},
 "compensacion_excedentes_eur_kwh": precio de compensación de excedentes en €/kWh|null,
 "alquiler": {"importe": número|null, "unidad": "dia"|"mes"|"anio"},
 "cargos_regulados": [{"nombre": texto, "importe": número, "unidad": "dia"|"mes"|"anio"}]  (financiación del bono social, tasas municipales y otros cargos que fija la normativa; NO los pongas también en "otros"),
 "otros": [{"nombre": texto, "importe": euros del periodo sin IVA, "tributa_iee": true|false}]  (energía reactiva, exceso de potencia, cargos que no sean ni potencia ni energía ni alquiler ni servicios),
 "servicios": [{"nombre": texto, "importe": número, "unidad": "dia"|"mes"|"anio"|"unico", "meses": duración en meses|null}]  (mantenimiento, seguros, asistencia, servicios extra contratados),
 "descuentos": [{"nombre": texto, "tipo": "pct"|"eur"|"eurkwh"|"unico", "valor": número (pct: 10 = 10 %; eur: € al mes; eurkwh: € por kWh; unico: € una vez), "aplica": "potencia"|"energia"|"electricidad"|"servicio"|"servicios"|"total", "servicio_nombre": nombre del servicio al que se aplica o del que depende|null, "depende_de_servicio": true si solo se da contratando ese servicio, "meses": duración en meses|null}],
 "permanencia": {"meses": número|null, "penalizacion": euros por salir antes|null},
 "iva_pct": número|null, "iee_pct": número|null,
 "total_factura": importe total a pagar con impuestos (solo si es una factura)|null,
 "legible": true|false,
 "notas": [frases cortas con dudas, páginas que faltan o cosas raras]
}
Reglas:
- Si solo aparece el importe de una línea y no su precio unitario, calcula el precio (importe / (kW × días) o importe / kWh) y ponlo con la unidad "dia" o "eur".
- Si el documento es una oferta con precios sin consumos, deja consumo_kwh y total_factura en null.
- El descuento "pct" sobre "energia" o "potencia" va con ese aplica; un "x % de descuento en la factura" va con aplica "electricidad" salvo que diga que incluye servicios.
- Los importes de la factura que ya llevan el descuento aplicado NO los repitas como descuento si no se ve la línea del descuento.
Sin texto fuera del JSON."""


def _limpiar(d):
    """Valida lo mínimo para que el front no reviente con un JSON raro."""
    if not isinstance(d, dict):
        return {"legible": False, "notas": ["La respuesta de la IA no se pudo interpretar. Rellénalo a mano."]}

    def lista6(v):
        out = []
        for x in (v if isinstance(v, list) else [])[:6]:
            try:
                out.append(float(x) if x is not None else None)
            except (TypeError, ValueError):
                out.append(None)
        return out + [None] * (6 - len(out))

    d["consumo_kwh"] = lista6(d.get("consumo_kwh"))
    for k in ("potencia", "energia"):
        if not isinstance(d.get(k), dict):
            d[k] = {}
    d["potencia"]["contratada_kw"] = lista6(d["potencia"].get("contratada_kw"))
    d["potencia"]["precios"] = lista6(d["potencia"].get("precios"))
    d["energia"]["precios"] = lista6(d["energia"].get("precios"))
    if d["potencia"].get("unidad") not in ("dia", "mes", "anio"):
        d["potencia"]["unidad"] = "dia"
    if d["energia"].get("unidad") not in ("eur", "cent", "mwh"):
        d["energia"]["unidad"] = "eur"
    for k in ("otros", "servicios", "descuentos", "notas", "cargos_regulados"):
        if not isinstance(d.get(k), list):
            d[k] = []
    c = d.get("cliente") if isinstance(d.get("cliente"), dict) else {}
    for k in ("inicio", "fin"):
        try:
            date.fromisoformat(str(c.get(k)))
        except ValueError:
            c[k] = None
    if c.get("tarifa") not in ("2.0TD", "3.0TD", "6.1TD"):
        c["tarifa"] = None
    d["cliente"] = c
    d["legible"] = bool(d.get("legible", True))
    return d


EJEMPLO = {"tipo_documento": "factura", "comercializadora": "Comercializadora de ejemplo", "legible": True,
           "cliente": {"nombre": "Cliente de prueba", "cups": None, "tarifa": "2.0TD", "dias": 31, "inicio": "2026-09-01", "fin": "2026-10-01"},
           "consumo_kwh": [58.2, 71.4, 190.6, None, None, None], "excedentes_kwh": None,
           "potencia": {"contratada_kw": [4.6, 4.6, None, None, None, None], "precios": [0.0891, 0.0467, None, None, None, None], "unidad": "dia"},
           "energia": {"precios": [0.172, 0.121, 0.089, None, None, None], "unidad": "eur"},
           "alquiler": {"importe": 0.81, "unidad": "mes"},
           "otros": [], "servicios": [{"nombre": "Mantenimiento hogar", "importe": 6.5, "unidad": "mes", "meses": None}],
           "descuentos": [{"nombre": "5 % si contratas mantenimiento", "tipo": "pct", "valor": 5, "aplica": "energia", "servicio_nombre": "Mantenimiento hogar", "depende_de_servicio": True, "meses": 12}],
           "permanencia": {"meses": 12, "penalizacion": 50}, "iva_pct": 21, "iee_pct": 5.11, "total_factura": 78.9,
           "notas": ["Datos de ejemplo (modo prueba)."]}


@app.post("/api/leer")
async def leer(request: Request):
    u = usuario(request, "ver")
    try:
        b = await request.json()
    except ValueError:
        raise HTTPException(400, "Petición no válida")
    archivos = b.get("archivos") or []
    lado = "propuesta" if b.get("lado") == "propuesta" else "actual"
    if not archivos or len(archivos) > 8:
        raise HTTPException(400, "Sube de 1 a 8 archivos (fotos o PDF)")
    bloques, total = [], 0
    for a in archivos:
        mime, dat = a.get("mime", ""), a.get("datos", "")
        total += len(dat) * 3 // 4
        if mime == "application/pdf":
            bloques.append({"type": "document", "source": {"type": "base64", "media_type": mime, "data": dat}})
        elif mime in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            bloques.append({"type": "image", "source": {"type": "base64", "media_type": mime, "data": dat}})
        else:
            raise HTTPException(400, "Formato no admitido: sube fotos JPG/PNG o un PDF")
    if total > MAX_BYTES:
        raise HTTPException(400, "Los archivos pesan demasiado (máximo 22 MB)")

    con = conectar()

    def registrar(ok, nota=""):
        con.execute("INSERT INTO lecturas(usuario,lado,ficheros,ok,nota,ts) VALUES (?,?,?,?,?,?)", (u["email"], lado, len(archivos), int(ok), nota[:300], ahora()))
        con.commit()
        con.close()

    if FAKE:
        registrar(True, "fake")
        return _limpiar(json.loads(json.dumps(EJEMPLO)))
    clave = clave_ia()
    if not clave:
        registrar(False, "sin clave")
        raise HTTPException(503, "La lectura con IA no está configurada todavía. Rellena los datos a mano.")
    carga = json.dumps({"model": _cfg.get("anthropic", "modelo", fallback=MODELO), "max_tokens": 4000,
                        "messages": [{"role": "user", "content": bloques + [{"type": "text", "text": PROMPT}]}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=carga, method="POST",
                                 headers={"x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    try:
        import asyncio
        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=120).read())
        txt = "".join(x.get("text", "") for x in json.loads(resp).get("content", []))
    except Exception as ex:
        registrar(False, type(ex).__name__)
        raise HTTPException(502, "No se pudo leer el documento (" + type(ex).__name__ + "). Inténtalo otra vez o rellénalo a mano.")
    m = re.search(r"\{.*\}", txt, re.S)
    try:
        datos = json.loads(m.group(0)) if m else {}
    except ValueError:
        datos = {}
    out = _limpiar(datos)
    registrar(out.get("legible", False))
    return out


# ---------- PDF con texto real (Chromium sin interfaz) ----------
import threading
from urllib.parse import unquote, urlparse

_pdf_cupo = threading.Semaphore(2)
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(BASE / "navegador"))
_TIPOS = {".css": "text/css", ".ttf": "font/ttf", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".woff2": "font/woff2"}


@app.post("/api/pdf")
async def pdf(request: Request):
    usuario(request)
    b = await request.json()
    hoja = b.get("html", "")
    if not isinstance(hoja, str) or not hoja or len(hoja) > 3_000_000:
        raise HTTPException(400, "Informe no válido")
    doc = ('<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/informe.css"></head>'
           '<body class="app"><div id="wrap" class="solo"><section id="res"><div id="inf-doc">' + hoja + "</div></section></div></body></html>")
    return await _en_hilo(_generar_pdf, doc)


async def _en_hilo(f, *a):
    from starlette.concurrency import run_in_threadpool
    from fastapi.responses import Response
    datos = await run_in_threadpool(f, *a)
    return Response(datos, media_type="application/pdf")


def _generar_pdf(doc):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise HTTPException(501, "PDF de servidor no disponible")
    static = (BASE / "static").resolve()
    if not _pdf_cupo.acquire(timeout=30):
        raise HTTPException(503, "Servidor ocupado, inténtalo de nuevo")
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch(args=["--no-sandbox"])
            try:
                ctx = nav.new_context(java_script_enabled=False, viewport={"width": 1000, "height": 1200})
                pag = ctx.new_page()

                def atender(ruta):
                    u = urlparse(ruta.request.url)
                    if u.netloc != "informe.local":
                        return ruta.abort()
                    if u.path == "/doc":
                        return ruta.fulfill(body=doc, content_type="text/html; charset=utf-8")
                    f = (static / unquote(u.path).lstrip("/")).resolve()
                    if static in f.parents and f.is_file() and f.suffix in _TIPOS:
                        return ruta.fulfill(body=f.read_bytes(), content_type=_TIPOS[f.suffix])
                    ruta.abort()

                pag.route("**/*", atender)
                pag.goto("http://informe.local/doc", wait_until="load")
                pag.wait_for_timeout(400)
                return pag.pdf(prefer_css_page_size=True, print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
            finally:
                nav.close()
    finally:
        _pdf_cupo.release()


app.mount("/", StaticFiles(directory=BASE / "static", html=True), name="static")
