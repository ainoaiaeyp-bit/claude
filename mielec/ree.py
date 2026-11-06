"""Conexión con Red Eléctrica (API pública de datos, sin clave): PVPC y mercado spot.

- PVPC (indicador 1001): término de energía de la tarifa regulada 2.0TD en €/MWh, ya con peajes y cargos.
- Mercado spot (indicador 600): precio mayorista en €/MWh (cuartohorario desde 2025; se promedia por hora).
Con ellos se calcula el precio medio de un periodo de facturación por periodo tarifario (P1..P6).
"""
import json
import threading
import time
import urllib.request
from datetime import date, datetime, timedelta

BASE = "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real"
TROZO = 27  # días por petición (la API rechaza rangos largos)
_cache = {}
_lock = threading.Lock()


def _pedir(ini: date, fin: date):
    """Devuelve {datetime_local_naive_hora: (pvpc, spot)} en €/MWh para [ini, fin] (ambos incluidos)."""
    k = (ini, fin)
    with _lock:
        c = _cache.get(k)
    # lo pasado se guarda 12 h; lo de hoy y mañana solo 15 min (se publican por la tarde)
    ttl = 12 * 3600 if fin < date.today() else 900
    if c and time.time() - c[0] < ttl:
        return c[1]
    u = f"{BASE}?start_date={ini.isoformat()}T00:00&end_date={fin.isoformat()}T23:59&time_trunc=hour"
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (Mielec)", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        d = json.load(r)
    pv, sp = {}, {}
    for inc in d.get("included", []):
        destino = pv if inc.get("id") == "1001" else sp if inc.get("id") == "600" else None
        if destino is None:
            continue
        for v in inc["attributes"]["values"]:
            h = datetime.fromisoformat(v["datetime"][:19]).replace(minute=0, second=0)
            destino.setdefault(h, []).append(float(v["value"]))
    out = {}
    for h in set(pv) | set(sp):
        out[h] = (sum(pv[h]) / len(pv[h]) if h in pv else None, sum(sp[h]) / len(sp[h]) if h in sp else None)
    with _lock:
        _cache[k] = (time.time(), out)
    return out


def serie(ini: date, fin: date):
    out = {}
    d = ini
    while d <= fin:
        h = min(fin, d + timedelta(days=TROZO - 1))
        out.update(_pedir(d, h))
        d = h + timedelta(days=1)
    return out


# ---------- calendario tarifario peninsular ----------
def _semana_santa(y):
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = (h + l - 7 * m + 114) % 31 + 1
    return date(y, mes, dia)


def festivo(d: date) -> bool:
    """Festivos nacionales que se tratan como fin de semana para peajes."""
    if (d.month, d.day) in {(1, 1), (1, 6), (5, 1), (8, 15), (10, 12), (11, 1), (12, 6), (12, 8), (12, 25)}:
        return True
    return d == _semana_santa(d.year) - timedelta(days=2)


# (punta, llano) por mes para 3.0TD y 6.1TD en laborables; P6 de 0 a 8 h y todo el fin de semana
_TEMP = {1: (1, 2), 2: (1, 2), 7: (1, 2), 12: (1, 2), 3: (2, 3), 11: (2, 3), 6: (3, 4), 8: (3, 4), 9: (3, 4), 4: (4, 5), 5: (4, 5), 10: (4, 5)}


def periodo(h: datetime, tarifa: str) -> int:
    """Número de periodo tarifario (1..6) de una hora local."""
    d = h.date()
    libre = d.weekday() >= 5 or festivo(d)
    hr = h.hour
    if tarifa == "2.0TD":
        if libre or hr < 8:
            return 3
        return 1 if (10 <= hr < 14 or 18 <= hr < 22) else 2
    if libre or hr < 8:
        return 6
    punta, llano = _TEMP[h.month]
    return punta if (9 <= hr < 14 or 18 <= hr < 22) else llano


def medias(ini: date, fin: date, tarifa: str):
    """Precio medio en €/kWh por periodo tarifario (media simple de las horas del rango)."""
    s = serie(ini, fin)
    n = 6 if tarifa != "2.0TD" else 3
    acc = {"pvpc": [[] for _ in range(n)], "spot": [[] for _ in range(n)]}
    for h, (pv, sp) in s.items():
        if not (ini <= h.date() <= fin):
            continue
        p = periodo(h, tarifa) - 1
        if pv is not None:
            acc["pvpc"][p].append(pv)
        if sp is not None:
            acc["spot"][p].append(sp)
    res = {}
    for k, v in acc.items():
        res[k] = [round(sum(x) / len(x) / 1000, 6) if x else None for x in v] + [None] * (6 - n)
    res["horas"] = {k: [len(x) for x in v] for k, v in acc.items()}
    return res


def hoy():
    """PVPC y spot por horas de hoy y mañana (si ya está publicado), en €/kWh."""
    h = date.today()
    s = serie(h, h + timedelta(days=1))
    dias = {}
    for hh in sorted(s):
        pv, sp = s[hh]
        dias.setdefault(hh.date().isoformat(), []).append({"h": hh.hour, "pvpc": None if pv is None else round(pv / 1000, 5), "spot": None if sp is None else round(sp / 1000, 5)})
    return dias


def estacionalidad():
    """Demanda eléctrica peninsular de los últimos 12 meses completos, como índice por día y mes del calendario.
    indice[m] = (demanda del mes / días del mes) / (media diaria de los 12 meses). Mes 0 = enero."""
    hoy_ = date.today()
    fin = date(hoy_.year, hoy_.month, 1) - timedelta(days=1)
    ini = date(fin.year - 1, fin.month, 1) + timedelta(days=32)
    ini = date(ini.year, ini.month, 1)
    u = ("https://apidatos.ree.es/es/datos/demanda/evolucion?start_date=%sT00:00&end_date=%sT23:59&time_trunc=month"
         "&geo_trunc=electric_system&geo_limit=peninsular&geo_ids=8741") % (ini.isoformat(), fin.isoformat())
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (Mielec)", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        d = json.load(r)
    vals = d["included"][0]["attributes"]["values"]
    por_dia = {}
    for v in vals:
        y, m = int(v["datetime"][:4]), int(v["datetime"][5:7])
        nd = (date(y + (m // 12), m % 12 + 1, 1) - date(y, m, 1)).days
        por_dia[m - 1] = float(v["value"]) / nd
    if len(por_dia) < 12:
        raise ValueError("datos incompletos")
    media = sum(por_dia.values()) / 12
    return {"indice": [round(por_dia[m] / media, 4) for m in range(12)], "desde": ini.isoformat(), "hasta": fin.isoformat(),
            "fuente": "REE, demanda eléctrica peninsular (hogares, servicios e industria)"}


def diario(dias=14):
    """Media diaria de PVPC y mercado mayorista (€/kWh) de los últimos `dias` días (incluye hoy y mañana si ya están)."""
    fin = date.today() + timedelta(days=1)
    s = serie(date.today() - timedelta(days=dias - 1), fin)
    acc = {}
    for h, (pv, sp) in s.items():
        a = acc.setdefault(h.date(), ([], []))
        if pv is not None:
            a[0].append(pv)
        if sp is not None:
            a[1].append(sp)
    out = []
    for d in sorted(acc):
        pv, sp = acc[d]
        if len(pv) < 20 and len(sp) < 20:
            continue  # día incompleto (p. ej. mañana aún sin publicar)
        out.append({"fecha": d.isoformat(),
                    "pvpc": round(sum(pv) / len(pv) / 1000, 5) if pv else None,
                    "spot": round(sum(sp) / len(sp) / 1000, 5) if sp else None})
    return out
