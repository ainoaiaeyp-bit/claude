const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (c) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: c % 100 ? 2 : 0 });
const money = (c) => (c ? eur(c) : 'Gratis');
const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Ha ocurrido un error. Inténtalo de nuevo.');
  return d;
};
const longDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const pad = (n) => String(n).padStart(2, '0');
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const fm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

let settings = {}, services = [];

/* nav */
const nav = $('#nav'), menu = $('#menu'), burger = $('#burger');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 30), { passive: true });
burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
$('#yr').textContent = new Date().getFullYear();

/* CTA fija en móvil */
const sticky = $('.sticky-cta'), bookSec = $('#reservar');
const stickyUpdate = () => { const r = bookSec.getBoundingClientRect(); sticky.classList.toggle('show', scrollY > 500 && !(r.top < innerHeight && r.bottom > 0)); };
addEventListener('scroll', stickyUpdate, { passive: true });

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-book-name]'); if (!b) return;
  const svc = services.find((x) => x.name.toLowerCase().includes(b.dataset.bookName.toLowerCase()));
  if (svc) { wizard.pick(svc.id); $('#reservar').scrollIntoView({ behavior: 'smooth' }); }
});

/* ───── data ───── */
async function init() {
  [settings, services] = await Promise.all([api('/api/settings'), api('/api/services')]);
  renderServices();
  renderFooter();
  renderPolicy();
  renderLd();
  const gal = await api('/api/gallery').catch(() => []);
  renderGallery(gal);
  if (gal.length) { const ph = $('#about-photo'); ph.hidden = false; ph.innerHTML = `<img src="${esc(gal[1] || gal[0])}" alt="Noelia Duque trabajando" loading="lazy">`; }
  wizard.start();
  const pre = new URLSearchParams(location.search).get('servicio');
  if (pre && services.some((s) => s.id === Number(pre))) wizard.pick(Number(pre));
}

function renderServices() {
  const groups = [];
  services.forEach((s) => {
    let g = groups.find((x) => x.name === s.category);
    if (!g) groups.push((g = { name: s.category, items: [] }));
    g.items.push(s);
  });
  $('#svc-grid').innerHTML = groups.map((g) => `
    <div class="svc-group"><h3>${esc(g.name)}</h3><div class="svc-rows">${g.items.map((s) => `
      <div class="svc-row">
        <div><h4>${esc(s.name)}</h4><p>${esc(s.description)}</p></div>
        <span class="dur">${dur(s.duration_min)}</span>
        <span class="price">${s.price_from && s.price_cents ? '<small>desde</small>' : ''}${money(s.price_cents)}</span>
        <button class="btn btn-sm btn-ghost" data-book="${s.id}">Reservar</button>
      </div>`).join('')}</div></div>`).join('') || '<p class="hint">Próximamente.</p>';
  $('#svc-grid').onclick = (e) => {
    const b = e.target.closest('[data-book]'); if (!b) return;
    wizard.pick(Number(b.dataset.book));
    $('#reservar').scrollIntoView({ behavior: 'smooth' });
  };
}

function renderGallery(list) {
  if (!list.length) { $('#nav-portfolio').parentElement.hidden = true; return; }
  $('#portfolio').hidden = false;
  $('#gallery').innerHTML = list.map((u, i) => `<figure><img src="${esc(u)}" alt="Trabajo de cejas ${i + 1}" loading="lazy"></figure>`).join('');
}

function renderFooter() {
  const c = [];
  if (settings.whatsapp) c.push(`<li><a href="https://wa.me/${esc(settings.whatsapp.replace(/\D/g, ''))}" rel="noopener">WhatsApp</a></li>`);
  if (settings.phone) c.push(`<li><a href="tel:${esc(settings.phone.replace(/\s/g, ''))}">${esc(settings.phone)}</a></li>`);
  if (settings.email) c.push(`<li><a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a></li>`);
  if (settings.instagram) c.push(`<li><a href="${esc(settings.instagram)}" rel="noopener" target="_blank">Instagram</a></li>`);
  if (settings.address || settings.city) c.push(`<li>${esc(settings.address || settings.city)}</li>`);
  $('#ft-contact').innerHTML = c.join('') || '<li>Reserva online las 24 h.</li>';
  $('#ft-tag').textContent = settings.tagline;
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#ft-hours').innerHTML = order.map((d) => {
    const r = settings.hours[d] || [];
    return `<li>${DAYS[d]}: ${r.length ? r.map(([a, b]) => `${fm(a)}–${fm(b)}`).join(' · ') : 'Cerrado'}</li>`;
  }).join('');
}

