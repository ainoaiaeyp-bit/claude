/* Genera un HTML autónomo de la web pública para previsualizarla: node scripts/build-site-preview.mjs salida.html */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const out = process.argv[2] || 'site-preview.html';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (f) => fs.readFileSync(path.join(root, 'public', f), 'utf8');
const entry = (await build({ entryPoints: [path.join(root, 'scripts/preview/site-entry.js')], bundle: true, write: false, format: 'iife', target: 'es2022', legalComments: 'none' })).outputFiles[0].text;
let html = rd('index.html');
html = html.replace(/src="\/img\//g, 'src="img/').replace(/content="\/img\//g, 'content="img/')
  .replace(/<link rel="icon"[^>]*>/, '')
  .replace('<link rel="stylesheet" href="/css/site.css">', () => `<style>${rd('css/site.css')}</style>`)
  .replace('<script src="/js/boot.js"></script>', () => `<script>${rd('js/boot.js')}</script>`)
  .replace('<script src="/vendor/gsap.min.js"></script>', () => '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>')
  .replace('<script src="/vendor/ScrollTrigger.min.js"></script>', () => '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>')
  .replace('<script src="/vendor/lenis.min.js"></script>', () => '<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js"></script>')
  .replace('<script src="/js/site.js" type="module"></script>', () => `<script>${entry}</script><script type="module">${rd('js/site.js')}</script>`)
  .replace('<script src="/js/extras.js" type="module"></script>', () => `<script type="module">${rd('js/extras.js')}</script>`)
  .replace('<script src="/js/fx.js" defer></script>', () => `<script>window.addEventListener('DOMContentLoaded',function(){${rd('js/fx.js')}\n});</script>`)
  .replace(/<link rel="canonical"[^>]*>/, '').replaceAll('%SITE%', '');
fs.writeFileSync(out, html);
console.log(`Vista previa de la web escrita en ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
