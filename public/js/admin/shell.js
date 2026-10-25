/* Capa de app móvil: barra de pestañas, título que se compacta al desplazar, hojas con gesto, listas en lugar de tablas, recarga con arrastre. */
import { $, $$, esc, openDrawer, closeDrawer } from './core.js';

const ICONS = {
  resumen: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clientas: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6"/>',
  dinero: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.2a3.4 3.4 0 1 0 0 5.6M8 11h5M8 13.2h5"/>',
  mas: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
};
const TABS = [
  { id: 'resumen', label: 'Hoy', icon: 'resumen', match: ['resumen'] },
  { id: 'agenda', label: 'Agenda', icon: 'agenda', match: ['agenda'], badge: 'pending' },
  { id: 'clientas', label: 'Clientas', icon: 'clientas', match: ['clientas'] },
  { id: 'resultados', label: 'Dinero', icon: 'dinero', match: ['resultados', 'contabilidad', 'rentabilidad', 'informes'], badge: 'drafts' },
  { id: 'mas', label: 'Más', icon: 'mas', match: ['seguimiento', 'automatizaciones', 'servicios', 'horarios', 'portfolio', 'ajustes'], badge: ['followups', 'outbox_pending'] },
];
const MORE = [
  ['Seguimiento', [['seguimiento', 'Seguimiento de clientas', 'followups'], ['automatizaciones', 'Automatizaciones de email', 'outbox_pending']]],
  ['Dinero', [['contabilidad', 'Contabilidad y trimestres', 'drafts'], ['rentabilidad', 'Rentabilidad (CFO)'], ['informes', 'Informes']]],
  ['Estudio', [['servicios', 'Servicios y costes'], ['horarios', 'Horarios y bloqueos'], ['portfolio', 'Portfolio'], ['ajustes', 'Ajustes']]],
];

export function drawTabs(current, counts) {
  const n = (b) => [].concat(b || []).reduce((s, k) => s + (counts[k] || 0), 0);
  $('#tabbar').innerHTML = TABS.map((t) => {
    const on = t.match.includes(current), c = n(t.badge);
    return `<a href="${t.id === 'mas' ? '#mas' : '#' + t.id}" data-tab="${t.id}" class="${on ? 'on' : ''}" aria-current="${on ? 'page' : 'false'}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[t.icon]}</svg><span>${t.label}</span>${c ? `<i>${c}</i>` : ''}</a>`;
  }).join('');
  $$('#tabbar [data-tab="mas"]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openMore(counts); }));
}

function openMore(counts) {
  const d = openDrawer(`<h3 class="sheet-title">Más</h3>${MORE.map(([g, items]) => `<div class="list-group"><h4>${g}</h4><div class="list">${items.map(([id, label, badge]) => `<a href="#${id}">${esc(label)}${badge && counts[badge] ? `<span class="count">${counts[badge]}</span>` : ''}<svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></a>`).join('')}</div></div>`).join('')}
    <div class="list-group"><div class="list"><a href="/" target="_blank" rel="noopener">Ver la web<svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></a><button type="button" id="more-logout" class="danger-row">Cerrar sesión</button></div></div>`);
  $$('a[href^="#"]', d).forEach((a) => a.addEventListener('click', () => closeDrawer()));
  $('#more-logout', d).onclick = () => { closeDrawer(); $('#logout').click(); };
}

/* título grande que pasa a la barra superior al desplazar */
let io;
export function bindTitle(main) {
  io?.disconnect();
  const h = $('.top h2', main), bar = $('#appbar'); if (!h) { bar.classList.remove('show'); return; }
  $('#appbar-title').textContent = h.textContent;
  io = new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: '-56px 0px 0px 0px' });
  io.observe(h);
}

/* etiqueta cada celda con su cabecera para el formato lista */
export function labelTables(main) {
  $$('table', main).forEach((t) => {
    const heads = $$('thead th', t).map((h) => h.textContent.trim());
    $$('tbody tr', t).forEach((tr) => $$('td', tr).forEach((td, i) => { if (i && heads[i] && !td.dataset.label) td.dataset.label = heads[i]; }));
  });
}

/* gestos */
export function bindGestures(refresh) {
  const d = $('#drawer'); let y0 = 0, dy = 0, dragging = false;
  d.addEventListener('touchstart', (e) => { if (d.scrollTop <= 0 && innerWidth <= 860) { y0 = e.touches[0].clientY; dragging = true; dy = 0; d.style.transition = 'none'; } }, { passive: true });
  d.addEventListener('touchmove', (e) => { if (!dragging) return; dy = e.touches[0].clientY - y0; if (dy > 0) d.style.transform = `translateY(${dy}px)`; else { dragging = false; d.style.transition = ''; d.style.transform = ''; } }, { passive: true });
  d.addEventListener('touchend', () => { if (!dragging) return; dragging = false; d.style.transition = ''; d.style.transform = ''; if (dy > 110) closeDrawer(); }, { passive: true });

  let py = 0, pull = 0, pulling = false; const ind = $('#ptr');
  addEventListener('touchstart', (e) => { if (scrollY <= 0 && innerWidth <= 860 && !d.classList.contains('open') && !$('#dlg').open) { py = e.touches[0].clientY; pulling = true; pull = 0; } }, { passive: true });
  addEventListener('touchmove', (e) => { if (!pulling) return; pull = e.touches[0].clientY - py; if (pull > 0 && scrollY <= 0) { ind.style.transform = `translate(-50%,${Math.min(pull, 110) / 2}px)`; ind.style.opacity = Math.min(1, pull / 80); } else { ind.style.opacity = 0; } }, { passive: true });
  addEventListener('touchend', () => { if (!pulling) return; pulling = false; ind.style.opacity = 0; ind.style.transform = 'translate(-50%,-40px)'; if (pull > 90) refresh(); }, { passive: true });
}
