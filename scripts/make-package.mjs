/* Empaqueta la aplicación lista para subir a un servidor: node scripts/make-package.mjs  ->  dist/noelia-duque-web.zip
   No incluye datos, pruebas, vistas previas ni dependencias de desarrollo. */
import fs from 'node:fs';
import path from 'node:path';
import { zip } from '../server/core/zip.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INCLUDE = ['server', 'public', 'deploy', 'package.json', 'README.md', 'SEO.md', '.env.example'];
const SKIP = (rel) => /(^|\/)(\.DS_Store|\.gitkeep|node_modules|data|data-demo|dist)(\/|$)/.test(rel) || /\.(map)$/.test(rel) || rel.startsWith('public/img/gallery/');
const files = [];
const walk = (rel) => {
  const abs = path.join(root, rel), st = fs.statSync(abs);
  if (SKIP(rel)) return;
  if (st.isDirectory()) { for (const f of fs.readdirSync(abs)) walk(path.join(rel, f)); return; }
  files.push({ name: rel.split(path.sep).join('/'), data: new Uint8Array(fs.readFileSync(abs)), date: st.mtime });
};
for (const i of INCLUDE) if (fs.existsSync(path.join(root, i))) walk(i);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'noelia-duque-web.zip');
fs.writeFileSync(out, zip(files));
console.log(`${files.length} archivos · ${(fs.statSync(out).size / 1048576).toFixed(1)} MB → ${out}`);
