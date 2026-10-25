const box = document.getElementById('box');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = new URLSearchParams(location.search).get('t') || '';
const longDate = (d) => { const t = new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1); };
const LABEL = { pending: 'Pendiente de confirmar', proposed: 'Te proponemos otra hora', confirmed: 'Confirmada', cancelled: 'Cancelada', done: 'Realizada', no_show: 'No asistió' };

async function load() {
  const r = await fetch(`/api/bookings/${encodeURIComponent(token)}`);
  const d = await r.json();
  if (!r.ok) { box.innerHTML = `<div class="err">${esc(d.error || 'No encontramos esta cita.')}</div><p style="margin-top:1rem"><a href="/">Volver a la web</a></p>`; return; }
  const b = d.booking;
  box.innerHTML = `<h1 class="wz-title">Hola, ${esc(b.name.split(' ')[0])}</h1>
    <div class="summary"><b>${esc(b.service)}</b><span>${longDate(b.date)}</span><span>${b.start}–${b.end} · ${b.location === 'home' ? 'A domicilio: ' + esc(b.address) : 'En el estudio'}</span>
    <span><span class="badge ${esc(b.status)}">${LABEL[b.status] || esc(b.status)}</span></span></div>
    ${b.proposal ? `<div class="summary" style="margin-top:1rem"><b>Nueva hora propuesta</b><span>Pediste el <span>${longDate(b.proposal.prev_date)}</span> a las ${b.proposal.prev_start}. Te proponemos la fecha de arriba.</span>${b.proposal.message ? `<span>“${esc(b.proposal.message)}”</span>` : ''}</div>
      <div class="cta-row" style="margin:1rem 0"><button class="btn" id="accept">Aceptar la nueva hora</button><button class="btn btn-ghost" id="decline">No me viene bien</button></div>` : ''}
    <div class="cta-row" style="margin-bottom:0">
      ${['pending', 'proposed', 'confirmed'].includes(b.status) ? `<a class="btn btn-ghost" href="/api/bookings/${esc(b.token)}/ics">Añadir al calendario</a>` : ''}
      ${d.can_cancel ? '<button class="btn" id="cancel" style="background:var(--bad);border-color:var(--bad);color:var(--surface)">Cancelar cita</button>' : ''}
      <a class="btn btn-ghost" href="/">Volver</a>
    </div>
    ${!d.can_cancel && ['pending', 'confirmed'].includes(b.status) ? '<p class="muted" style="font-size:.9rem;margin-top:1rem">Para cambios o cancelaciones con poca antelación, contacta directamente con nosotras.</p>' : ''}
    <div id="msg"></div>`;
  const answer = async (what, ask) => {
    if (ask && !confirm(ask)) return;
    const r2 = await fetch(`/api/bookings/${encodeURIComponent(token)}/${what}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d2 = await r2.json();
    if (!r2.ok) { document.getElementById('msg').innerHTML = `<div class="err" style="margin-top:1rem">${esc(d2.error)}</div>`; return; }
    load();
  };
  document.getElementById('accept')?.addEventListener('click', () => answer('accept'));
  document.getElementById('decline')?.addEventListener('click', () => answer('decline', 'Si no te viene bien, la solicitud se cancelará y podrás elegir otro día en la web. ¿Seguro?'));
  document.getElementById('cancel')?.addEventListener('click', async () => {
    if (!confirm('¿Seguro que quieres cancelar tu cita?')) return;
    const r2 = await fetch(`/api/bookings/${encodeURIComponent(token)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d2 = await r2.json();
    if (!r2.ok) { document.getElementById('msg').innerHTML = `<div class="err" style="margin-top:1rem">${esc(d2.error)}</div>`; return; }
    load();
  });
}
load();
