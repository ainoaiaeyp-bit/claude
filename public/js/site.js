const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (c) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: c % 100 ? 2 : 0 });
const money = (c) => (c ? eur(c) : 'Sin coste');
const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Ha ocurrido un error. Inténtalo de nuevo.');
  return d;
};
const pad = (n) => String(n).padStart(2, '0');
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const fm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const dt = (d) => new Date(d + 'T12:00:00');
const longDate = (d) => dt(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const goTo = (sel) => (window.goTo ? window.goTo(sel) : document.querySelector(sel).scrollIntoView({ behavior: 'smooth' }));

let settings = {}, services = [];
$('#yr').textContent = new Date().getFullYear();

/* CTA fija en móvil */
const sticky = $('.sticky-cta'), bookSec = $('#reservar');
addEventListener('scroll', () => {
  const r = bookSec.getBoundingClientRect();
  sticky.classList.toggle('show', scrollY > 500 && !(r.top < innerHeight && r.bottom > 0));
}, { passive: true });

/* botones "reservar" repartidos por la página */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-book-name],[data-book]'); if (!b) return;
  const svc = b.dataset.book
    ? services.find((x) => x.id === Number(b.dataset.book))
    : services.find((x) => x.name.toLowerCase().includes(b.dataset.bookName.toLowerCase()));
  if (svc) { wizard.pick(svc.id); goTo('#reservar'); }
});

async function init() {
  [settings, services] = await Promise.all([api('/api/settings'), api('/api/services')]);
  renderPrices();
  renderMore();
  renderFooter();
  renderPolicy();
  renderLd();
  renderGallery(await api('/api/gallery').catch(() => []));
  wizard.start();
  leadForm();
  const pre = new URLSearchParams(location.search).get('servicio');
  if (pre && services.some((s) => s.id === Number(pre))) wizard.pick(Number(pre));
}

/* precio y duración dentro de cada tarjeta de técnica */
function renderPrices() {
  document.querySelectorAll('.card [data-book-name]').forEach((btn) => {
    const s = services.find((x) => x.name.toLowerCase().includes(btn.dataset.bookName.toLowerCase()));
    if (!s) return;
    btn.insertAdjacentHTML('beforebegin', `<p class="pr"><b>${s.price_from && s.price_cents ? 'Desde ' : ''}${money(s.price_cents)}</b><span>${dur(s.duration_min)}</span></p>`);
  });
}

/* resto de tratamientos: fichas compactas */
function renderMore() {
  const list = services.filter((s) => s.category !== 'Micropigmentación' || /retoque/i.test(s.name));
  $('#svc-grid').innerHTML = list.map((s) => `
    <button class="tile" data-book="${s.id}">
      <span class="t-cat">${esc(s.category)}</span>
      <span class="t-name">${esc(s.name)}</span>
      <span class="t-meta">${dur(s.duration_min)} · ${s.price_from && s.price_cents ? 'desde ' : ''}${money(s.price_cents)}</span>
      <span class="t-go">Reservar</span>
    </button>`).join('');
}

function renderGallery(list) {
  if (!list.length) return;
  const track = $('#gallery');
  track.insertAdjacentHTML('afterbegin', list.map((u) => `<figure><div class="ph"><img src="${esc(u)}" alt="Trabajo de Noelia Duque" loading="lazy"></div><figcaption><span>Trabajo</span><span></span></figcaption></figure>`).join(''));
  [...track.children].forEach((f, i) => { const n = f.querySelector('figcaption span:last-child'); if (n) n.textContent = pad(i + 1); });
}

function renderFooter() {
  const c = [];
  if (settings.whatsapp) c.push(`<li><a href="https://wa.me/${esc(settings.whatsapp.replace(/\D/g, ''))}" rel="noopener">WhatsApp</a></li>`);
  if (settings.phone) c.push(`<li><a href="tel:${esc(settings.phone.replace(/\s/g, ''))}">${esc(settings.phone)}</a></li>`);
  if (settings.email) c.push(`<li><a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a></li>`);
  if (settings.address) c.push(`<li><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address.replace(/\s*\(.*\)\s*$/, ''))}" target="_blank" rel="noopener">Cómo llegar</a></li>`);
  $('#ft-contact').innerHTML = c.join('') || '<li>Reserva online las 24 h.</li>';
  if (settings.phone) { const a = $('#call'); a.textContent = settings.phone; a.href = `tel:${settings.phone.replace(/\s/g, '')}`; }
  $('#ft-hours').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const r = settings.hours[d] || [];
    return `<li>${DAYS[d]}: ${r.length ? r.map(([a, b]) => `${fm(a)}–${fm(b)}`).join(' · ') : 'Cerrado'}</li>`;
  }).join('');
}

