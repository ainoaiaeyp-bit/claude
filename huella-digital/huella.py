#!/usr/bin/env python3
"""Auditoría de huella digital propia.

Comprueba qué rastro público hay de TI (no de terceros) a partir de tus nombres
de usuario, emails y dominio, y genera un informe en Markdown.

Solo usa la biblioteca estándar de Python 3.8+. Sin dependencias.

Uso:
    python3 huella.py --titular --nombre "Nombre Apellido" \\
        --usuario miusuario --usuario otroalias \\
        --email yo@ejemplo.com --dominio ejemplo.com

Para la comprobación de filtraciones (opcional): exporta HIBP_API_KEY
(se obtiene en https://haveibeenpwned.com/API/Key).
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; auditoria-huella-propia/1.0)"
TIMEOUT = 10

# nombre, plantilla de URL. Se considera "encontrado" si responde 200 y
# "no encontrado" si responde 404. Cualquier otra respuesta -> "revisar a mano".
SITIOS = [
    ("GitHub", "https://github.com/{u}"),
    ("GitLab", "https://gitlab.com/{u}"),
    ("Bitbucket", "https://bitbucket.org/{u}/"),
    ("Dev.to", "https://dev.to/{u}"),
    ("Medium", "https://medium.com/@{u}"),
    ("Keybase", "https://keybase.io/{u}"),
    ("About.me", "https://about.me/{u}"),
    ("Behance", "https://www.behance.net/{u}"),
    ("Dribbble", "https://dribbble.com/{u}"),
    ("SoundCloud", "https://soundcloud.com/{u}"),
    ("Pinterest", "https://www.pinterest.com/{u}/"),
    ("Twitch", "https://www.twitch.tv/{u}"),
    ("YouTube", "https://www.youtube.com/@{u}"),
    ("Telegram", "https://t.me/{u}"),
    ("Steam", "https://steamcommunity.com/id/{u}"),
    ("Flickr", "https://www.flickr.com/people/{u}"),
    ("Replit", "https://replit.com/@{u}"),
    ("HackerNews", "https://news.ycombinator.com/user?id={u}"),
    ("Linktree", "https://linktr.ee/{u}"),
    ("Wikipedia", "https://es.wikipedia.org/wiki/Usuario:{u}"),
]

# Sitios que bloquean consultas automáticas: se ofrece solo el enlace para mirar a mano.
SITIOS_MANUALES = [
    ("Instagram", "https://www.instagram.com/{u}/"),
    ("X / Twitter", "https://x.com/{u}"),
    ("TikTok", "https://www.tiktok.com/@{u}"),
    ("Facebook", "https://www.facebook.com/{u}"),
    ("LinkedIn", "https://www.linkedin.com/in/{u}"),
    ("Reddit", "https://www.reddit.com/user/{u}"),
]

RE_USUARIO = re.compile(r"^[A-Za-z0-9._-]{2,40}$")
RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RE_DOMINIO = re.compile(r"^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,}$", re.I)


def pedir(url, headers=None):
    """Devuelve (codigo_http, cuerpo). codigo 0 = fallo de red."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, r.read(200_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except (urllib.error.URLError, TimeoutError, OSError):
        return 0, ""


def comprobar_usuario(usuario, sitios):
    def uno(sitio):
        nombre, plantilla = sitio
        url = plantilla.format(u=urllib.parse.quote(usuario, safe=""))
        codigo, _ = pedir(url)
        if codigo == 200:
            estado = "encontrado"
        elif codigo == 404:
            estado = "no encontrado"
        else:
            estado = "revisar a mano"
        return {"sitio": nombre, "url": url, "estado": estado, "codigo": codigo}

    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        return list(ex.map(uno, sitios))


def comprobar_gravatar(email, base="https://gravatar.com"):
    h = hashlib.md5(email.strip().lower().encode()).hexdigest()
    codigo, _ = pedir(f"{base}/avatar/{h}?d=404")
    return {200: "tiene perfil/avatar público", 404: "sin avatar público"}.get(
        codigo, "no se pudo comprobar"
    )


def comprobar_filtraciones(email, api_key, base="https://haveibeenpwned.com"):
    if not api_key:
        return None, "sin HIBP_API_KEY: comprueba a mano en https://haveibeenpwned.com"
    url = f"{base}/api/v3/breachedaccount/{urllib.parse.quote(email)}?truncateResponse=false"
    codigo, cuerpo = pedir(url, {"hibp-api-key": api_key})
    if codigo == 404:
        return [], "sin filtraciones conocidas"
    if codigo == 200:
        try:
            datos = json.loads(cuerpo)
        except ValueError:
            return None, "respuesta no válida"
        return [
            {
                "nombre": d.get("Name"),
                "fecha": d.get("BreachDate"),
                "datos": ", ".join(d.get("DataClasses", [])),
            }
            for d in datos
        ], f"{len(datos)} filtración(es)"
    if codigo == 401:
        return None, "API key no válida"
    if codigo == 429:
        return None, "límite de peticiones; reintenta en unos segundos"
    return None, f"no se pudo comprobar (HTTP {codigo})"


