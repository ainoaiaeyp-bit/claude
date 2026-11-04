'use strict';
/* ============ Vida · app personal todo-en-uno (PWA, sin dependencias) ============ */

// ---------- Estado ----------
const KEY = 'vida.v1';
const DEFAULTS = {
  profile: { name: '' }, tx: [], subs: [], rem: [], biz: [], chat: [],
  events: [], tasks: [], habits: [], notes: [], goals: [], budgets: {},
  meals: [], water: {}, weights: [], workouts: [], health: { kcal: 2000, water: 8, weight: 0 },
  settings: { apiKey: '', model: 'claude-sonnet-5-5', theme: 'auto' }
};
let S = load();
function normalize(d) {
  const s = Object.assign(structuredClone(DEFAULTS), d || {});
  s.settings = Object.assign({}, DEFAULTS.settings, d?.settings);
  s.health = Object.assign({}, DEFAULTS.health, d?.health);
  return s;
}
function load() { try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch { return normalize(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('No se pudo guardar: almacenamiento lleno'); } }

// ---------- Utilidades ----------
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoTime = d => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const today = () => iso(new Date());
const monthKey = d => iso(d).slice(0, 7);
const parseD = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const eur = (n, dec = true) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 }).format(n || 0);
const num = (n, d = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d }).format(n || 0);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fdate = s => { const d = parseD(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fdateL = s => { const d = parseD(s); return `${DIAS_L[d.getDay()]} ${d.getDate()} de ${MESES_L[d.getMonth()].toLowerCase()}`; };
const fmonth = k => { const [y, m] = k.split('-').map(Number); return `${MESES_L[m - 1]} ${y}`; };
const shiftMonth = (k, n) => { const [y, m] = k.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
const daysUntil = s => Math.round((parseD(s) - parseD(today())) / 864e5);
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const rel = d => { const n = daysUntil(d); return n < 0 ? `hace ${-n} d` : n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} d`; };
function addCycle(s, cycle) {
  const d = parseD(s), day = d.getDate();
  if (cycle === 'semanal') d.setDate(day + 7);
  else if (cycle === 'diario') d.setDate(day + 1);
  else { const n = cycle === 'anual' ? 12 : cycle === 'trimestral' ? 3 : 1; d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
  return iso(d);
}
const monthlyOf = s => s.amount * ({ mensual: 1, anual: 1 / 12, trimestral: 1 / 3, semanal: 52 / 12 }[s.cycle] || 1);
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3500); }

const CATS = {
  'Hogar': ['🏠', '#ff9f0a'], 'Comida': ['🍽️', '#ff453a'], 'Transporte': ['🚗', '#0a84ff'], 'Ocio': ['🎬', '#bf5af2'], 'Salud': ['❤️', '#ff375f'],
  'Compras': ['🛍️', '#64d2ff'], 'Viajes': ['✈️', '#30d158'], 'Trabajo': ['💼', '#5e5ce6'], 'Suscripciones': ['🔁', '#8e8e93'],
  'Nómina': ['💶', '#30d158'], 'Negocio': ['🏢', '#5e5ce6'], 'Otros': ['•••', '#8e8e93']
};
const catI = c => CATS[c] || CATS.Otros;
const CAT_OPTS = Object.keys(CATS).map(c => [c, `${CATS[c][0]} ${c}`]);
const OUT_CATS = Object.keys(CATS).filter(c => !['Nómina', 'Negocio'].includes(c));
const REPEAT_OPTS = [['no', 'Nunca'], ['diario', 'Cada día'], ['semanal', 'Cada semana'], ['mensual', 'Cada mes'], ['anual', 'Cada año']];
const MEALS = { desayuno: ['🥐', 'Desayuno'], comida: ['🍝', 'Comida'], cena: ['🌙', 'Cena'], snack: ['🍎', 'Snack'] };
const SPORTS = ['Caminar', 'Correr', 'Gimnasio', 'Ciclismo', 'Natación', 'Yoga', 'Fútbol', 'Otro'];

const ui = { tab: 'hoy', prev: 'hoy', sub: null, money: 'mov', scope: 'todo', month: monthKey(new Date()), busy: false, calMonth: monthKey(new Date()), calSel: today(), hseg: 'nut', hday: today() };

// ---------- Tema ----------
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  document.querySelectorAll('meta[name=theme-color]').forEach(m => m.remove());
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const m = document.createElement('meta'); m.name = 'theme-color'; m.content = dark ? '#000000' : '#f2f2f7'; document.head.appendChild(m);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// ---------- Automatismos ----------
function rollSubs() {
  let changed = false;
  for (const s of S.subs) {
    if (s.active === false) continue;
    let guard = 0;
    while (s.next < today() && guard++ < 60) {
      S.tx.push({ id: uid(), type: 'out', amount: s.amount, cat: 'Suscripciones', note: s.name, date: s.next, scope: s.scope || 'personal', auto: true });
      s.next = addCycle(s.next, s.cycle); changed = true;
    }
  }
  if (changed) save();
}
async function notify(title, body, tag) {
  toast(`${title}: ${body}`);
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker?.getRegistration();
      reg ? reg.showNotification(title, { body, icon: 'icons/icon-192.png', tag }) : new Notification(title, { body });
    }
  } catch { /* sin notificaciones */ }
}
async function checkDue() {
  const now = new Date(), nowS = isoTime(now), t = today(), hm = nowS.slice(11); let dirty = false;
  for (const r of S.rem) if (!r.done && !r.notified && r.due && r.due <= nowS) { r.notified = true; dirty = true; notify('⏰ Recordatorio', r.title, r.id); }
  for (const e of S.events) {
    if (e.lastN === t || !occurs(e, t) || hm < (e.time || '09:00')) continue;
    e.lastN = t; dirty = true; notify(e.type === 'cumple' ? '🎂 Cumpleaños' : '📅 Evento', eventTitle(e, t), e.id);
  }
  if (dirty) { save(); if (!document.querySelector('#sheet-root .sheet')) render(); }
}

// ---------- Calendario: ocurrencias ----------
function occurs(e, ds) {
  if (ds < e.date) return false;
  const a = parseD(e.date), b = parseD(ds), r = e.type === 'cumple' ? 'anual' : (e.repeat || 'no');
  switch (r) {
    case 'no': return e.date === ds;
    case 'diario': return true;
    case 'semanal': return Math.round((b - a) / 864e5) % 7 === 0;
    case 'mensual': return a.getDate() === b.getDate();
    case 'anual': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
  }
  return false;
}
function eventTitle(e, ds) {
  if (e.type !== 'cumple') return e.title;
  const age = parseD(ds).getFullYear() - parseD(e.date).getFullYear();
  return age > 0 && age < 120 ? `${e.title} cumple ${age}` : e.title;
}
const KIND = {
  evento: ['📅', 'var(--blue)'], cumple: ['🎂', 'var(--pink)'], tarea: ['☑︎', 'var(--orange)'], rem: ['⏰', 'var(--purple)'],
  sub: ['🔁', '#8e8e93'], cobro: ['€', 'var(--green)']
};
function itemsOn(ds) {
  const out = [];
  for (const e of S.events) if (occurs(e, ds)) out.push({ k: e.type === 'cumple' ? 'cumple' : 'evento', title: eventTitle(e, ds), time: e.time || '', sub: e.note || (e.type === 'cumple' ? 'Cumpleaños' : 'Evento'), act: 'edit-ev', id: e.id });
  for (const t of S.tasks) if (!t.done && t.due === ds) out.push({ k: 'tarea', title: t.title, time: '', sub: `Tarea${t.prio === 'alta' ? ' · prioridad alta' : ''}`, act: 'edit-task', id: t.id });
  for (const r of S.rem) if (!r.done && r.due && r.due.slice(0, 10) === ds) out.push({ k: 'rem', title: r.title, time: r.due.slice(11, 16), sub: 'Recordatorio', act: 'edit-rem', id: r.id });
  for (const s of S.subs) if (s.active !== false && s.next === ds) out.push({ k: 'sub', title: s.name, time: '', sub: 'Cargo de suscripción', right: eur(s.amount), act: 'edit-sub', id: s.id });
  for (const b of S.biz) if (b.status === 'pendiente' && b.due === ds) out.push({ k: 'cobro', title: `Cobrar a ${b.client}`, time: '', sub: b.concept || 'Cobro pendiente', right: eur(b.amount), act: 'edit-biz', id: b.id });
  return out.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}
function nextBirthday(e) {
  const t = parseD(today()), d = parseD(e.date);
  let n = new Date(t.getFullYear(), d.getMonth(), d.getDate());
  if (n < t) n = new Date(t.getFullYear() + 1, d.getMonth(), d.getDate());
  return iso(n);
}

// ---------- Cálculos ----------
function summary(month, scope = 'todo') {
  const r = { in: 0, out: 0, cats: {} };
  for (const t of S.tx) {
    if (t.date.slice(0, 7) !== month) continue;
    if (scope !== 'todo' && (t.scope || 'personal') !== scope) continue;
    if (t.type === 'in') r.in += t.amount; else { r.out += t.amount; r.cats[t.cat] = (r.cats[t.cat] || 0) + t.amount; }
  }
  return r;
}
const subsMonthly = () => S.subs.filter(s => s.active !== false).reduce((a, s) => a + monthlyOf(s), 0);
const bizPending = () => S.biz.filter(b => b.status === 'pendiente').reduce((a, b) => a + b.amount, 0);
function streak(h) {
  let n = 0, d = today();
  if (!h.log[d]) d = addDays(d, -1);
  while (h.log[d]) { n++; d = addDays(d, -1); }
  return n;
}
function nutrition(ds) {
  const r = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const m of S.meals) if (m.date === ds) { r.kcal += m.kcal || 0; r.p += m.p || 0; r.c += m.c || 0; r.f += m.f || 0; }
  return r;
}
const sortedWeights = () => [...S.weights].sort((a, b) => a.date.localeCompare(b.date));

// ---------- Iconos de pestañas ----------
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
  hoy: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>'),
  cal: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  money: svg('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h3"/>'),
  biz: svg('<rect x="3" y="7.5" width="18" height="12" rx="2.5"/><path d="M8.5 7.5v-1.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 13h18"/>'),
  more: svg('<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>')
};
const TABS = [['hoy', 'Hoy'], ['cal', 'Calendario'], ['money', 'Dinero'], ['biz', 'Negocio'], ['more', 'Más']];

// ---------- Componentes ----------
function head(title, subtitle, actions = '', back = '') {
  return `${back ? `<button class="back" data-act="back">‹ ${back}</button>` : ''}<div class="head"><div><h1 class="large">${title}</h1>${subtitle ? `<div class="sub">${subtitle}</div>` : ''}</div><div style="display:flex;gap:10px">${actions}</div></div>`;
}
const plusBtn = act => `<button class="icon-btn plus" data-act="${act}" aria-label="Añadir">+</button>`;
const row = ({ ico, color, title, sub, right, act, id, cls = '', style = '', rightSub = '' }) =>
  `<div class="row ${ico === undefined ? 'noicon' : ''} ${cls}" ${act ? `data-act="${act}" data-id="${id}"` : ''} style="${style}">${ico !== undefined ? `<div class="ico" style="background:${color}">${ico}</div>` : ''}<div class="grow"><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}</div>${right !== undefined ? `<div style="text-align:right"><div class="amt">${right}</div>${rightSub}</div>` : ''}</div>`;
const group = (rows, empty) => `<div class="group">${rows || `<div class="empty">${empty}</div>`}</div>`;
function itemRow(it, withDate) {
  const [ico, color] = KIND[it.k];
  const check = it.k === 'tarea' ? `<button class="check" data-act="toggle-task" data-id="${it.id}" aria-label="Completar"></button>` : '';
  return `<div class="row" data-act="${it.act}" data-id="${it.id}">${check || `<div class="ico" style="background:${color}">${ico}</div>`}<div class="grow"><div class="t">${esc(it.title)}</div><div class="s">${withDate ? rel(withDate) + ' · ' : ''}${esc(it.sub)}${it.time ? ' · ' + it.time : ''}</div></div>${it.right ? `<div class="amt">${it.right}</div>` : ''}</div>`;
}
const waterRow = ds => {
  const n = S.water[ds] || 0, goal = S.health.water;
  return `<div class="row" style="gap:10px"><div class="ico" style="background:var(--teal)">💧</div><div class="grow"><div class="t">Agua</div><div class="s">${n} de ${goal} vasos · ${num(n * 0.25, 2)} L</div></div><button class="icon-btn" data-act="water" data-id="${ds}:-1" aria-label="Quitar vaso">−</button><button class="icon-btn plus" data-act="water" data-id="${ds}:1" aria-label="Añadir vaso">+</button></div>`;
};

// ---------- Vista: Hoy ----------
function viewHoy() {
  const h = new Date().getHours(), name = S.profile.name;
  const greet = (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches') + (name ? `, ${esc(name)}` : '');
  const mk = monthKey(new Date()), m = summary(mk), t = today();
  const overdue = S.tasks.filter(x => !x.done && x.due && x.due < t).map(x => ({ k: 'tarea', title: x.title, sub: `Vencida ${rel(x.due)}`, act: 'edit-task', id: x.id }));
  const noDate = S.tasks.filter(x => !x.done && !x.due && x.prio === 'alta').map(x => ({ k: 'tarea', title: x.title, sub: 'Prioridad alta', act: 'edit-task', id: x.id }));
  const hoy = [...overdue, ...itemsOn(t), ...noDate];
  const prox = [];
  for (let i = 1; i <= 7; i++) { const d = addDays(t, i); for (const it of itemsOn(d)) prox.push([d, it]); }
  const habits = S.habits.length ? `<div class="card"><div class="t" style="margin-bottom:10px">Hábitos de hoy</div><div class="hchips">${S.habits.map(x => `<button class="${x.log[t] ? 'on' : ''}" data-act="habit" data-id="${x.id}">${esc(x.emoji || '•')} ${esc(x.name)}</button>`).join('')}</div></div>` : '';
  const nu = nutrition(t), pct = Math.min(100, nu.kcal / (S.health.kcal || 1) * 100);
  const health = `<div class="section-title">Salud</div><div class="group"><div class="row" data-act="health-open"><div class="ico" style="background:var(--green)">🥗</div><div class="grow"><div style="display:flex;justify-content:space-between"><div class="t">Nutrición</div><div class="amt">${num(nu.kcal)} / ${num(S.health.kcal)} kcal</div></div><div class="prog"><i style="width:${pct}%;${nu.kcal > S.health.kcal ? 'background:var(--orange)' : ''}"></i></div></div></div>${waterRow(t)}</div>`;
  return `${head(greet, fdateL(t), `<button class="icon-btn" data-act="settings" aria-label="Ajustes">⚙︎</button>`)}
  <div class="hero"><div class="lbl">Balance de ${fmonth(mk)}</div><div class="big">${eur(m.in - m.out)}</div>
    <div class="two"><div class="pill"><span class="lbl">Ingresos</span><b>${eur(m.in, 0)}</b></div><div class="pill"><span class="lbl">Gastos</span><b>${eur(m.out, 0)}</b></div></div></div>
  <div class="grid2">
    <div class="card kpi" data-act="goto" data-id="money:subs"><div class="n">${eur(subsMonthly(), 0)}</div><div class="l">Suscripciones / mes</div></div>
    <div class="card kpi" data-act="goto" data-id="biz"><div class="n">${eur(bizPending(), 0)}</div><div class="l">Pendiente de cobro</div></div>
  </div>
  <div class="section-title">Hoy</div>${group(hoy.map(i => itemRow(i)).join(''), 'Nada para hoy. ¡Día libre! 🎉')}
  ${habits}${health}
  <div class="section-title">Próximos 7 días</div>${group(prox.slice(0, 10).map(([d, i]) => itemRow(i, d)).join(''), 'Semana tranquila ✨')}`;
}

// ---------- Vista: Calendario ----------
function viewCal() {
  const [y, m] = ui.calMonth.split('-').map(Number);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7, n = new Date(y, m, 0).getDate(), t = today();
  let cells = '<div class="d"></div>'.repeat(offset);
  for (let d = 1; d <= n; d++) {
    const ds = `${y}-${pad(m)}-${pad(d)}`, its = itemsOn(ds);
    const dots = [...new Set(its.map(i => i.k))].slice(0, 3).map(k => `<i style="background:${KIND[k][1]}"></i>`).join('');
    cells += `<button class="d ${ds === t ? 'today' : ''} ${ds === ui.calSel ? 'sel' : ''}" data-act="cal-day" data-id="${ds}"><span class="n">${d}</span><span class="dots">${dots}</span></button>`;
  }
  const sel = itemsOn(ui.calSel);
  return `${head('Calendario', '', plusBtn('add-ev'))}
  <div class="cal-head"><b>${fmonth(ui.calMonth)}</b><div class="nav"><button class="today" data-act="cal-today">Hoy</button><button class="icon-btn" data-act="cal-month" data-id="-1">‹</button><button class="icon-btn" data-act="cal-month" data-id="1">›</button></div></div>
  <div class="cal"><div class="wd">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div><div class="days">${cells}</div></div>
  <div class="section-title cap">${fdateL(ui.calSel)}</div>
  ${group(sel.map(i => itemRow(i)).join(''), 'Sin planes este día.<br>Pulsa + para añadir un evento.')}`;
}

// ---------- Vista: Dinero ----------
function viewMoney() {
  const seg = `<div class="seg">${[['mov', 'Movimientos'], ['subs', 'Suscripciones'], ['sum', 'Resumen']].map(([k, l]) => `<button class="${ui.money === k ? 'on' : ''}" data-act="seg" data-id="${k}">${l}</button>`).join('')}</div>`;
  const body = ui.money === 'subs' ? bodySubs() : monthBar() + (ui.money === 'mov' ? bodyMov() : bodySum());
  return head('Dinero', '', ui.money === 'subs' ? plusBtn('add-sub') : plusBtn('add-tx')) + seg + body;
}
function monthBar() {
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin:0 4px 12px"><button class="icon-btn" data-act="month" data-id="-1">‹</button><b>${fmonth(ui.month)}</b><button class="icon-btn" data-act="month" data-id="1">›</button></div>
  <div class="seg">${[['todo', 'Todo'], ['personal', 'Personal'], ['negocio', 'Negocio']].map(([k, l]) => `<button class="${ui.scope === k ? 'on' : ''}" data-act="scope" data-id="${k}">${l}</button>`).join('')}</div>`;
}
function bodyMov() {
  const list = S.tx.filter(t => t.date.slice(0, 7) === ui.month && (ui.scope === 'todo' || (t.scope || 'personal') === ui.scope)).sort((a, b) => b.date.localeCompare(a.date));
  const sm = summary(ui.month, ui.scope);
  const rows = list.map(t => { const [e, c] = catI(t.cat); return row({ ico: e, color: c, title: t.note || t.cat, sub: `${t.cat} · ${fdate(t.date)} · ${t.scope === 'negocio' ? 'Negocio' : 'Personal'}${t.auto ? ' · auto' : ''}`, right: `<span class="${t.type === 'in' ? 'pos' : ''}">${t.type === 'in' ? '+' : '−'}${eur(t.amount)}</span>`, act: 'edit-tx', id: t.id }); }).join('');
  return `<div class="grid2"><div class="card kpi"><div class="n pos">${eur(sm.in, 0)}</div><div class="l">Ingresos</div></div><div class="card kpi"><div class="n">${eur(sm.out, 0)}</div><div class="l">Gastos</div></div></div>
  ${group(rows, 'Sin movimientos este mes.<br>Pulsa + para añadir el primero.')}`;
}
function bodySum() {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(ui.month, i - 5));
  const data = months.map(k => ({ k, ...summary(k, ui.scope) }));
  const max = Math.max(1, ...data.flatMap(d => [d.in, d.out]));
  const bars = data.map(d => `<div class="col"><div class="pair"><div class="b" style="height:${d.in / max * 100}%;background:var(--green)"></div><div class="b" style="height:${d.out / max * 100}%;background:var(--red)"></div></div><div class="m">${MESES[+d.k.slice(5) - 1]}</div></div>`).join('');
  const sm = summary(ui.month, ui.scope);
  const keys = [...new Set([...Object.keys(sm.cats), ...Object.keys(S.budgets).filter(k => S.budgets[k] > 0)])];
  const cats = keys.map(c => [c, sm.cats[c] || 0]).sort((a, b) => b[1] - a[1]);
  const cat = cats.map(([c, v]) => {
    const b = S.budgets[c], over = b && v > b, w = b ? Math.min(100, v / b * 100) : (sm.out ? v / sm.out * 100 : 0);
    return `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between"><span>${catI(c)[0]} ${esc(c)}</span><b ${over ? 'style="color:var(--red)"' : ''}>${eur(v, 0)}${b ? ` / ${eur(b, 0)}` : ''}</b></div><div class="catbar"><i style="width:${w}%;background:${over ? 'var(--red)' : catI(c)[1]}"></i></div></div>`;
  }).join('');
  return `<div class="card"><div class="t">Últimos 6 meses</div><div class="s"><span class="pos">●</span> Ingresos &nbsp; <span style="color:var(--red)">●</span> Gastos</div><div class="bars">${bars}</div></div>
  <div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:12px"><div class="t">Gastos por categoría</div><button class="small-btn" data-act="budgets">Presupuestos</button></div>${cat || '<div class="empty">Sin gastos este mes</div>'}</div>`;
}
function bodySubs() {
  const subs = [...S.subs].sort((a, b) => a.next.localeCompare(b.next));
  const rows = subs.map(s => row({ ico: '🔁', color: s.scope === 'negocio' ? 'var(--blue)' : 'var(--purple)', title: s.name, sub: `${s.active === false ? 'Pausada' : `Próximo cargo ${fdate(s.next)} · ${s.cycle}`}${s.scope === 'negocio' ? ' · Negocio' : ''}`, right: eur(s.amount), act: 'edit-sub', id: s.id, style: s.active === false ? 'opacity:.5' : '' })).join('');
  const tot = subsMonthly();
  return `<div class="grid2"><div class="card kpi"><div class="n">${eur(tot)}</div><div class="l">Al mes</div></div><div class="card kpi"><div class="n">${eur(tot * 12, 0)}</div><div class="l">Al año</div></div></div>
  ${group(rows, 'Añade tus suscripciones (Netflix, hosting, software…) y te aviso antes de cada cargo.')}`;
}

