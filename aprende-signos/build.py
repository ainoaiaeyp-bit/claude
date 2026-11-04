#!/usr/bin/env python3
"""Genera signa-artifact.html (un solo archivo, sin html/head/body) a partir de los fuentes."""
import re
d = lambda f: open(f, encoding="utf-8").read()
idx = d("index.html")
head = re.search(r"<head>(.*)</head>", idx, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*|<link rel="stylesheet" href="styles.css">\s*', "", head)
body = re.search(r"<body>(.*)</body>", idx, re.S).group(1)
body = re.sub(r'<script src="[^"]+"></script>\s*', "", body)
out = head.strip() + "\n<style>\n" + d("styles.css") + "</style>\n" + body.strip() + "\n<script>\n" + d("data.js") + "\n" + d("app.js") + "</script>\n"
open("signa-artifact.html", "w", encoding="utf-8").write(out)
print(len(out), "bytes")
