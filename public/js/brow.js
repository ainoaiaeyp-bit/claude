// Ceja dibujada pelo a pelo sobre el bloque de piel. Determinista, se completa en ~2,6 s
// (o al instante con "reducir movimiento"). Los puntos A/B/C marcan el mapeo clásico de cejas.
const canvas = document.getElementById('brow');
const ctx = canvas.getContext('2d');
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Curva de la ceja (cabeza -> arco -> cola) en coordenadas normalizadas.
const P = [[0.18, 0.62], [0.36, 0.34], [0.60, 0.30], [0.82, 0.58]];
const bez = (t) => {
  const u = 1 - t;
  return [0, 1].map((k) => u*u*u*P[0][k] + 3*u*u*t*P[1][k] + 3*u*t*t*P[2][k] + t*t*t*P[3][k]);
};
const tan = (t) => {
  const u = 1 - t;
  const d = [0, 1].map((k) => 3*u*u*(P[1][k]-P[0][k]) + 6*u*t*(P[2][k]-P[1][k]) + 3*t*t*(P[3][k]-P[2][k]));
  const l = Math.hypot(d[0], d[1]) || 1;
  return [d[0]/l, d[1]/l];
};

const hairs = [];
{
  const r = rng(7), N = 360;
  for (let i = 0; i < N; i++) {
    const t = Math.pow(i / (N - 1), 0.9);
    const th = 0.055 * (1 - 0.6 * t) + 0.01;            // grosor relativo: más ancha en la cabeza
    const side = r() < 0.5 ? -1 : 1;
    const off = (r() * 2 - 1) * th;
    const lenK = 0.045 + r() * 0.03 + 0.02 * (1 - t);
    const lift = (1 - t) * 0.9 + 0.1;                    // la cabeza sube, el cuerpo sigue la línea
    hairs.push({ t, off, side, lenK, lift, w: 0.9 + r() * 0.9, a: 0.55 + r() * 0.4, j: (r() - 0.5) * 0.35 });
  }
}

function draw(progress) {
  const dpr = devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const s = Math.min(W * 1.2, H * 2.4);
  const ox = (W - s) / 2, oy = (H - s / 2.4) / 2;
  const X = (x) => ox + x * s, Y = (y) => oy + y * (s / 2.4);
  const stroke = css('--stroke');

  // mapeo
  ctx.save();
  ctx.strokeStyle = stroke; ctx.fillStyle = stroke; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
  ctx.font = `500 10px ${css('--body') || 'sans-serif'}`;
  [['A', 0.0, 'INICIO'], ['B', 0.62, 'ARCO'], ['C', 1.0, 'FINAL']].forEach(([k, t, name]) => {
    const [x, y] = bez(t);
    ctx.beginPath(); ctx.moveTo(X(x), Y(y) + s * 0.07); ctx.lineTo(X(x), H - 18); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 0.7;
    const label = `${k}  ${name}`, tw = ctx.measureText(label).width;
    ctx.fillText(label, X(x) + 6 + tw > W - 10 ? X(x) - tw - 6 : X(x) + 6, H - 24);
    ctx.setLineDash([3, 5]); ctx.globalAlpha = 0.45;
  });
  ctx.restore();

  // pelos
  const n = Math.floor(hairs.length * progress);
  ctx.lineCap = 'round'; ctx.strokeStyle = stroke; ctx.shadowColor = stroke; ctx.shadowBlur = 5;
  for (let i = 0; i < n; i++) {
    const h = hairs[i];
    const [cx, cy] = bez(h.t), [tx, ty] = tan(h.t);
    const nx = -ty, ny = tx;
    const bx = X(cx) + nx * h.off * s, by = Y(cy) + ny * h.off * s * 0.9;
    // dirección: mezcla entre vertical (cabeza) y tangente (cola)
    const dx = tx * (1 - h.lift) + 0.25 * h.lift, dy = ty * (1 - h.lift) - 0.95 * h.lift;
    const dl = Math.hypot(dx, dy) || 1;
    const L = h.lenK * s;
    const ex = bx + (dx / dl) * L, ey = by + (dy / dl) * L;
    const mx = (bx + ex) / 2 + nx * h.j * L * h.side, my = (by + ey) / 2 + ny * h.j * L * h.side;
    ctx.globalAlpha = h.a; ctx.lineWidth = h.w;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

const DELAY = document.documentElement.classList.contains('seen') ? 900 : 1900;
let progress = reduce ? 1 : 0, start = 0;
function tick(ts) {
  if (!start) start = ts;
  progress = Math.max(0, Math.min(1, (ts - start - DELAY) / 2600));
  draw(1 - Math.pow(1 - progress, 2));
  if (progress < 1) requestAnimationFrame(tick);
}
draw(reduce ? 1 : 0);
if (!reduce) requestAnimationFrame(tick);
const redraw = () => draw(progress >= 1 || reduce ? 1 : 1 - Math.pow(1 - progress, 2));
new ResizeObserver(redraw).observe(canvas);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