// ---------- Vista: Negocio ----------
const STATUS = { presupuesto: ['Presupuesto', 'var(--orange)'], pendiente: ['Por cobrar', 'var(--blue)'], cobrado: ['Cobrado', 'var(--green)'] };
function viewBiz() {
  const mk = monthKey(new Date()), m = summary(mk, 'negocio');
  const open = S.biz.filter(b => b.status === 'presupuesto').reduce((a, b) => a + b.amount, 0);
  const order = { pendiente: 0, presupuesto: 1, cobrado: 2 };
  const list = [...S.biz].sort((a, b) => order[a.status] - order[b.status] || (b.date || '').localeCompare(a.date || ''));
  const rows = list.map(b => row({ ico: b.status === 'cobrado' ? '✓' : '€', color: STATUS[b.status][1], title: b.client, sub: `${b.concept || '—'}${b.due ? ` · vence ${fdate(b.due)}` : ''}`, right: eur(b.amount), rightSub: `<span class="badge" style="background:${STATUS[b.status][1]}">${STATUS[b.status][0]}</span>`, act: 'edit-biz', id: b.id })).join('');
  return `${head('Negocio', fmonth(mk), plusBtn('add-biz'))}
  <div class="hero" style="background:linear-gradient(135deg,#0a84ff,#5e5ce6)"><div class="lbl">Resultado del mes</div><div class="big">${eur(m.in - m.out)}</div>
    <div class="two"><div class="pill"><span class="lbl">Facturado</span><b>${eur(m.in, 0)}</b></div><div class="pill"><span class="lbl">Gastos</span><b>${eur(m.out, 0)}</b></div></div></div>
  <div class="grid2"><div class="card kpi"><div class="n">${eur(bizPending(), 0)}</div><div class="l">Por cobrar</div></div><div class="card kpi"><div class="n">${eur(open, 0)}</div><div class="l">En presupuesto</div></div></div>
  <div class="section-title">Clientes y trabajos</div>
  ${group(rows, 'Añade presupuestos y facturas. Al marcar “Cobrado” se registra el ingreso solo.')}`;
}

