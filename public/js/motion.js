// Movimiento: entrada de portada, revelados, parallax, manifiesto palabra a palabra,
// galería horizontal anclada al scroll, imagen que sigue al cursor y cabecera inteligente.
const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
root.classList.add('motion-ok');

/* nombre gigante: ajusta el tamaño para ocupar exactamente el ancho */
function fit() {
  $$('.fit').forEach((el) => {
    const box = el.parentElement.clientWidth;
    el.style.setProperty('--fit', '100px');
    const w = el.scrollWidth;
    if (w) el.style.setProperty('--fit', `${(100 * box / w) * 0.995}px`);
  });
}
fit();
addEventListener('resize', fit);
(document.fonts?.ready || Promise.resolve()).then(() => {
  fit();
  requestAnimationFrame(() => root.classList.add('loaded'));
});
setTimeout(() => root.classList.add('loaded'), 1200);

/* botones: texto que rueda al pasar el cursor */
function roll(btn) {
  if (btn.querySelector('.r') || btn.children.length) return;
  const t = btn.textContent.trim();
  if (!t) return;
  btn.innerHTML = `<span class="r"><span data-t="${t.replace(/"/g, '&quot;')}">${t}</span></span>`;
}
$$('.btn').forEach(roll);

/* revelados al entrar en pantalla */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
const watch = (el) => { if (!el.dataset.w) { el.dataset.w = 1; io.observe(el); } };
$$('[data-reveal]').forEach(watch);
new MutationObserver((ms) => ms.forEach((m) => {
  if (m.target.closest?.('.btn') && !m.target.querySelector('.r')) roll(m.target.closest('.btn'));
  m.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.matches('[data-reveal]')) watch(n);
    n.querySelectorAll('[data-reveal]').forEach(watch);
    if (n.matches('.btn')) roll(n);
    n.querySelectorAll('.btn').forEach(roll);
  });
})).observe(document.body, { childList: true, subtree: true });

/* manifiesto: palabras que se encienden con el scroll */
const words = $('.words');
let wordEls = [];
if (words) {
  words.innerHTML = words.textContent.trim().split(/\s+/).map((w) => `<span class="wd">${w}</span>`).join(' ');
  wordEls = $$('.wd', words);
}

/* galería horizontal */
const hs = $('#trabajos'), track = $('#gallery'), count = $('#hs-count');
let hsOn = false;
function setupHs() {
  hsOn = !reduce && innerWidth > 900;
  hs.classList.toggle('static', !hsOn);
  if (hsOn) {
    const dist = Math.max(0, track.scrollWidth - innerWidth);
    hs.style.height = `${innerHeight + dist}px`;
    hs.dataset.dist = dist;
  } else { hs.style.height = ''; track.style.transform = ''; }
}
setupHs();
addEventListener('resize', setupHs);
addEventListener('load', setupHs);
new MutationObserver(setupHs).observe(track, { childList: true });
track.addEventListener('scroll', () => {
  const figs = track.children; if (!figs.length) return;
  const i = Math.round(track.scrollLeft / (figs[0].offsetWidth + 16));
  count.textContent = `${String(Math.min(i + 1, figs.length)).padStart(2, '0')} / ${String(figs.length).padStart(2, '0')}`;
}, { passive: true });

/* imagen que sigue al cursor en la lista de técnicas */
const list = $('#tech-list'), ci = $('#cursor-img');
if (list && ci && fine && !reduce) {
  const rows = $$('.trow', list);
  rows.forEach((r) => {
    const img = new Image(); img.src = r.dataset.img; img.alt = ''; ci.appendChild(img); r._img = img;
  });
  let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
  const loop = () => {
    cx += (x - cx) * 0.14; cy += (y - cy) * 0.14;
    ci.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) rotate(${(x - cx) * 0.03}deg)`;
    raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(loop) : 0;
  };
  list.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
  list.addEventListener('pointerenter', (e) => { cx = x = e.clientX; cy = y = e.clientY; ci.classList.add('on'); });
  list.addEventListener('pointerleave', () => ci.classList.remove('on'));
  rows.forEach((r) => r.addEventListener('pointerenter', () => {
    $$('img', ci).forEach((i) => i.classList.toggle('on', i === r._img));
  }));
}

/* bucle de scroll: cabecera, parallax, manifiesto, galería */
const nav = $('#nav'), menu = $('#menu');
$$('li', menu).forEach((li, i) => li.style.setProperty('--k', i));
const speeds = reduce || innerWidth <= 900 ? [] : $$('[data-speed]');
let lastY = scrollY, ticking = false;
function frame() {
  ticking = false;
  const y = scrollY, vh = innerHeight;
  nav.classList.toggle('scrolled', y > 10);
  if (!menu.classList.contains('open')) nav.classList.toggle('hide', y > lastY && y > 300);
  lastY = y;

  speeds.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const off = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.speed);
    el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
  });

  if (wordEls.length) {
    const r = words.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const n = Math.round(p * wordEls.length);
    wordEls.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  if (hsOn) {
    const r = hs.getBoundingClientRect();
    const dist = Number(hs.dataset.dist) || 0;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
    const n = track.children.length;
    const cur = Math.min(n, Math.floor(p * (n - 1) + 1.0001));
    count.textContent = `${String(cur).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
addEventListener('resize', frame);
frame();