function renderPolicy() {
  const n = settings.minNoticeHours, c = settings.cancelHours;
  $('#book-policy').textContent = settings.autoConfirm
    ? 'Selecciona servicio, fecha y hora. Tu cita queda confirmada al instante.'
    : 'Selecciona servicio, fecha y hora. Confirmaremos tu cita en cuanto la revisemos.';
  $('#faq-cancel').textContent = `Sí. Desde el enlace de tu cita puedes cancelarla hasta ${c} horas antes. Si necesitas cambiarla, escríbenos y la movemos sin problema.`;
  if (n) $('#book-policy').textContent += ` Reservas con al menos ${n} h de antelación.`;
}

function renderLd() {
  const ld = {
    '@context': 'https://schema.org', '@type': 'BeautySalon', name: settings.businessName, description: settings.tagline,
    url: location.origin, telephone: settings.phone || undefined, email: settings.email || undefined,
    address: { '@type': 'PostalAddress', streetAddress: settings.address || undefined, addressLocality: settings.city },
    sameAs: settings.instagram ? [settings.instagram] : undefined
  };
  $('#ld').textContent = JSON.stringify(ld);
}

/* ───── booking wizard ───── */
const wizard = (() => {
  const body = $('#wz-body');
  const st = { step: 1, service: null, location: 'studio', month: null, days: [], date: null, slots: [], slot: null, loading: false };
  const svc = () => services.find((s) => s.id === st.service);

  function setStep(n) {
    st.step = n;
    document.querySelectorAll('#wz-steps li').forEach((li) => {
      const s = Number(li.dataset.s);
      li.classList.toggle('on', s === n); li.classList.toggle('done', s < n);
    });
    render();
  }

  function render() {
    ({ 1: step1, 2: step2, 3: step3, 4: step4 })[st.step]();
  }

  function step1() {
    body.innerHTML = `<h3 class="wz-title">¿Qué servicio necesitas?</h3>
      <div class="opt-list">${services.map((s) => `
        <button class="opt" data-id="${s.id}" aria-pressed="${s.id === st.service}">
          <span><b>${esc(s.name)}</b><small>${dur(s.duration_min)} · ${esc(s.category)}</small></span>
          <span class="p">${s.price_from && s.price_cents ? 'desde ' : ''}${money(s.price_cents)}</span>
        </button>`).join('')}</div>
      <div id="loc"></div>
      <div class="wz-nav"><span></span><button class="btn btn-accent" id="next1" ${st.service ? '' : 'disabled'}>Continuar</button></div>`;
    renderLoc();
    body.querySelector('.opt-list').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b) return;
      pick(Number(b.dataset.id), false);
      body.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-pressed', x === b));
      $('#next1').disabled = false;
      renderLoc();
    };
    $('#next1').onclick = () => goDates();
  }

  function renderLoc() {
    const el = $('#loc'); if (!el) return;
    const s = svc();
    if (!s || !s.allow_home) { el.innerHTML = ''; return; }
    el.innerHTML = `<p class="slots-title" style="margin-top:1.5rem">¿Dónde prefieres el servicio?</p>
      <div class="seg">
        <button class="opt" data-loc="studio" aria-pressed="${st.location === 'studio'}"><span><b>En el estudio</b><small>${esc(settings.address || settings.city)}</small></span></button>
        <button class="opt" data-loc="home" aria-pressed="${st.location === 'home'}"><span><b>A domicilio</b><small>${esc(settings.homeFeeInfo || 'Suplemento según zona')}</small></span></button>
      </div>`;
    el.onclick = (e) => {
      const b = e.target.closest('[data-loc]'); if (!b) return;
      st.location = b.dataset.loc;
      el.querySelectorAll('[data-loc]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    };
  }

  function pick(id, advance = true) {
    if (st.service !== id) { st.service = id; st.date = null; st.slot = null; st.month = null; st.location = 'studio'; }
    if (advance) goDates();
  }

  async function goDates() {
    if (!st.service) return;
    if (!st.month) st.month = new Date().toISOString().slice(0, 7);
    setStep(2);
    await loadMonth();
  }

  async function loadMonth() {
    st.loading = true; drawCal();
    try { st.days = (await api(`/api/availability?service_id=${st.service}&month=${st.month}`)).days; } catch (e) { st.days = []; }
    st.loading = false; drawCal();
  }

  function step2() {
    const s = svc();
    body.innerHTML = `<h3 class="wz-title">Elige día y hora</h3>
      <p class="muted" style="margin-top:-.6rem">${esc(s.name)} · ${dur(s.duration_min)}</p>
      <div class="dt-grid"><div id="calbox"></div><div id="slotbox"></div></div>
      <div class="wz-nav"><button class="btn btn-ghost" id="back">Atrás</button><button class="btn btn-accent" id="next2" ${st.slot != null ? '' : 'disabled'}>Continuar</button></div>`;
    $('#back').onclick = () => setStep(1);
    $('#next2').onclick = () => setStep(3);
    drawCal(); drawSlots();
  }

  function drawCal() {
    const box = $('#calbox'); if (!box || st.step !== 2) return;
    const [y, m] = st.month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cur = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);
    let cells = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<span class="dw">${d}</span>`).join('');
    cells += '<i></i>'.repeat(lead);
    for (let d = 1; d <= total; d++) {
      const iso = `${st.month}-${pad(d)}`;
      const on = st.days.includes(iso);
      cells += `<button data-d="${iso}" ${on ? '' : 'disabled'} aria-pressed="${iso === st.date}" class="${iso === today ? 'today' : ''}" aria-label="${longDate(iso)}${on ? '' : ' (no disponible)'}">${d}</button>`;
    }
    const maxMonth = new Date(Date.now() + settings.maxDaysAhead * 864e5).toISOString().slice(0, 7);
    box.innerHTML = `<div class="cal-head"><button class="icon-btn" id="prev" aria-label="Mes anterior" ${st.month <= cur ? 'disabled' : ''}>‹</button>
      <b>${first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b>
      <button class="icon-btn" id="nextm" aria-label="Mes siguiente" ${st.month >= maxMonth ? 'disabled' : ''}>›</button></div>
      <div class="cal" style="${st.loading ? 'opacity:.5' : ''}">${cells}</div>
      ${!st.loading && !st.days.length ? '<p class="hint" style="margin-top:1rem">Sin huecos este mes. Prueba con el siguiente.</p>' : ''}`;
    const shift = (n) => { const dt = new Date(Date.UTC(y, m - 1 + n, 1)); st.month = dt.toISOString().slice(0, 7); loadMonth(); };
    $('#prev').onclick = () => shift(-1);
    $('#nextm').onclick = () => shift(1);
    box.querySelector('.cal').onclick = async (e) => {
      const b = e.target.closest('[data-d]'); if (!b || b.disabled) return;
      st.date = b.dataset.d; st.slot = null;
      st.slots = [];
      drawCal(); drawSlots(true);
      try { st.slots = (await api(`/api/availability?service_id=${st.service}&date=${st.date}`)).slots; } catch { st.slots = []; }
      drawSlots();
    };
  }

  function drawSlots(loading) {
    const box = $('#slotbox'); if (!box) return;
    if (!st.date) { box.innerHTML = '<p class="hint">Selecciona un día del calendario para ver las horas libres.</p>'; return; }
    box.innerHTML = `<p class="slots-title">${longDate(st.date)}</p>` + (loading ? '<p class="hint">Buscando huecos…</p>'
      : st.slots.length ? `<div class="slots">${st.slots.map((s) => `<button class="slot" data-t="${s.start_min}" aria-pressed="${s.start_min === st.slot}">${s.label}</button>`).join('')}</div>`
        : '<p class="hint">No quedan horas libres este día.</p>');
    box.onclick = (e) => {
      const b = e.target.closest('.slot'); if (!b) return;
      st.slot = Number(b.dataset.t);
      box.querySelectorAll('.slot').forEach((x) => x.setAttribute('aria-pressed', x === b));
      $('#next2').disabled = false;
    };
  }

  function step3() {
    const s = svc();
    const v = st.form || {};
    body.innerHTML = `<h3 class="wz-title">Tus datos</h3>
      <div class="summary"><b>${esc(s.name)}</b><span>${longDate(st.date)} · ${fm(st.slot)}–${fm(st.slot + s.duration_min)}</span>
        <span>${st.location === 'home' ? 'A domicilio' : 'En el estudio'} · ${s.price_from && s.price_cents ? 'desde ' : ''}${money(s.price_cents)}</span></div>
      ${s.category === 'Micropigmentación' && s.price_cents ? '<p class="note" style="margin:1rem 0 0">Si estás embarazada, en lactancia o tienes alguna condición de piel o de salud, indícalo en las notas: te asesoraremos antes del tratamiento.</p>' : ''}
      <form class="form" id="form" style="margin-top:1.4rem" novalidate>
        <label>Nombre y apellidos<input name="name" autocomplete="name" required maxlength="80" value="${esc(v.name)}"></label>
        <label>Teléfono / WhatsApp<input name="phone" type="tel" autocomplete="tel" required value="${esc(v.phone)}"></label>
        <label class="full">Email<input name="email" type="email" autocomplete="email" required value="${esc(v.email)}"></label>
        ${st.location === 'home' ? `<label class="full">Dirección del servicio<input name="address" autocomplete="street-address" required maxlength="200" value="${esc(v.address)}"></label>` : ''}
        <label class="full">Cuéntanos (ocasión, tipo de piel, referencias…)<textarea name="notes" maxlength="600">${esc(v.notes)}</textarea></label>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="check full"><input type="checkbox" name="consent" required><span>He leído y acepto la <a href="/privacidad" target="_blank">política de privacidad</a>.</span></label>
        ${settings.depositInfo ? `<p class="muted full" style="margin:0;font-size:.9rem">${esc(settings.depositInfo)}</p>` : ''}
        <div id="ferr" class="full" role="alert"></div>
        <div class="wz-nav full"><button type="button" class="btn btn-ghost" id="back">Atrás</button><button class="btn btn-accent" id="send">Solicitar cita</button></div>
      </form>`;
    $('#back').onclick = () => { st.form = formData(); setStep(2); };
    $('#form').onsubmit = submit;
  }
  const formData = () => Object.fromEntries(new FormData($('#form')));

  async function submit(e) {
    e.preventDefault();
    const d = formData();
    st.form = d;
    const btn = $('#send'), err = $('#ferr');
    err.innerHTML = '';
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await api('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, consent: d.consent === 'on', service_id: st.service, date: st.date, start_min: st.slot, location: st.location })
      });
      st.done = r.booking; st.form = null;
      setStep(4);
    } catch (ex) {
      err.innerHTML = `<div class="err">${esc(ex.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Solicitar cita';
      if (/hueco/.test(ex.message)) { st.slot = null; setTimeout(() => { setStep(2); loadMonth(); }, 1500); }
    }
  }

  function step4() {
    const b = st.done;
    const confirmed = b.status === 'confirmed';
    const link = `${location.origin}/cita?t=${b.token}`;
    const wa = settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy ${b.name}. Acabo de reservar ${b.service} el ${longDate(b.date)} a las ${b.start}.`)}` : '';
    body.innerHTML = `<div class="success"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M4 12.5l5 5L20 6.5"/></svg></div>
      <h3 class="wz-title">${confirmed ? '¡Cita confirmada!' : '¡Solicitud recibida!'}</h3>
      <p>${confirmed ? 'Te esperamos. Guarda este enlace para consultar o cancelar tu cita.' : 'Revisaremos tu solicitud y te confirmaremos muy pronto. Guarda este enlace para consultar o cancelar tu cita.'}</p>
      <div class="summary"><b>${esc(b.service)}</b><span>${longDate(b.date)} · ${b.start}–${b.end}</span><span>${b.location === 'home' ? 'A domicilio: ' + esc(b.address) : 'En el estudio'}</span>
        <span><span class="badge ${b.status}">${confirmed ? 'Confirmada' : 'Pendiente de confirmar'}</span></span></div>
      <div class="cta-row" style="justify-content:center">
        <a class="btn btn-accent" href="/api/bookings/${b.token}/ics">Añadir al calendario</a>
        <a class="btn btn-ghost" href="${esc(link)}">Ver / cancelar mi cita</a>
        ${wa ? `<a class="btn btn-ghost" href="${esc(wa)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>` : ''}
      </div></div>`;
    try { localStorage.setItem('lastBooking', b.token); } catch {}
  }

  function start() { render(); }
  return { start, pick };
})();

init().catch((e) => {
  $('#svc-grid').innerHTML = `<p class="err">No se pudo cargar la información. ${esc(e.message)}</p>`;
});
