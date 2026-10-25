/* Genera un único HTML autónomo del panel con datos de ejemplo: `node scripts/build-preview.mjs salida.html [carpeta-fotos]`. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const out = process.argv[2] || 'panel-preview.html';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const entry = path.join(root, 'scripts/preview/entry.js'), main = path.join(root, 'public/js/admin/main.js');
const bundle = async (file) => (await build({ entryPoints: [file], bundle: true, write: false, format: 'iife', target: 'es2022', minify: false, legalComments: 'none' })).outputFiles[0].text;
const [previewJs, panelJs] = await Promise.all([bundle(entry), bundle(main)]);
const css = fs.readFileSync(path.join(root, 'public/css/admin.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script type="module"')).replace('<a href="/" target="_blank" rel="noopener">Ver la web ↗</a>', '<span>Vista previa</span>');
fs.writeFileSync(out, `<title>Panel Noelia Duque</title>
<meta name="description" content="Vista previa interactiva del panel de gestión del estudio de Noelia Duque, con datos de ejemplo.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>${css}
.preview-tag{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:250;background:#120e0c;color:#ece3d9;border-radius:999px;padding:.5rem .9rem;font:600 .62rem var(--body);letter-spacing:.14em;text-transform:uppercase;pointer-events:none}
@media (max-width:860px){.main{padding-top:4.2rem}.menu-open-btn{display:inline-flex}}
.menu-open-btn{display:none;position:fixed;top:max(12px,env(safe-area-inset-top,0px));left:12px;z-index:65;background:var(--ink);color:var(--bg);border:0;border-radius:999px;padding:.5rem .9rem;font:500 .8rem var(--body)}
</style>
${body}
<button class="menu-open-btn" onclick="document.getElementById('side').classList.toggle('open')">Menú</button>
<div class="preview-tag">Datos de ejemplo · nada se guarda</div>
<script>window.__PHOTOS=${JSON.stringify((process.argv[3] ? fs.readdirSync(process.argv[3]).filter((f) => /\.(webp|jpg|png)$/.test(f)).map((f) => 'img/work/' + f) : []))};</script>
<script>${previewJs}</script>
<script>${panelJs}</script>
`);
console.log(`Vista previa escrita en ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