// ---------- Vista: Más (hub) y subpantallas ----------
function viewMore() {
  if (ui.sub) return { tasks: viewTasks, rem: viewRec, bday: viewBday, habits: viewHabits, notes: viewNotes, goals: viewGoals, health: viewHealth }[ui.sub]();
  const nT = S.tasks.filter(t => !t.done).length, nR = S.rem.filter(r => !r.done).length;
  const item = (k, ico, color, title, sub) => row({ ico, color, title, sub, right: '<span class="chev">›</span>', act: 'sub', id: k });
  return `${head('Más', 'Todo lo demás de tu vida')}
  <div class="group">
    ${item('health', '🥗', 'var(--green)', 'Salud y nutrición', `${num(nutrition(today()).kcal)} kcal hoy`)}
    ${item('tasks', '☑︎', 'var(--orange)', 'Tareas', `${nT} pendientes`)}
    ${item('rem', '⏰', 'var(--purple)', 'Recordatorios', `${nR} pendientes`)}
    ${item('bday', '🎂', 'var(--pink)', 'Cumpleaños', `${S.events.filter(e => e.type === 'cumple').length} guardados`)}
    ${item('habits', '🔥', 'var(--red)', 'Hábitos', `${S.habits.length} activos`)}
    ${item('goals', '🎯', 'var(--teal)', 'Objetivos de ahorro', `${S.goals.length} objetivos`)}
    ${item('notes', '📝', '#ffcc00', 'Notas', `${S.notes.length} notas`)}
  </div>
  <div class="group">${row({ ico: '✨', color: 'linear-gradient(135deg,#5e5ce6,#bf5af2)', title: 'Asistente IA', sub: 'Pregunta o pídele que cree cosas', right: '<span class="chev">›</span>', act: 'ai', id: '' })}
  ${row({ ico: '⚙︎', color: '#8e8e93', title: 'Ajustes', sub: 'Apariencia, IA, copia de seguridad', right: '<span class="chev">›</span>', act: 'settings', id: '' })}</div>`;
}
function viewTasks() {
  const t = today();
  const P = { alta: 0, media: 1, baja: 2 };
  const pend = S.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || P[a.prio] - P[b.prio]);
  const done = S.tasks.filter(x => x.done).slice(-15).reverse();
  const r = x => `<div class="row noicon ${x.done ? 'done' : ''}"><button class="check ${x.done ? 'on' : ''}" data-act="toggle-task" data-id="${x.id}" aria-label="Completar">${x.done ? '✓' : ''}</button><div class="grow" data-act="edit-task" data-id="${x.id}"><div class="t">${x.prio === 'alta' ? '<span style="color:var(--red)">!</span> ' : ''}${esc(x.title)}</div><div class="s" style="${!x.done && x.due && x.due < t ? 'color:var(--red)' : ''}">${x.due ? `${fdate(x.due)} · ${rel(x.due)}` : 'Sin fecha'}</div></div></div>`;
  return `${head('Tareas', '', plusBtn('add-task'), 'Más')}${group(pend.map(r).join(''), 'Sin tareas pendientes ✨')}${done.length ? `<div class="section-title">Completadas</div><div class="group">${done.map(r).join('')}</div>` : ''}`;
}
function viewRec() {
  const pend = S.rem.filter(r => !r.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const done = S.rem.filter(r => r.done).sort((a, b) => (b.due || '').localeCompare(a.due || '')).slice(0, 15);
  const r = x => {
    const late = !x.done && x.due && x.due < isoTime(new Date());
    return `<div class="row noicon ${x.done ? 'done' : ''}"><button class="check ${x.done ? 'on' : ''}" data-act="toggle-rem" data-id="${x.id}" aria-label="Completar">${x.done ? '✓' : ''}</button><div class="grow" data-act="edit-rem" data-id="${x.id}"><div class="t">${esc(x.title)}</div><div class="s" style="${late ? 'color:var(--red)' : ''}">${x.due ? `${fdate(x.due)} · ${x.due.slice(11, 16)}` : 'Sin fecha'}${x.repeat && x.repeat !== 'no' ? ` · ${x.repeat}` : ''}</div></div></div>`;
  };
  const perm = 'Notification' in window && Notification.permission !== 'granted' ? `<div class="card" data-act="notif" style="display:flex;gap:12px;align-items:center"><div class="ico" style="background:var(--red)">🔔</div><div class="grow"><div class="t">Activar avisos</div><div class="s">Recibe una notificación a su hora</div></div><span class="chev">›</span></div>` : '';
  return `${head('Recordatorios', '', plusBtn('add-rem'), 'Más')}${perm}${group(pend.map(r).join(''), 'Sin recordatorios pendientes ✨')}${done.length ? `<div class="section-title">Completados</div><div class="group">${done.map(r).join('')}</div>` : ''}`;
}
function viewBday() {
  const list = S.events.filter(e => e.type === 'cumple').map(e => ({ e, next: nextBirthday(e) })).sort((a, b) => a.next.localeCompare(b.next));
  const rows = list.map(({ e, next }) => {
    const age = parseD(next).getFullYear() - parseD(e.date).getFullYear();
    return row({ ico: '🎂', color: 'var(--pink)', title: e.title, sub: `${fdate(e.date)}${age > 0 && age < 120 ? ` · cumplirá ${age}` : ''}`, right: rel(next), act: 'edit-ev', id: e.id });
  }).join('');
  return `${head('Cumpleaños', '', plusBtn('add-bday'), 'Más')}${group(rows, 'Guarda los cumpleaños y te aviso el mismo día 🎉')}`;
}
function viewHabits() {
  const t = today(), days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const rows = S.habits.map(h => `<div class="row"><button class="check ${h.log[t] ? 'on' : ''}" data-act="habit" data-id="${h.id}" aria-label="Marcar hoy">${h.log[t] ? '✓' : ''}</button><div class="grow" data-act="edit-habit" data-id="${h.id}"><div class="t">${esc(h.emoji || '•')} ${esc(h.name)}</div><div class="hab">${days.map(d => `<i class="${h.log[d] ? 'on' : ''}"></i>`).join('')}</div></div><div class="amt">🔥 ${streak(h)}</div></div>`).join('');
  return `${head('Hábitos', 'Racha de días seguidos', plusBtn('add-habit'), 'Más')}${group(rows, 'Crea un hábito (leer, meditar, deporte…) y márcalo cada día.')}`;
}
function viewGoals() {
  const rows = S.goals.map(g => { const p = g.target ? Math.min(100, g.saved / g.target * 100) : 0; return `<div class="row" data-act="edit-goal" data-id="${g.id}"><div class="ico" style="background:var(--green)">${esc(g.emoji || '🎯')}</div><div class="grow"><div style="display:flex;justify-content:space-between"><div class="t">${esc(g.name)}</div><div class="amt">${eur(g.saved, 0)} / ${eur(g.target, 0)}</div></div><div class="prog"><i style="width:${p}%"></i></div><div class="s">${Math.round(p)}%${g.deadline ? ` · meta ${fdate(g.deadline)}` : ''}</div></div></div>`; }).join('');
  return `${head('Objetivos', 'Ahorro con meta', plusBtn('add-goal'), 'Más')}${group(rows, 'Define una meta (viaje, coche, fondo de emergencia) y ve aportando.')}`;
}
function viewNotes() {
  const rows = [...S.notes].sort((a, b) => b.date.localeCompare(a.date)).map(n => row({ ico: '📝', color: '#ffcc00', title: n.title || 'Sin título', sub: (n.text || '').replace(/\s+/g, ' ').slice(0, 80), act: 'edit-note', id: n.id })).join('');
  return `${head('Notas', '', plusBtn('add-note'), 'Más')}${group(rows, 'Ideas, listas, claves del wifi… lo que quieras apuntar.')}`;
}

// ---------- Vista: Salud y nutrición ----------
function viewHealth() {
  const seg = `<div class="seg">${[['nut', 'Nutrición'], ['peso', 'Peso'], ['ej', 'Ejercicio']].map(([k, l]) => `<button class="${ui.hseg === k ? 'on' : ''}" data-act="hseg" data-id="${k}">${l}</button>`).join('')}</div>`;
  const add = { nut: 'add-meal', peso: 'add-weight', ej: 'add-workout' }[ui.hseg];
  const body = { nut: bodyNut, peso: bodyPeso, ej: bodyEj }[ui.hseg]();
  return head('Salud', 'Nutrición, peso y ejercicio', `<button class="icon-btn" data-act="health-goals" aria-label="Objetivos">🎯</button>${plusBtn(add)}`, 'Más') + seg + body;
}
function bodyNut() {
  const ds = ui.hday, n = nutrition(ds), goal = S.health.kcal || 1, pct = Math.min(100, n.kcal / goal * 100), over = n.kcal > goal;
  const tot = n.p * 4 + n.c * 4 + n.f * 9 || 1;
  const macro = (l, g, kc, color) => `<div class="pill2"><div class="s">${l}</div><b>${num(g)} g</b><div class="prog"><i style="width:${kc / tot * 100}%;background:${color}"></i></div></div>`;
  const dayBar = `<div style="display:flex;align-items:center;justify-content:space-between;margin:0 4px 12px"><button class="icon-btn" data-act="hday" data-id="-1">‹</button><b class="cap">${ds === today() ? 'Hoy' : fdateL(ds)}</b><button class="icon-btn" data-act="hday" data-id="1">›</button></div>`;
  const groups = Object.entries(MEALS).map(([k, [ico, label]]) => {
    const list = S.meals.filter(m => m.date === ds && m.meal === k);
    const kc = list.reduce((a, m) => a + (m.kcal || 0), 0);
    return `<div class="section-title" style="display:flex;justify-content:space-between"><span>${ico} ${label}</span><span>${num(kc)} kcal</span></div>
    <div class="group">${list.map(m => row({ ico: ico, color: 'var(--green)', title: m.name, sub: `P ${num(m.p)} · C ${num(m.c)} · G ${num(m.f)}`, right: `${num(m.kcal)} kcal`, act: 'edit-meal', id: m.id })).join('')}<div class="row noicon" data-act="add-meal" data-id="${k}"><div class="grow t" style="color:var(--blue)">+ Añadir ${label.toLowerCase()}</div></div></div>`;
  }).join('');
  return `${dayBar}<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><div><span style="font-size:32px;font-weight:700">${num(n.kcal)}</span> <span class="s">/ ${num(goal)} kcal</span></div><div class="s">${over ? `+${num(n.kcal - goal)} sobre el objetivo` : `${num(goal - n.kcal)} restantes`}</div></div>
    <div class="prog" style="height:12px"><i style="width:${pct}%;background:${over ? 'var(--orange)' : 'var(--green)'}"></i></div>
    <div class="macros">${macro('Proteína', n.p, n.p * 4, 'var(--blue)')}${macro('Carbos', n.c, n.c * 4, 'var(--orange)')}${macro('Grasas', n.f, n.f * 9, 'var(--pink)')}</div></div>
  <div class="group">${waterRow(ds)}</div>${groups}`;
}
function bodyPeso() {
  const w = sortedWeights();
  if (!w.length) return `<div class="group"><div class="empty">Registra tu peso para ver la evolución.<br>Pulsa + para añadir el primero.</div></div>`;
  const last = w[w.length - 1], first = w[0], diff = last.kg - first.kg, goal = S.health.weight;
  const pts = w.slice(-30), min = Math.min(...pts.map(p => p.kg), goal || Infinity) - 0.5, max = Math.max(...pts.map(p => p.kg), goal || -Infinity) + 0.5;
  const X = i => pts.length === 1 ? 160 : 10 + i * 300 / (pts.length - 1), Y = kg => 10 + (max - kg) / (max - min || 1) * 80;
  const line = pts.map((p, i) => `${X(i)},${Y(p.kg)}`).join(' ');
  const goalLine = goal ? `<line x1="10" x2="310" y1="${Y(goal)}" y2="${Y(goal)}" stroke="var(--green)" stroke-dasharray="4 4" stroke-width="1.5"/>` : '';
  const chart = `<svg viewBox="0 0 320 100" width="100%" height="110" role="img" aria-label="Evolución del peso">${goalLine}<polyline points="${line}" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${pts.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.kg)}" r="3.5" fill="var(--blue)"/>`).join('')}</svg>`;
  const rows = [...w].reverse().slice(0, 30).map(x => row({ ico: '⚖️', color: 'var(--blue)', title: `${num(x.kg, 1)} kg`, sub: fdate(x.date), act: 'edit-weight', id: x.id })).join('');
  return `<div class="grid2"><div class="card kpi"><div class="n">${num(last.kg, 1)} kg</div><div class="l">Actual</div></div><div class="card kpi"><div class="n" style="color:${diff <= 0 ? 'var(--green)' : 'var(--orange)'}">${diff > 0 ? '+' : ''}${num(diff, 1)} kg</div><div class="l">Desde el inicio${goal ? ` · meta ${num(goal, 1)}` : ''}</div></div></div>
  <div class="card">${chart}</div><div class="group">${rows}</div>`;
}
function bodyEj() {
  const t = today(), from = addDays(t, -6);
  const week = S.workouts.filter(x => x.date >= from && x.date <= t);
  const min = week.reduce((a, x) => a + x.min, 0), kc = week.reduce((a, x) => a + (x.kcal || 0), 0);
  const rows = [...S.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40).map(x => row({ ico: '🏃', color: 'var(--red)', title: x.type, sub: `${fdate(x.date)}${x.note ? ' · ' + x.note : ''}`, right: `${x.min} min`, rightSub: x.kcal ? `<div class="s">${num(x.kcal)} kcal</div>` : '', act: 'edit-workout', id: x.id })).join('');
  return `<div class="grid2"><div class="card kpi"><div class="n">${num(min)} min</div><div class="l">Últimos 7 días</div></div><div class="card kpi"><div class="n">${num(kc)} kcal</div><div class="l">Quemadas (7 d)</div></div></div>${group(rows, 'Apunta tus entrenos y caminatas.<br>Pulsa + para añadir el primero.')}`;
}

// ---------- Vista: Asistente ----------
const SUGGEST = ['¿Cuánto he gastado este mes?', '¿Qué tengo esta semana?', 'Hoy he comido una tortilla de 3 huevos y una ensalada', '¿Qué suscripciones podría cancelar?', 'Apúntame mañana a las 10 llamar al gestor', 'Hazme un resumen de mis finanzas'];
function viewIA() {
  const msgs = S.chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.content)}</div>`).join('');
  const intro = !S.chat.length ? `<div class="card" style="text-align:center"><div style="font-size:40px">✨</div><div class="t" style="margin:6px 0">Tu asistente de Vida</div><div class="s">Conoce tus gastos, negocio, calendario, tareas y nutrición. Pregúntale o pídele que apunte cosas por ti.</div></div><div class="chips">${SUGGEST.map(s => `<button data-act="ask">${esc(s)}</button>`).join('')}</div>` : '';
  const key = S.settings.apiKey ? '' : `<div class="card" data-act="settings" style="border:1px solid var(--orange)"><div class="t">Falta la clave de la IA</div><div class="s">Toca aquí y pega tu API key de Anthropic en Ajustes.</div></div>`;
  return `${head('Asistente', '', S.chat.length ? '<button class="icon-btn" data-act="clear-chat" aria-label="Borrar">🗑</button>' : '', 'Volver')}${key}${intro}
  <div class="chat">${msgs}${ui.busy ? '<div class="msg ai"><span class="dots"><span></span><span></span><span></span></span></div>' : ''}</div>
  <div style="height:70px"></div>
  <div class="composer"><input id="q" placeholder="Pregunta o pide algo…" autocomplete="off" enterkeyhint="send"><button data-act="send" aria-label="Enviar">↑</button></div>`;
}

