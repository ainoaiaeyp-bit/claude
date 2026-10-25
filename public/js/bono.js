const box = document.getElementById('box');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (c) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: c % 100 ? 2 : 0 });
const code = new URLSearchParams(location.search).get('c') || '';
const LABEL = { pendiente: 'Pendiente de pago', activo: 'Activo', canjeado: 'Canjeado', caducado: 'Caducado', cancelado: 'Cancelado' };
(async () => {
  const r = await fetch(`/api/vouchers/${encodeURIComponent(code)}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { box.innerHTML = `<h1 class="wz-title">No encontramos este bono</h1><p class="muted">Revisa el enlace o escríbenos.</p><p><a class="btn" href="/">Ir a la web</a></p>`; return; }
  const v = d.voucher, exp = v.expires_at ? new Date(v.expires_at + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  box.innerHTML = `<div class="gift-card big"><span>Bono regalo</span><b>${eur(v.balance_cents)}</b><em>${v.recipient_name ? 'Para ' + esc(v.recipient_name) : 'Para ti'}</em><i>${esc(d.studio.name)}</i></div>
    ${v.message ? `<p class="bono-msg">“${esc(v.message)}”${v.buyer_name ? `<br><small>— ${esc(v.buyer_name)}</small>` : ''}</p>` : ''}
    <dl class="bono-kv"><dt>Código</dt><dd class="mono">${esc(v.code)}</dd><dt>Estado</dt><dd>${LABEL[v.status] || esc(v.status)}</dd><dt>Importe</dt><dd>${eur(v.amount_cents)}${v.balance_cents !== v.amount_cents ? ` · quedan ${eur(v.balance_cents)}` : ''}</dd>${exp ? `<dt>Caduca</dt><dd>${exp}</dd>` : ''}</dl>
    <p class="muted">Reserva tu cita en la web y dile el código a Noelia al pagar. ${d.studio.address ? esc(d.studio.address) + '.' : ''}</p>
    <div class="cta-row"><a class="btn" href="/#reservar">Reservar cita</a><button class="btn btn-ghost" onclick="window.print()">Imprimir</button></div>`;
})();