function renderPolicy() {
  const n = settings.minNoticeHours, c = settings.cancelHours;
  $('#book-policy').textContent = (settings.autoConfirm ? 'Tu cita queda confirmada al instante.' : 'Confirmaremos tu cita personalmente.') + (n ? ` Se reserva con al menos ${n} h de antelación.` : '');
  $('#faq-cancel').textContent = `Sí. Desde el enlace de tu cita puedes cancelarla hasta ${c} horas antes. Si necesitas cambiarla, escríbeme y la movemos.`;
}

function renderLd() {
  $('#ld').textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BeautySalon', name: settings.businessName, description: settings.tagline,
    url: location.origin, telephone: settings.phone || undefined, email: settings.email || undefined,
    address: { '@type': 'PostalAddress', streetAddress: settings.address || undefined, addressLocality: settings.city },
    sameAs: settings.instagram ? [settings.instagram] : undefined
  });
}

/* ───── reserva en una sola pantalla ───── */
const wizard = (() => {
  const box = $('#wizard');
  const st = { service: null, location: 'studio', days: [], shown: 8, date: null, slots: [], slot: null, loading: false, seq: 0 };
  const svc = () => services.find((s) => s.id === st.service);

  function start() {
    const groups = [];
    services.forEach((s) => { let g = groups.find((x) => x.n === s.category); if (!g) groups.push((g = { n: s.category, i: [] })); g.i.push(s); });
    box.innerHTML = `
      <section class="bk-block" id="b1">
        <h3 class="bk-h"><span>1</span>Tratamiento</h3>
        <label for="bk-service" class="sr">Tratamiento</label>
        <div class="select"><select id="bk-service"><option value="">Elige un tratamiento</option>
          ${groups.map((g) => `<optgroup label="${esc(g.n)}">${g.i.map((s) => `<option value="${s.id}">${esc(s.name)} · ${dur(s.duration_min)} · ${s.price_from && s.price_cents ? 'desde ' : ''}${money(s.price_cents)}</option>`).join('')}</optgroup>`).join('')}
        </select></div>
        <div id="bk-loc"></div>
        <p class="bk-info" id="bk-info"></p>
      </section>
      <section class="bk-block lock" id="b2">
        <h3 class="bk-h"><span>2</span>Día y hora</h3>
        <div class="days" id="bk-days" role="listbox" aria-label="Días disponibles"></div>
        <button class="link-btn" id="bk-more" hidden>Más fechas</button>
        <div class="slots" id="bk-slots" aria-live="polite"></div>
      </section>
      <section class="bk-block lock" id="b3">
        <h3 class="bk-h"><span>3</span>Tus datos</h3>
        <form class="form" id="bk-form" novalidate>
          <label>Nombre<input id="bk-name" name="name" autocomplete="name" required maxlength="80"></label>
          <label>Teléfono<input id="bk-phone" name="phone" type="tel" autocomplete="tel" required></label>
          <label class="full">Email<input id="bk-email" name="email" type="email" autocomplete="email" required></label>
          <div class="full" id="bk-addr" hidden><label>Dirección del servicio<input id="bk-address" name="address" autocomplete="street-address" maxlength="200"></label></div>
          <label class="full">Notas (opcional)<textarea id="bk-notes" name="notes" maxlength="600" placeholder="Ocasión, tipo de piel, referencias…"></textarea></label>
          <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <label class="check full"><input type="checkbox" id="bk-consent" name="consent" required><span>Acepto la <a href="/privacidad" target="_blank">política de privacidad</a>.</span></label>
          <label class="check full"><input type="checkbox" id="bk-marketing" name="marketing"><span>Quiero recibir novedades y promociones (opcional, puedes darte de baja cuando quieras).</span></label>
          <div id="bk-err" class="full" role="alert"></div>
          <div class="full bk-sum" id="bk-sum"></div>
          <button class="btn full" id="bk-send" type="submit">Solicitar cita</button>
        </form>
      </section>`;
    $('#bk-service').onchange = (e) => pick(Number(e.target.value) || null, false);
    $('#bk-more').onclick = () => { st.shown += 8; drawDays(); };
    $('#bk-days').onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) chooseDay(b.dataset.d); };
    $('#bk-slots').onclick = (e) => {
      const b = e.target.closest('.slot'); if (!b) return;
      st.slot = Number(b.dataset.t);
      box.querySelectorAll('.slot').forEach((x) => x.setAttribute('aria-pressed', x === b));
      $('#b3').classList.remove('lock'); summary();
    };
    $('#bk-form').onsubmit = submit;
  }

  function lock(n, on) { $(`#b${n}`).classList.toggle('lock', on); }

  async function pick(id, syncSelect = true) {
    const sel = $('#bk-service');
    if (!sel) return;
    st.service = id; st.date = null; st.slot = null; st.days = []; st.shown = 8; st.location = 'studio';
    if (syncSelect) sel.value = id || '';
    lock(3, true); lock(2, !id);
    $('#bk-slots').innerHTML = ''; $('#bk-days').innerHTML = ''; $('#bk-more').hidden = true;
    const s = svc();
    $('#bk-info').textContent = s ? s.description : '';
    $('#bk-loc').innerHTML = s && s.allow_home ? `<div class="seg" role="group" aria-label="Lugar">
      <button type="button" class="opt" data-loc="studio" aria-pressed="true"><span><b>En el estudio</b><small>Alcantarilla</small></span></button>
      <button type="button" class="opt" data-loc="home" aria-pressed="false"><span><b>A domicilio</b><small>${esc(settings.homeFeeInfo || 'Suplemento según zona')}</small></span></button></div>` : '';
    $('#bk-loc').onclick = (e) => {
      const b = e.target.closest('[data-loc]'); if (!b) return;
      st.location = b.dataset.loc;
      $('#bk-loc').querySelectorAll('[data-loc]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      $('#bk-addr').hidden = st.location !== 'home'; summary();
    };
    $('#bk-addr').hidden = true;
    if (!s) return;
    const my = ++st.seq;
    $('#bk-days').innerHTML = '<p class="hint">Buscando fechas disponibles…</p>';
    const days = [];
    const d = new Date(); d.setDate(1);
    for (let i = 0; i < 5 && days.length < 40; i++) {
      const m = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      try { days.push(...(await api(`/api/availability?service_id=${id}&month=${m}`)).days); } catch (e) {}
      d.setMonth(d.getMonth() + 1);
    }
    if (my !== st.seq) return;
    st.days = days;
    drawDays();
    if (days.length) chooseDay(days[0]);
  }

  function drawDays() {
    const list = st.days.slice(0, st.shown);
    $('#bk-days').innerHTML = list.length ? list.map((d) => {
      const x = dt(d);
      return `<button type="button" class="day" data-d="${d}" aria-pressed="${d === st.date}"><small>${x.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</small><b>${x.getDate()}</b><small>${x.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</small></button>`;
    }).join('') : '<p class="hint">No hay fechas libres próximamente. Llámanos y lo vemos.</p>';
    $('#bk-more').hidden = st.days.length <= st.shown;
  }

  async function chooseDay(d) {
    st.date = d; st.slot = null; st.slots = [];
    lock(3, true); summary();
    $('#bk-days').querySelectorAll('.day').forEach((x) => x.setAttribute('aria-pressed', x.dataset.d === d));
    $('#bk-slots').innerHTML = '<p class="hint">Buscando horas…</p>';
    try { st.slots = (await api(`/api/availability?service_id=${st.service}&date=${d}`)).slots; } catch (e) { st.slots = []; }
    $('#bk-slots').innerHTML = st.slots.length
      ? `<p class="slots-title">${longDate(d)}</p><div class="slots-grid">${st.slots.map((s, i) => `<button type="button" class="slot" style="--i:${i}" data-t="${s.start_min}" aria-pressed="false">${s.label}</button>`).join('')}</div>`
      : '<p class="hint">No quedan horas libres ese día.</p>';
  }

  function summary() {
    const s = svc();
    $('#bk-sum').textContent = s && st.date && st.slot != null
      ? `${s.name} · ${longDate(st.date)} · ${fm(st.slot)}${st.location === 'home' ? ' · a domicilio' : ''}` : '';
  }

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData($('#bk-form')));
    const btn = $('#bk-send'), err = $('#bk-err');
    err.innerHTML = '';
    if (!st.service || !st.date || st.slot == null) { err.innerHTML = '<div class="err">Elige tratamiento, día y hora.</div>'; return; }
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await api('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, consent: f.consent === 'on', marketing: f.marketing === 'on', service_id: st.service, date: st.date, start_min: st.slot, location: st.location })
      });
      done(r.booking);
    } catch (ex) {
      err.innerHTML = `<div class="err">${esc(ex.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Solicitar cita';
      if (/hueco/.test(ex.message)) chooseDay(st.date);
    }
  }

  function done(b) {
    const ok = b.status === 'confirmed';
    const link = `${location.origin}/cita?t=${b.token}`;
    const wa = settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy ${b.name}. Acabo de reservar ${b.service} el ${longDate(b.date)} a las ${b.start}.`)}` : '';
    box.innerHTML = `<div class="success"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M4 12.5l5 5L20 6.5"/></svg></div>
      <h3 class="wz-title">${ok ? 'Cita confirmada' : 'Solicitud recibida'}</h3>
      <p>${ok ? 'Te esperamos. Guarda este enlace privado para consultar o cancelar tu cita.' : 'Te la confirmaremos personalmente en breve. Guarda este enlace privado para consultar o cancelar tu cita.'}</p>
      <div class="summary"><b>${esc(b.service)}</b><span>${longDate(b.date)} · ${b.start}–${b.end}</span><span>${b.location === 'home' ? 'A domicilio: ' + esc(b.address) : 'En el estudio'}</span>
        <span><span class="badge ${b.status}">${ok ? 'Confirmada' : 'Pendiente de confirmar'}</span></span></div>
      <div class="cta-row"><a class="btn" href="/api/bookings/${b.token}/ics">Añadir al calendario</a><a class="btn btn-ghost" href="${esc(link)}">Ver o cancelar mi cita</a>${wa ? `<a class="btn btn-ghost" href="${esc(wa)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>` : ''}</div></div>`;
  }

  return { start, pick };
})();

init().catch((e) => {
  $('#svc-grid').innerHTML = `<p class="err">No se pudo cargar la información. ${esc(e.message)}</p>`;
});

/* formulario de contacto: crea una ficha y una tarea en el panel */
function leadForm() {
  const box = $('#lead'); if (!box) return;
  box.innerHTML = `<button class="link-btn" id="lead-open" type="button">Prefiero que me escribas tú</button>
    <form class="form lead-form" id="lead-form" hidden novalidate>
      <label>Nombre<input name="name" id="ld-name" autocomplete="name" required maxlength="80"></label>
      <label>Email o teléfono<input name="contact" id="ld-contact" autocomplete="email" required></label>
      <label class="full">¿Qué te gustaría saber?<textarea name="message" id="ld-msg" maxlength="600" placeholder="Precio, duración, si es adecuado para tu piel…"></textarea></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="check full"><input type="checkbox" name="consent" id="ld-consent"><span>Acepto la <a href="/privacidad" target="_blank">política de privacidad</a>.</span></label>
      <div id="ld-err" class="full" role="alert"></div>
      <button class="btn full" id="ld-send" type="submit">Enviar mensaje</button>
    </form>`;
  $('#lead-open').onclick = () => { $('#lead-form').hidden = !$('#lead-form').hidden; };
  $('#lead-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), err = $('#ld-err'), btn = $('#ld-send');
    const isMail = /@/.test(f.contact);
    btn.disabled = true; btn.textContent = 'Enviando…'; err.innerHTML = '';
    try {
      await api('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name, email: isMail ? f.contact : '', phone: isMail ? '' : f.contact, message: f.message, website: f.website, consent: f.consent === 'on', source: 'web' }) });
      box.innerHTML = '<p class="bk-info">Gracias. Te escribiré lo antes posible.</p>';
    } catch (ex) { err.innerHTML = `<div class="err">${esc(ex.message)}</div>`; btn.disabled = false; btn.textContent = 'Enviar mensaje'; }
  };
}