// ---------- Render ----------
function render() {
  const y = window.scrollY;
  $('#view').innerHTML = { hoy: viewHoy, cal: viewCal, money: viewMoney, biz: viewBiz, more: viewMore, ia: viewIA }[ui.tab]();
  $('#tabbar').innerHTML = TABS.map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${ICONS[k]}<span>${l}</span></button>`).join('');
  $('#tabbar').style.display = ui.tab === 'ia' ? 'none' : '';
  const fab = $('#fab'); if (fab) fab.style.display = ui.tab === 'ia' ? 'none' : '';
  if (ui.tab === 'ia') window.scrollTo(0, document.body.scrollHeight); else window.scrollTo(0, y);
}

// ---------- Hojas (formularios) ----------
function sheet(title, fields, { onSave, onDelete, saveLabel = 'Guardar', extra = '', onExtra } = {}) {
  const root = $('#sheet-root');
  const inp = f => {
    const v = f.value ?? '';
    if (f.type === 'select') return `<select name="${f.k}">${f.options.map(([val, l]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    if (f.type === 'number') return `<input name="${f.k}" type="text" inputmode="decimal" placeholder="${f.placeholder || '0'}" value="${esc(v)}">`;
    if (f.type === 'textarea') return `<textarea name="${f.k}" placeholder="${f.placeholder || ''}">${esc(v)}</textarea>`;
    if (f.type === 'password') return `<input name="${f.k}" type="password" autocomplete="off" placeholder="${f.placeholder || ''}" value="${esc(v)}">`;
    return `<input name="${f.k}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" value="${esc(v)}">`;
  };
  root.innerHTML = `<div class="backdrop" data-sheet="close"></div><form class="sheet" novalidate><div class="grab"></div><h2>${esc(title)}</h2>
    <div class="group">${fields.map(f => `<div class="field ${f.type === 'textarea' ? 'ta' : ''}"><label>${esc(f.label)}</label>${inp(f)}</div>`).join('')}</div>${extra}
    ${onSave ? `<button class="btn" type="submit">${saveLabel}</button>` : ''}${onDelete ? '<button class="btn danger" type="button" data-sheet="delete">Eliminar</button>' : ''}
    <button class="btn alt" type="button" data-sheet="close">Cancelar</button></form>`;
  const form = root.querySelector('form');
  const close = () => { root.innerHTML = ''; };
  const read = () => Object.fromEntries(fields.map(f => {
    let v = form.elements[f.k].value;
    if (f.type === 'number') v = parseFloat(String(v).replace(',', '.')) || 0;
    return [f.k, typeof v === 'string' ? v.trim() : v];
  }));
  form.addEventListener('submit', e => { e.preventDefault(); if (onSave && onSave(read(), close) !== false) close(); });
  root.onclick = e => {
    const a = e.target.closest('[data-sheet]')?.dataset.sheet;
    if (a === 'close') close();
    if (a === 'delete' && confirm('¿Eliminar definitivamente?')) { onDelete(); close(); }
    const x = e.target.closest('[data-x]'); if (x && onExtra) onExtra(x.dataset.x, close, read, form);
  };
  setTimeout(() => [...form.querySelectorAll('input[type=text]')].find(i => !i.value)?.focus(), 300);
}
const need = (v, msg) => { if (!v) { toast(msg); return false; } return true; };
const remove = (arr, x) => { arr.splice(arr.indexOf(x), 1); };

function txSheet(t) {
  const isNew = !t;
  t = t || { type: 'out', amount: 0, cat: 'Comida', note: '', date: today(), scope: 'personal' };
  sheet(isNew ? 'Nuevo movimiento' : 'Editar movimiento', [
    { k: 'type', label: 'Tipo', type: 'select', value: t.type, options: [['out', 'Gasto'], ['in', 'Ingreso']] },
    { k: 'amount', label: 'Importe', type: 'number', value: t.amount || '', placeholder: '0,00' },
    { k: 'note', label: 'Concepto', value: t.note, placeholder: 'Opcional' },
    { k: 'cat', label: 'Categoría', type: 'select', value: t.cat, options: CAT_OPTS },
    { k: 'scope', label: 'Ámbito', type: 'select', value: t.scope || 'personal', options: [['personal', 'Personal'], ['negocio', 'Negocio']] },
    { k: 'date', label: 'Fecha', type: 'date', value: t.date }
  ], {
    onSave: v => { if (!need(v.amount > 0, 'Pon un importe')) return false; if (isNew) S.tx.push({ id: uid(), ...v }); else Object.assign(t, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.tx, t); save(); render(); }
  });
}
function subSheet(s) {
  const isNew = !s;
  s = s || { name: '', amount: 0, cycle: 'mensual', next: today(), scope: 'personal', active: true };
  sheet(isNew ? 'Nueva suscripción' : 'Editar suscripción', [
    { k: 'name', label: 'Nombre', value: s.name, placeholder: 'Netflix, hosting…' },
    { k: 'amount', label: 'Importe', type: 'number', value: s.amount || '', placeholder: '0,00' },
    { k: 'cycle', label: 'Periodo', type: 'select', value: s.cycle, options: [['mensual', 'Mensual'], ['anual', 'Anual'], ['trimestral', 'Trimestral'], ['semanal', 'Semanal']] },
    { k: 'next', label: 'Próximo cargo', type: 'date', value: s.next },
    { k: 'scope', label: 'Ámbito', type: 'select', value: s.scope || 'personal', options: [['personal', 'Personal'], ['negocio', 'Negocio']] },
    { k: 'active', label: 'Estado', type: 'select', value: s.active === false ? 'no' : 'si', options: [['si', 'Activa'], ['no', 'Pausada']] }
  ], {
    onSave: v => { if (!need(v.name, 'Pon un nombre') || !need(v.amount > 0, 'Pon un importe')) return false; v.active = v.active !== 'no'; if (isNew) S.subs.push({ id: uid(), ...v }); else Object.assign(s, v); rollSubs(); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.subs, s); save(); render(); }
  });
}
function bizSheet(b) {
  const isNew = !b;
  b = b || { client: '', concept: '', amount: 0, status: 'presupuesto', date: today(), due: '' };
  sheet(isNew ? 'Nuevo trabajo' : 'Editar trabajo', [
    { k: 'client', label: 'Cliente', value: b.client },
    { k: 'concept', label: 'Concepto', value: b.concept, placeholder: 'Proyecto, factura…' },
    { k: 'amount', label: 'Importe', type: 'number', value: b.amount || '', placeholder: '0,00' },
    { k: 'status', label: 'Estado', type: 'select', value: b.status, options: Object.entries(STATUS).map(([k, v]) => [k, v[0]]) },
    { k: 'date', label: 'Fecha', type: 'date', value: b.date },
    { k: 'due', label: 'Vence', type: 'date', value: b.due }
  ], {
    onSave: v => {
      if (!need(v.client, 'Pon el cliente') || !need(v.amount > 0, 'Pon un importe')) return false;
      const was = isNew ? null : b.status;
      if (isNew) { b = { id: uid(), ...v }; S.biz.push(b); } else Object.assign(b, v);
      if (b.status === 'cobrado' && was !== 'cobrado') { S.tx.push({ id: uid(), type: 'in', amount: b.amount, cat: 'Negocio', note: `${b.client}${b.concept ? ' · ' + b.concept : ''}`, date: today(), scope: 'negocio', bizId: b.id }); toast('Ingreso registrado en Dinero'); }
      save(); render();
    },
    onDelete: isNew ? null : () => { remove(S.biz, b); save(); render(); }
  });
}
function remSheet(r) {
  const isNew = !r;
  const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
  r = r || { title: '', due: isoTime(d), repeat: 'no' };
  sheet(isNew ? 'Nuevo recordatorio' : 'Editar recordatorio', [
    { k: 'title', label: 'Qué', value: r.title, placeholder: 'Llamar a…' },
    { k: 'due', label: 'Cuándo', type: 'datetime-local', value: r.due },
    { k: 'repeat', label: 'Repetir', type: 'select', value: r.repeat || 'no', options: REPEAT_OPTS }
  ], {
    onSave: v => { if (!need(v.title, 'Escribe el recordatorio')) return false; v.notified = false; if (isNew) S.rem.push({ id: uid(), done: false, ...v }); else Object.assign(r, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.rem, r); save(); render(); }
  });
}
function evSheet(e, preset = {}) {
  const isNew = !e;
  e = e || { type: 'evento', title: '', date: ui.tab === 'cal' ? ui.calSel : today(), time: '', repeat: 'no', note: '', ...preset };
  sheet(isNew ? (e.type === 'cumple' ? 'Nuevo cumpleaños' : 'Nuevo evento') : 'Editar', [
    { k: 'type', label: 'Tipo', type: 'select', value: e.type, options: [['evento', 'Evento'], ['cumple', 'Cumpleaños']] },
    { k: 'title', label: e.type === 'cumple' ? 'Nombre' : 'Título', value: e.title, placeholder: e.type === 'cumple' ? 'Ana' : 'Cena, cita médica…' },
    { k: 'date', label: e.type === 'cumple' ? 'Nacimiento' : 'Fecha', type: 'date', value: e.date },
    { k: 'time', label: 'Hora', type: 'time', value: e.time },
    { k: 'repeat', label: 'Repetir', type: 'select', value: e.repeat || 'no', options: REPEAT_OPTS },
    { k: 'note', label: 'Nota', value: e.note, placeholder: 'Opcional' }
  ], {
    extra: '<div class="s" style="margin:-4px 16px 6px">En cumpleaños, con el año de nacimiento se calcula la edad. Se repite cada año.</div>',
    onSave: v => { if (!need(v.title, 'Pon un título') || !need(v.date, 'Pon una fecha')) return false; v.lastN = ''; if (isNew) S.events.push({ id: uid(), ...v }); else Object.assign(e, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.events, e); save(); render(); }
  });
}
function taskSheet(t) {
  const isNew = !t;
  t = t || { title: '', due: '', prio: 'media', note: '', done: false };
  sheet(isNew ? 'Nueva tarea' : 'Editar tarea', [
    { k: 'title', label: 'Tarea', value: t.title, placeholder: 'Qué hay que hacer' },
    { k: 'due', label: 'Fecha límite', type: 'date', value: t.due },
    { k: 'prio', label: 'Prioridad', type: 'select', value: t.prio, options: [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']] },
    { k: 'note', label: 'Nota', type: 'textarea', value: t.note }
  ], {
    onSave: v => { if (!need(v.title, 'Escribe la tarea')) return false; if (isNew) S.tasks.push({ id: uid(), ...v, done: false }); else Object.assign(t, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.tasks, t); save(); render(); }
  });
}
function habitSheet(h) {
  const isNew = !h;
  h = h || { name: '', emoji: '', log: {} };
  sheet(isNew ? 'Nuevo hábito' : 'Editar hábito', [
    { k: 'emoji', label: 'Emoji', value: h.emoji, placeholder: '📖' },
    { k: 'name', label: 'Hábito', value: h.name, placeholder: 'Leer 20 minutos' }
  ], {
    onSave: v => { if (!need(v.name, 'Pon un nombre')) return false; if (isNew) S.habits.push({ id: uid(), ...v, log: {} }); else Object.assign(h, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.habits, h); save(); render(); }
  });
}
function goalSheet(g) {
  const isNew = !g;
  g = g || { name: '', emoji: '', target: 0, saved: 0, deadline: '' };
  sheet(isNew ? 'Nuevo objetivo' : 'Editar objetivo', [
    { k: 'emoji', label: 'Emoji', value: g.emoji, placeholder: '✈️' },
    { k: 'name', label: 'Objetivo', value: g.name, placeholder: 'Viaje a Japón' },
    { k: 'target', label: 'Meta', type: 'number', value: g.target || '', placeholder: '0,00' },
    { k: 'saved', label: 'Ahorrado', type: 'number', value: g.saved || '', placeholder: '0,00' },
    { k: 'add', label: 'Aportar ahora', type: 'number', value: '', placeholder: '+ 0,00' },
    { k: 'deadline', label: 'Fecha meta', type: 'date', value: g.deadline }
  ], {
    onSave: v => { if (!need(v.name, 'Pon un nombre') || !need(v.target > 0, 'Pon la meta')) return false; v.saved = v.saved + v.add; delete v.add; if (isNew) S.goals.push({ id: uid(), ...v }); else Object.assign(g, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.goals, g); save(); render(); }
  });
}
function noteSheet(n) {
  const isNew = !n;
  n = n || { title: '', text: '', date: today() };
  sheet(isNew ? 'Nueva nota' : 'Editar nota', [
    { k: 'title', label: 'Título', value: n.title },
    { k: 'text', label: 'Texto', type: 'textarea', value: n.text }
  ], {
    onSave: v => { if (!need(v.title || v.text, 'Escribe algo')) return false; v.date = today(); if (isNew) S.notes.push({ id: uid(), ...v }); else Object.assign(n, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.notes, n); save(); render(); }
  });
}
function budgetSheet() {
  sheet('Presupuestos mensuales', OUT_CATS.map(c => ({ k: c, label: `${catI(c)[0]} ${c}`, type: 'number', value: S.budgets[c] || '', placeholder: 'Sin límite' })), {
    extra: '<div class="s" style="margin:-4px 16px 6px">Límite de gasto al mes por categoría. Déjalo vacío para no limitar.</div>',
    onSave: v => { S.budgets = {}; for (const c of OUT_CATS) if (v[c] > 0) S.budgets[c] = v[c]; save(); render(); }
  });
}

// --- Salud ---
async function aiJSON(system, prompt) {
  if (!S.settings.apiKey) throw new Error('Falta la API key en Ajustes');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': S.settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: S.settings.model || 'claude-sonnet-5-5', max_tokens: 300, system, messages: [{ role: 'user', content: prompt }] })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error?.message || `Error ${res.status}`);
  const txt = j.content.map(b => b.text || '').join('');
  return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
}
function mealSheet(m, meal = 'comida') {
  const isNew = !m;
  m = m || { meal, name: '', kcal: 0, p: 0, c: 0, f: 0, date: ui.hday };
  sheet(isNew ? 'Añadir comida' : 'Editar comida', [
    { k: 'meal', label: 'Momento', type: 'select', value: m.meal, options: Object.entries(MEALS).map(([k, v]) => [k, `${v[0]} ${v[1]}`]) },
    { k: 'name', label: 'Qué has comido', value: m.name, placeholder: '2 huevos y tostada' },
    { k: 'kcal', label: 'Calorías', type: 'number', value: m.kcal || '', placeholder: 'kcal' },
    { k: 'p', label: 'Proteína (g)', type: 'number', value: m.p || '', placeholder: '0' },
    { k: 'c', label: 'Carbos (g)', type: 'number', value: m.c || '', placeholder: '0' },
    { k: 'f', label: 'Grasas (g)', type: 'number', value: m.f || '', placeholder: '0' },
    { k: 'date', label: 'Fecha', type: 'date', value: m.date }
  ], {
    extra: '<button class="btn alt" type="button" data-x="estimate" style="margin-top:0">✨ Estimar calorías con IA</button>',
    onExtra: async (x, close, read, form) => {
      if (x !== 'estimate') return;
      const name = form.elements.name.value.trim();
      if (!name) return toast('Escribe primero qué has comido');
      const btn = form.querySelector('[data-x=estimate]'); btn.textContent = 'Estimando…';
      try {
        const r = await aiJSON('Eres nutricionista. Estima la comida descrita para una persona adulta con raciones habituales en España. Responde SOLO con JSON: {"kcal":n,"p":n,"c":n,"f":n} (kcal totales y gramos de proteína, carbohidratos y grasas), sin texto adicional.', name);
        for (const k of ['kcal', 'p', 'c', 'f']) form.elements[k].value = Math.round(r[k] || 0);
        toast('Estimación aproximada: revisa las cifras');
      } catch (e) { toast(e.message); }
      btn.textContent = '✨ Estimar calorías con IA';
    },
    onSave: v => { if (!need(v.name, 'Pon qué has comido')) return false; if (isNew) S.meals.push({ id: uid(), ...v }); else Object.assign(m, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.meals, m); save(); render(); }
  });
}
function weightSheet(w) {
  const isNew = !w, last = sortedWeights().pop();
  w = w || { kg: last?.kg || '', date: today() };
  sheet(isNew ? 'Registrar peso' : 'Editar peso', [
    { k: 'kg', label: 'Peso (kg)', type: 'number', value: w.kg, placeholder: '70,5' },
    { k: 'date', label: 'Fecha', type: 'date', value: w.date }
  ], {
    onSave: v => { if (!need(v.kg > 20 && v.kg < 400, 'Pon un peso válido')) return false; if (isNew) S.weights.push({ id: uid(), ...v }); else Object.assign(w, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.weights, w); save(); render(); }
  });
}
function workoutSheet(x) {
  const isNew = !x;
  x = x || { type: 'Caminar', min: 0, kcal: 0, date: today(), note: '' };
  sheet(isNew ? 'Nuevo ejercicio' : 'Editar ejercicio', [
    { k: 'type', label: 'Actividad', type: 'select', value: x.type, options: SPORTS.map(s => [s, s]) },
    { k: 'min', label: 'Minutos', type: 'number', value: x.min || '', placeholder: '30' },
    { k: 'kcal', label: 'Kcal quemadas', type: 'number', value: x.kcal || '', placeholder: 'Opcional' },
    { k: 'date', label: 'Fecha', type: 'date', value: x.date },
    { k: 'note', label: 'Nota', value: x.note, placeholder: 'Opcional' }
  ], {
    onSave: v => { if (!need(v.min > 0, 'Pon los minutos')) return false; if (isNew) S.workouts.push({ id: uid(), ...v }); else Object.assign(x, v); save(); render(); },
    onDelete: isNew ? null : () => { remove(S.workouts, x); save(); render(); }
  });
}
function healthGoalsSheet() {
  sheet('Objetivos de salud', [
    { k: 'kcal', label: 'Kcal al día', type: 'number', value: S.health.kcal },
    { k: 'water', label: 'Vasos de agua', type: 'number', value: S.health.water },
    { k: 'weight', label: 'Peso objetivo', type: 'number', value: S.health.weight || '', placeholder: 'Opcional (kg)' }
  ], { onSave: v => { S.health = { kcal: v.kcal || 2000, water: v.water || 8, weight: v.weight || 0 }; save(); render(); } });
}

function settingsSheet() {
  sheet('Ajustes', [
    { k: 'name', label: 'Tu nombre', value: S.profile.name },
    { k: 'theme', label: 'Apariencia', type: 'select', value: S.settings.theme, options: [['auto', 'Automática'], ['light', 'Clara'], ['dark', 'Oscura']] },
    { k: 'apiKey', label: 'API key IA', type: 'password', value: S.settings.apiKey, placeholder: 'sk-ant-…' },
    { k: 'model', label: 'Modelo', value: S.settings.model }
  ], {
    onSave: v => { S.profile.name = v.name; S.settings.theme = v.theme; S.settings.apiKey = v.apiKey; S.settings.model = v.model || 'claude-sonnet-5-5'; save(); applyTheme(); render(); },
    extra: `<div class="section-title">Datos</div><div class="group"><div class="row noicon" data-x="export"><div class="grow t" style="color:var(--blue)">Exportar copia (JSON)</div></div><div class="row noicon" data-x="csv"><div class="grow t" style="color:var(--blue)">Exportar movimientos (CSV)</div></div><div class="row noicon" data-x="import"><div class="grow t" style="color:var(--blue)">Importar copia</div></div><div class="row noicon" data-x="wipe"><div class="grow t" style="color:var(--red)">Borrar todos los datos</div></div></div>
    <div class="s" style="margin:-6px 16px 10px">Todo se guarda solo en este dispositivo. La clave de IA se envía únicamente a Anthropic.</div>`,
    onExtra: (x, close) => {
      const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
      if (x === 'export') dl(`vida-${today()}.json`, JSON.stringify(S, null, 2), 'application/json');
      else if (x === 'csv') {
        const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        dl(`movimientos-${today()}.csv`, '﻿' + ['fecha;tipo;importe;categoria;concepto;ambito', ...[...S.tx].sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.type === 'in' ? 'ingreso' : 'gasto', String(t.amount).replace('.', ','), t.cat, q(t.note), t.scope || 'personal'].join(';'))].join('\n'), 'text/csv');
      } else if (x === 'import') {
        const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json';
        i.onchange = async () => { try { S = normalize(JSON.parse(await i.files[0].text())); save(); rollSubs(); applyTheme(); close(); render(); toast('Copia importada'); } catch { toast('Archivo no válido'); } };
        i.click();
      } else if (x === 'wipe' && confirm('Se borrará todo. ¿Seguro?')) { S = normalize(); save(); applyTheme(); close(); render(); }
    }
  });
}

// ---------- Asistente IA (con herramientas para crear cosas) ----------
function context() {
  const mk = monthKey(new Date()), pm = shiftMonth(mk, -1), t = today();
  const r2 = n => Math.round(n * 100) / 100;
  const agenda = []; for (let i = 0; i < 30; i++) { const d = addDays(t, i); for (const it of itemsOn(d)) agenda.push({ fecha: d, tipo: it.k, titulo: it.title, hora: it.time || undefined }); }
  return JSON.stringify({
    hoy: t, dia_semana: DIAS_L[new Date().getDay()], nombre: S.profile.name || undefined,
    mes_actual: { mes: mk, ...summary(mk), personal: summary(mk, 'personal'), negocio: summary(mk, 'negocio') },
    mes_anterior: { mes: pm, ...summary(pm) },
    presupuestos_mensuales: S.budgets,
    suscripciones: S.subs.map(s => ({ nombre: s.name, importe: s.amount, periodo: s.cycle, proximo_cargo: s.next, ambito: s.scope, activa: s.active !== false })),
    coste_mensual_suscripciones: r2(subsMonthly()),
    negocio_trabajos: S.biz.map(b => ({ cliente: b.client, concepto: b.concept, importe: b.amount, estado: b.status, vence: b.due || undefined })),
    agenda_proximos_30_dias: agenda,
    tareas_pendientes: S.tasks.filter(x => !x.done).map(x => ({ tarea: x.title, limite: x.due || undefined, prioridad: x.prio })),
    cumpleanos: S.events.filter(e => e.type === 'cumple').map(e => ({ nombre: e.title, proximo: nextBirthday(e) })),
    habitos: S.habits.map(h => ({ nombre: h.name, racha: streak(h), hecho_hoy: !!h.log[t] })),
    objetivos_ahorro: S.goals.map(g => ({ nombre: g.name, meta: g.target, ahorrado: g.saved, fecha: g.deadline || undefined })),
    salud: {
      objetivos: S.health, hoy: { ...nutrition(t), vasos_agua: S.water[t] || 0 },
      comidas_hoy: S.meals.filter(m => m.date === t).map(m => ({ momento: m.meal, nombre: m.name, kcal: m.kcal })),
      kcal_ultimos_7_dias: Array.from({ length: 7 }, (_, i) => { const d = addDays(t, -i); return { fecha: d, kcal: nutrition(d).kcal }; }),
      pesos: sortedWeights().slice(-10).map(w => ({ fecha: w.date, kg: w.kg })),
      ejercicio_ultimos_7_dias: S.workouts.filter(w => w.date >= addDays(t, -6)).map(w => ({ fecha: w.date, tipo: w.type, min: w.min, kcal: w.kcal }))
    },
    notas: S.notes.slice(-10).map(n => n.title),
    ultimos_movimientos: [...S.tx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60).map(x => ({ fecha: x.date, tipo: x.type === 'in' ? 'ingreso' : 'gasto', importe: x.amount, categoria: x.cat, concepto: x.note, ambito: x.scope }))
  });
}
const R = ['no', 'diario', 'semanal', 'mensual', 'anual'];
const TOOLS = [
  { name: 'add_task', description: 'Crea una tarea pendiente.', input_schema: { type: 'object', properties: { title: { type: 'string' }, due: { type: 'string', description: 'YYYY-MM-DD' }, prio: { type: 'string', enum: ['alta', 'media', 'baja'] } }, required: ['title'] } },
  { name: 'add_event', description: 'Crea un evento o cumpleaños en el calendario.', input_schema: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, time: { type: 'string', description: 'HH:MM' }, type: { type: 'string', enum: ['evento', 'cumple'] }, repeat: { type: 'string', enum: R } }, required: ['title', 'date'] } },
  { name: 'add_reminder', description: 'Crea un recordatorio con aviso a una hora concreta.', input_schema: { type: 'object', properties: { title: { type: 'string' }, due: { type: 'string', description: 'YYYY-MM-DDTHH:MM' }, repeat: { type: 'string', enum: R } }, required: ['title', 'due'] } },
  { name: 'add_transaction', description: 'Registra un gasto o ingreso.', input_schema: { type: 'object', properties: { type: { type: 'string', enum: ['out', 'in'] }, amount: { type: 'number' }, category: { type: 'string', enum: Object.keys(CATS) }, note: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD, por defecto hoy' }, scope: { type: 'string', enum: ['personal', 'negocio'] } }, required: ['type', 'amount', 'category'] } },
  { name: 'add_meal', description: 'Registra una comida con calorías y macros ESTIMADOS por ti a partir de la descripción del usuario.', input_schema: { type: 'object', properties: { meal: { type: 'string', enum: Object.keys(MEALS) }, name: { type: 'string' }, kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, date: { type: 'string', description: 'YYYY-MM-DD, por defecto hoy' } }, required: ['meal', 'name', 'kcal'] } },
  { name: 'add_weight', description: 'Registra el peso corporal en kg.', input_schema: { type: 'object', properties: { kg: { type: 'number' }, date: { type: 'string' } }, required: ['kg'] } },
  { name: 'add_workout', description: 'Registra un ejercicio realizado.', input_schema: { type: 'object', properties: { type: { type: 'string', enum: SPORTS }, minutes: { type: 'number' }, kcal: { type: 'number' }, date: { type: 'string' } }, required: ['type', 'minutes'] } }
];
function runTool(name, i) {
  try {
    if (name === 'add_task') { S.tasks.push({ id: uid(), title: i.title, due: i.due || '', prio: i.prio || 'media', note: '', done: false }); return `Tarea creada: ${i.title}`; }
    if (name === 'add_event') { S.events.push({ id: uid(), type: i.type || 'evento', title: i.title, date: i.date, time: i.time || '', repeat: i.repeat || 'no', note: '', lastN: '' }); return `Evento creado: ${i.title} el ${i.date}`; }
    if (name === 'add_reminder') { S.rem.push({ id: uid(), title: i.title, due: i.due, repeat: i.repeat || 'no', done: false, notified: false }); return `Recordatorio creado: ${i.title} (${i.due})`; }
    if (name === 'add_transaction') { S.tx.push({ id: uid(), type: i.type, amount: Math.abs(i.amount), cat: CATS[i.category] ? i.category : 'Otros', note: i.note || '', date: i.date || today(), scope: i.scope || 'personal' }); return `Movimiento registrado: ${i.amount} € (${i.category})`; }
    if (name === 'add_meal') { S.meals.push({ id: uid(), meal: i.meal, name: i.name, kcal: Math.round(i.kcal), p: Math.round(i.protein || 0), c: Math.round(i.carbs || 0), f: Math.round(i.fat || 0), date: i.date || today() }); return `Comida registrada: ${i.name} (${Math.round(i.kcal)} kcal)`; }
    if (name === 'add_weight') { S.weights.push({ id: uid(), kg: i.kg, date: i.date || today() }); return `Peso registrado: ${i.kg} kg`; }
    if (name === 'add_workout') { S.workouts.push({ id: uid(), type: i.type, min: i.minutes, kcal: i.kcal || 0, date: i.date || today(), note: '' }); return `Ejercicio registrado: ${i.type} ${i.minutes} min`; }
  } catch (e) { return `Error: ${e.message}`; }
  return 'Herramienta desconocida';
}
async function ask(text) {
  if (!text || ui.busy) return;
  if (!S.settings.apiKey) { toast('Añade tu API key en Ajustes'); return settingsSheet(); }
  S.chat.push({ role: 'user', content: text }); ui.busy = true; save(); render();
  const msgs = S.chat.slice(-20).map(m => ({ role: m.role, content: m.content }));
  let reply = '';
  try {
    for (let step = 0; step < 5; step++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': S.settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: S.settings.model || 'claude-sonnet-5-5', max_tokens: 1024, tools: TOOLS,
          system: `Eres el asistente personal de la app "Vida" del usuario. Responde siempre en español, breve, claro y útil, con importes en euros. Usa SOLO los datos de abajo para cifras concretas; si falta información, dilo. No inventes datos. Si el usuario pide apuntar/crear/registrar algo (tareas, eventos, recordatorios, gastos, comidas, peso, ejercicio), usa las herramientas (calcula las fechas a partir de "hoy"). Para comidas estima calorías y macros razonables y avisa de que son aproximados. Confirma qué has creado. No des consejos médicos; para dudas de salud recomienda consultar a un profesional.\n\nDATOS ACTUALES (JSON):\n${context()}`,
          messages: msgs
        })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || `Error ${res.status}`);
      const texts = j.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      if (j.stop_reason === 'tool_use') {
        msgs.push({ role: 'assistant', content: j.content });
        msgs.push({ role: 'user', content: j.content.filter(b => b.type === 'tool_use').map(b => ({ type: 'tool_result', tool_use_id: b.id, content: runTool(b.name, b.input) })) });
        reply += texts ? texts + '\n' : ''; save();
        continue;
      }
      reply += texts; break;
    }
  } catch (e) { reply = `⚠️ No he podido responder: ${e.message}`; }
  S.chat.push({ role: 'assistant', content: reply.trim() || 'Hecho ✅' });
  ui.busy = false; save(); render();
}