def comprobar_dominio(dominio, base="https://rdap.org"):
    codigo, cuerpo = pedir(f"{base}/domain/{urllib.parse.quote(dominio)}")
    if codigo != 200:
        return {"error": f"RDAP no disponible (HTTP {codigo})"}
    try:
        d = json.loads(cuerpo)
    except ValueError:
        return {"error": "respuesta no válida"}
    eventos = {e.get("eventAction"): e.get("eventDate") for e in d.get("events", [])}
    return {
        "registro": eventos.get("registration"),
        "expira": eventos.get("expiration"),
        "estado": ", ".join(d.get("status", [])),
        "servidores": ", ".join(
            n.get("ldhName", "") for n in d.get("nameservers", [])
        ),
    }


def enlaces_manuales(nombre, usuarios, emails):
    q = urllib.parse.quote
    out = []
    if nombre:
        n = f'"{nombre}"'
        out += [
            ("Google: tu nombre", f"https://www.google.com/search?q={q(n)}"),
            ("Google Imágenes: tu nombre", f"https://www.google.com/search?tbm=isch&q={q(n)}"),
            ("Google Noticias: tu nombre", f"https://www.google.com/search?tbm=nws&q={q(n)}"),
            ("Bing: tu nombre", f"https://www.bing.com/search?q={q(n)}"),
            ("DuckDuckGo: tu nombre", f"https://duckduckgo.com/?q={q(n)}"),
            ("LinkedIn (búsqueda)", f"https://www.google.com/search?q={q(n + ' site:linkedin.com')}"),
        ]
    for u in usuarios:
        out.append((f"Google: usuario {u}", f"https://www.google.com/search?q={q(chr(34) + u + chr(34))}"))
    for e in emails:
        out.append((f"Google: {e}", f"https://www.google.com/search?q={q(chr(34) + e + chr(34))}"))
        out.append(("Have I Been Pwned", f"https://haveibeenpwned.com/account/{q(e)}"))
    out += [
        ("Búsqueda inversa de tu foto (Google Lens)", "https://lens.google.com/"),
        ("Búsqueda inversa de tu foto (TinEye)", "https://tineye.com/"),
        ("Wayback Machine (versiones antiguas de tus webs)", "https://web.archive.org/"),
        ("Crear una alerta con tu nombre (Google Alerts)", "https://www.google.com/alerts"),
        ("Tus datos en Google", "https://myaccount.google.com/dashboard"),
        ("Solicitud de retirada de resultados de Google (derecho al olvido)",
         "https://reportcontent.google.com/forms/rtbf"),
    ]
    return out


def generar_informe(a, resultados):
    ahora = dt.datetime.now().strftime("%d/%m/%Y %H:%M")
    L = [f"# Informe de huella digital", "", f"Generado: {ahora}", ""]
    if a.nombre:
        L += [f"- **Nombre:** {a.nombre}"]
    if a.usuario:
        L += [f"- **Usuarios:** {', '.join(a.usuario)}"]
    if a.email:
        L += [f"- **Emails:** {', '.join(a.email)}"]
    if a.dominio:
        L += [f"- **Dominio:** {a.dominio}"]
    L += ["", "> Una coincidencia de nombre de usuario NO significa que la cuenta sea tuya: "
          "revisa cada enlace. Y un «no encontrado» tampoco garantiza que no exista.", ""]

    for usuario, filas in resultados["usuarios"].items():
        L += [f"## Usuario `{usuario}`", ""]
        enc = [f for f in filas if f["estado"] == "encontrado"]
        L += [f"**{len(enc)}** perfil(es) encontrado(s) de {len(filas)} sitios comprobados.", ""]
        L += ["| Sitio | Estado | Enlace |", "|---|---|---|"]
        orden = {"encontrado": 0, "revisar a mano": 1, "no encontrado": 2}
        for f in sorted(filas, key=lambda x: (orden[x["estado"]], x["sitio"])):
            L.append(f"| {f['sitio']} | {f['estado']} | {f['url']} |")
        L += ["", "Sitios que bloquean consultas automáticas (mira tú a mano):", ""]
        for nombre, plantilla in SITIOS_MANUALES:
            L.append(f"- {nombre}: {plantilla.format(u=urllib.parse.quote(usuario, safe=''))}")
        L.append("")

    for email, r in resultados["emails"].items():
        L += [f"## Email `{email}`", "", f"- Gravatar: {r['gravatar']}",
              f"- Filtraciones: {r['filtraciones_msg']}"]
        for b in r["filtraciones"] or []:
            L.append(f"  - **{b['nombre']}** ({b['fecha']}): {b['datos']}")
        L.append("")

    if resultados["dominio"]:
        d = resultados["dominio"]
        L += [f"## Dominio `{a.dominio}`", ""]
        if "error" in d:
            L.append(f"- {d['error']}")
        else:
            L += [f"- Registrado: {d['registro']}", f"- Expira: {d['expira']}",
                  f"- Estado: {d['estado']}", f"- Servidores DNS: {d['servidores']}",
                  "- Nota: muchos registradores ocultan los datos del titular (RGPD). "
                  "Si ves tu nombre o dirección, activa la privacidad WHOIS."]
        L.append("")

    L += ["## Comprobaciones manuales", ""]
    for texto, url in resultados["enlaces"]:
        L.append(f"- [{texto}]({url})")
    L += ["", "## Qué hacer con lo que encuentres", "",
          "1. Borra las cuentas que ya no uses (busca en tu gestor de contraseñas).",
          "2. Cambia la contraseña de todo email que aparezca en una filtración y activa la "
          "verificación en dos pasos.",
          "3. Pide la retirada de contenido a la web que lo aloja; si no responde, "
          "solicita su desindexación a Google/Bing.",
          "4. Para datos que una empresa tiene de ti: derecho de acceso y supresión (RGPD) "
          "escribiendo a su delegado de protección de datos. Si no te responden en un mes, "
          "reclama ante la AEPD (aepd.es).",
          "5. Revisa la privacidad de tus perfiles públicos (quién ve amigos, fotos y ubicación).",
          ""]
    return "\n".join(L)


