/* Prueba de humo de Lienzo (Playwright).
 *   npm install && npx playwright install chromium && npm test
 * Sirve la carpeta con las mismas cabeceras de seguridad que producción y comprueba que:
 *  - no hay violaciones de CSP ni peticiones externas,
 *  - se pueden añadir elementos, deshacer, exportar PNG y PDF, y usar reglas/animaciones.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com; media-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
  fs.createReadStream(f).pipe(res);
});
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'OK  ' : 'FALLO ') + name + (extra ? ' – ' + extra : '')); if (!ok) failures++; };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const violations = [], external = [], errors = [];
  page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', ''].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url()); });
  await page.goto(base); await page.waitForTimeout(3500);

  check('carga la plantilla inicial', await page.evaluate(() => cv.getObjects().length > 3));
  await page.evaluate(() => addObj(SHAPES[0][3](), 'Rectángulo'));
  const n0 = await page.evaluate(() => cv.getObjects().length);
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500);
  check('deshacer quita el elemento', await page.evaluate(() => cv.getObjects().length) === n0 - 1);
  await page.keyboard.press('Control+y'); await page.waitForTimeout(500);
  check('rehacer lo recupera', await page.evaluate(() => cv.getObjects().length) === n0);
  await page.keyboard.press('r'); await page.waitForTimeout(200);
  check('atajo R añade un rectángulo', await page.evaluate(() => cv.getObjects().length) === n0 + 1);

  await page.evaluate(() => applyTemplate(14)); await page.waitForTimeout(2500);
  check('plantilla con tamaño propio (Certificado)', await page.evaluate(() => W === 1754 && H === 1240));
  await page.click('#rulerBtn'); check('reglas visibles', await page.evaluate(() => document.getElementById('stagewrap').classList.contains('rulers')));
  await page.evaluate(() => { const o = cv.getObjects().find(x => x.type === 'textbox'); o._anim = { type: 'up', dur: .3, delay: 0 }; });
  await page.evaluate(() => previewAnim()); check('vista previa de animación termina', true);

  const png = await page.evaluate(() => cv.toDataURL({ format: 'png', multiplier: 1 / zoom }));
  check('exporta PNG', png.startsWith('data:image/png') && png.length > 5000);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.evaluate(() => exportPDF(1))]);
  check('exporta PDF', dl.suggestedFilename().endsWith('.pdf'));
  // Importar un PDF: el texto debe quedar editable (y la CSP no debe bloquear el lector de PDF)
  const pdf64 = await page.evaluate(() => { const { jsPDF } = window.jspdf; const d = new jsPDF({ unit: 'pt', format: 'a4' }); d.setFontSize(24); d.text('Hola PDF', 40, 80); const u = new Uint8Array(d.output('arraybuffer')); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); });
  await page.evaluate(async b => { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); await handleFiles([new File([u], 'smoke.pdf', { type: 'application/pdf' })]); }, pdf64);
  await page.waitForSelector('#mImport.on', { timeout: 20000 });
  await page.selectOption('#importCard select >> nth=1', 'replace');
  await page.click('#importCard button:text-is("Importar")');
  await page.waitForFunction(() => !document.getElementById('mImport').classList.contains('on'), null, { timeout: 60000 });
  check('importa un PDF y deja el texto editable', await page.evaluate(() => cv.getObjects().some(o => o.text === 'Hola PDF') && cv.getObjects().some(o => o.name === 'Contenido del PDF')));
  check('QR disponible', await page.evaluate(() => typeof qrcode === 'function'));

  check('sin violaciones de CSP', violations.length === 0, violations[0] || '');
  check('sin peticiones externas', external.length === 0, external[0] || '');
  check('sin errores de JavaScript', errors.length === 0, errors[0] || '');
  await browser.close(); server.close();
  console.log(failures ? `\n${failures} comprobación(es) fallida(s)` : '\nTodo correcto');
  process.exit(failures ? 1 : 0);
})();