// ---------- Eventos ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const id = el.dataset.id, a = el.dataset.act;
  const by = arr => arr.find(x => x.id === id);
  switch (a) {
    case 'tab': ui.tab = id; ui.sub = null; render(); break;
    case 'goto': { const [t, sub] = id.split(':'); ui.tab = t; if (sub) ui.money = sub; render(); break; }
    case 'sub': ui.sub = id; render(); break;
    case 'health-open': ui.tab = 'more'; ui.sub = 'health'; ui.hseg = 'nut'; ui.hday = today(); render(); break;
    case 'back': if (ui.tab === 'ia') ui.tab = ui.prev; else ui.sub = null; render(); break;
    case 'ai': ui.prev = ui.tab; ui.tab = 'ia'; render(); break;
    case 'seg': ui.money = id; render(); break;
    case 'hseg': ui.hseg = id; render(); break;
    case 'hday': ui.hday = addDays(ui.hday, +id); render(); break;
    case 'scope': ui.scope = id; render(); break;
    case 'month': ui.month = shiftMonth(ui.month, +id); render(); break;
    case 'cal-month': ui.calMonth = shiftMonth(ui.calMonth, +id); render(); break;
    case 'cal-today': ui.calMonth = monthKey(new Date()); ui.calSel = today(); render(); break;
    case 'cal-day': ui.calSel = id; render(); break;
    case 'add-tx': txSheet(); break; case 'edit-tx': txSheet(by(S.tx)); break;
    case 'add-sub': subSheet(); break; case 'edit-sub': subSheet(by(S.subs)); break;
    case 'add-biz': bizSheet(); break; case 'edit-biz': bizSheet(by(S.biz)); break;
    case 'add-rem': remSheet(); break; case 'edit-rem': remSheet(by(S.rem)); break;
    case 'add-ev': evSheet(); break; case 'edit-ev': evSheet(by(S.events)); break;
    case 'add-bday': evSheet(null, { type: 'cumple', repeat: 'anual', date: '' }); break;
    case 'add-task': taskSheet(); break; case 'edit-task': taskSheet(by(S.tasks)); break;
    case 'add-habit': habitSheet(); break; case 'edit-habit': habitSheet(by(S.habits)); break;
    case 'add-goal': goalSheet(); break; case 'edit-goal': goalSheet(by(S.goals)); break;
    case 'add-note': noteSheet(); break; case 'edit-note': noteSheet(by(S.notes)); break;
    case 'add-meal': mealSheet(null, MEALS[id] ? id : 'comida'); break; case 'edit-meal': mealSheet(by(S.meals)); break;
    case 'add-weight': weightSheet(); break; case 'edit-weight': weightSheet(by(S.weights)); break;
    case 'add-workout': workoutSheet(); break; case 'edit-workout': workoutSheet(by(S.workouts)); break;
    case 'health-goals': healthGoalsSheet(); break;
    case 'budgets': budgetSheet(); break;
    case 'water': { const [d, n] = id.split(':'); S.water[d] = Math.max(0, (S.water[d] || 0) + +n); save(); render(); break; }
    case 'toggle-task': { const t = by(S.tasks); t.done = !t.done; save(); render(); break; }
    case 'habit': { const h = by(S.habits), d = today(); if (h.log[d]) delete h.log[d]; else h.log[d] = true; save(); render(); break; }
    case 'toggle-rem': {
      const r = by(S.rem);
      if (r.repeat && r.repeat !== 'no' && !r.done && r.due) { r.due = addCycle(r.due.slice(0, 10), r.repeat) + r.due.slice(10); r.notified = false; toast('Reprogramado'); }
      else { r.done = !r.done; r.notified = r.done; }
      save(); render(); break;
    }
    case 'notif': Notification.requestPermission().then(() => render()); break;
    case 'settings': settingsSheet(); break;
    case 'send': { const q = $('#q'); const v = q.value.trim(); q.value = ''; ask(v); break; }
    case 'ask': ask(el.textContent); break;
    case 'clear-chat': if (confirm('¿Borrar la conversación?')) { S.chat = []; save(); render(); } break;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'q') { e.preventDefault(); $('[data-act=send]').click(); } });

// ---------- Arranque ----------
document.body.insertAdjacentHTML('beforeend', '<button id="fab" class="fab" data-act="ai" aria-label="Asistente IA">✨</button>');
applyTheme();
rollSubs();
render();
checkDue();
setInterval(() => { rollSubs(); checkDue(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { rollSubs(); checkDue(); if (!document.querySelector('#sheet-root .sheet')) render(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