def main(argv=None):
    p = argparse.ArgumentParser(description="Auditoría de tu propia huella digital.")
    p.add_argument("--titular", action="store_true",
                   help="Confirmo que estos datos son MÍOS (o tengo permiso expreso de su titular).")
    p.add_argument("--nombre", help="Tu nombre completo, para los enlaces de búsqueda.")
    p.add_argument("--usuario", action="append", default=[], help="Nombre de usuario/alias (repetible).")
    p.add_argument("--email", action="append", default=[], help="Email (repetible).")
    p.add_argument("--dominio", help="Un dominio tuyo.")
    p.add_argument("--salida", default="informe-huella.md", help="Fichero de informe.")
    p.add_argument("--sitios-json", help="JSON [[nombre, url_con_{u}], ...] para sustituir la lista de sitios.")
    p.add_argument("--base-gravatar", default="https://gravatar.com", help=argparse.SUPPRESS)
    p.add_argument("--base-hibp", default="https://haveibeenpwned.com", help=argparse.SUPPRESS)
    p.add_argument("--base-rdap", default="https://rdap.org", help=argparse.SUPPRESS)
    a = p.parse_args(argv)

    if not a.titular:
        p.error("añade --titular para confirmar que los datos son tuyos. "
                "Esta herramienta es solo para auditar tu propia huella.")
    if not (a.usuario or a.email or a.dominio or a.nombre):
        p.error("indica al menos --nombre, --usuario, --email o --dominio.")
    for u in a.usuario:
        if not RE_USUARIO.match(u):
            p.error(f"usuario no válido: {u!r}")
    for e in a.email:
        if not RE_EMAIL.match(e):
            p.error(f"email no válido: {e!r}")
    if a.dominio and not RE_DOMINIO.match(a.dominio):
        p.error(f"dominio no válido: {a.dominio!r}")

    sitios = SITIOS
    if a.sitios_json:
        with open(a.sitios_json, encoding="utf-8") as f:
            sitios = [tuple(s) for s in json.load(f)]

    res = {"usuarios": {}, "emails": {}, "dominio": None}
    for u in a.usuario:
        print(f"Comprobando usuario {u} en {len(sitios)} sitios…", file=sys.stderr)
        res["usuarios"][u] = comprobar_usuario(u, sitios)
    api_key = os.environ.get("HIBP_API_KEY")
    for e in a.email:
        print(f"Comprobando {e}…", file=sys.stderr)
        filt, msg = comprobar_filtraciones(e, api_key, a.base_hibp)
        res["emails"][e] = {"gravatar": comprobar_gravatar(e, a.base_gravatar),
                            "filtraciones": filt, "filtraciones_msg": msg}
    if a.dominio:
        print(f"Comprobando dominio {a.dominio}…", file=sys.stderr)
        res["dominio"] = comprobar_dominio(a.dominio, a.base_rdap)
    res["enlaces"] = enlaces_manuales(a.nombre, a.usuario, a.email)

    informe = generar_informe(a, res)
    with open(a.salida, "w", encoding="utf-8") as f:
        f.write(informe)
    print(f"Informe guardado en {a.salida}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
