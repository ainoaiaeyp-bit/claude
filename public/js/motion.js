// Capa de movimiento: revelados al scroll, contadores, cabecera inteligente y progreso de lectura.
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen = root.classList.contains('seen');

/* revelados */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
const watch = (el) => { if (!el.dataset.watched) { el.dataset.watched = '1'; io.observe(el); } };
const scan = (scope = document) => scope.querySelectorAll('[data-reveal],[data-reveal-line]').forEach(watch);
scan();
new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
  if (n.nodeType !== 1) return;
  if (n.matches('[data-reveal],[data-reveal-line]')) watch(n);
  scan(n);
}))).observe(document.body, { childList: true, subtree: true });

/* contadores de cifras */
document.querySelectorAll('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  if (reduce) return;
  el.textContent = pre + '0' + suf;
  setTimeout(() => {
    const t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = pre + Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, seen ? 1200 : 2300);
});

/* cabecera: se oculta al bajar, vuelve al subir; barra de progreso */
const nav = document.getElementById('nav');
const menu = document.getElementById('menu');
menu.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--k', i));
let lastY = scrollY, ticking = false;
function onScroll() {
  const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
  root.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
  const open = menu.classList.contains('open');
  if (!open) nav.classList.toggle('hide', y > lastY && y > 240);
  lastY = y; ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();
