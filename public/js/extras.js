/* Web pública: bonos regalo y tienda de cuidados. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (c) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: c % 100 ? 2 : 0 });
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Ha ocurrido un error. Inténtalo de nuevo.');
  return d;
};
const post = (url, body) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/* ───── bonos regalo ───── */
async function gift() {
  const box = $('#gift'); if (!box) return;
  const s = await api('/api/settings').catch(() => null); if (!s) return;
  const min = Math.round((s.voucherMinCents || 2000) / 100), presets = [30, 50, 100, 150].filter((n) => n >= min);
  let amount = presets.includes(50) ? 50 : presets[0] || min;
  box.innerHTML = `<form class="form" id="gift-form" novalidate>
      <div class="full"><span class="lbl">Importe</span><div class="amts" id="amts">${presets.map((n) => `<button type="button" class="amt" data-n="${n}">${n} €</button>`).join('')}<label class="amt-other">Otro<input id="amt-custom" inputmode="numeric" placeholder="${min}+" aria-label="Otro importe en euros"></label></div></div>
      <label>Tu nombre<input name="buyer_name" autocomplete="name" required maxlength="80"></label>
      <label>Tu email<input name="buyer_email" type="email" autocomplete="email" required></label>
      <label>Para quién es<input name="recipient_name" id="g-to" maxlength="80" placeholder="Su nombre"></label>
      <label>Su email (opcional)<input name="recipient_email" type="email" placeholder="Para enviárselo directamente"></label>
      <label class="full">Mensaje (opcional)<textarea name="message" maxlength="400" placeholder="Feliz cumpleaños, te mereces un rato para ti…"></textarea></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="check full"><input type="checkbox" name="consent" required><span>Acepto la <a href="/privacidad" target="_blank">política de privacidad</a>.</span></label>
      <div id="g-err" class="full" role="alert"></div>
      <button class="btn full" id="g-send" type="submit">Pedir bono regalo</button>
      <p class="full small-note">Pagas por Bizum o transferencia y, al recibirlo, activo el bono y se lo envío. Válido ${s.voucherValidMonths || 12} meses.</p>
    </form>`;
  const sync = () => {
    box.querySelectorAll('.amt').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) === amount));
    $('#gc-amt').textContent = eur(amount * 100);
  };
  box.querySelectorAll('.amt').forEach((b) => (b.onclick = () => { amount = Number(b.dataset.n); $('#amt-custom').value = ''; sync(); }));
  $('#amt-custom').oninput = (e) => { const n = parseInt(e.target.value, 10); if (n >= min && n <= 1000) { amount = n; sync(); box.querySelectorAll('.amt').forEach((b) => b.classList.remove('on')); } };
  $('#g-to').oninput = (e) => { $('#gc-to').textContent = e.target.value.trim() ? `Para ${e.target.value.trim()}` : 'Para ti'; };
  sync();
  $('#gift-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), err = $('#g-err'), btn = $('#g-send');
    btn.disabled = true; btn.textContent = 'Enviando…'; err.innerHTML = '';
    try {
      const r = await post('/api/vouchers', { ...f, amount_cents: amount * 100, consent: f.consent === 'on' });
      box.innerHTML = `<div class="success"><h3 class="wz-title">Casi está</h3><p>Tu bono de <b>${eur(r.voucher.amount_cents)}</b> está reservado con el código <b class="mono">${esc(r.voucher.code)}</b>.</p>
        <div class="summary"><b>Falta el pago</b><span>${esc(r.payment_info || '')}</span><span>Te he enviado estas instrucciones por email.</span></div>
        <div class="cta-row"><a class="btn" href="/bono?c=${encodeURIComponent(r.voucher.code)}">Ver el bono</a></div></div>`;
    } catch (ex) { err.innerHTML = `<div class="err">${esc(ex.message)}</div>`; btn.disabled = false; btn.textContent = 'Pedir bono regalo'; }
  };
}

/* ───── tienda de cuidados ───── */
async function shop() {
  const sec = $('#cuidados'), box = $('#shop'); if (!sec) return;
  const products = await api('/api/products').catch(() => []);
  if (!products.length) return;
  sec.hidden = false;
  const qty = {};
  const total = () => products.reduce((a, p) => a + (qty[p.id] || 0) * p.price_cents, 0);
  box.innerHTML = `<div class="prods">${products.map((p) => `<article class="prod" data-id="${p.id}"><div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p></div>
      <div class="prod-f"><b>${eur(p.price_cents)}</b>${p.external_url ? `<a class="btn btn-ghost" href="${esc(p.external_url)}" target="_blank" rel="noopener sponsored">Ver en tienda</a>` : p.available ? `<div class="step" role="group" aria-label="Cantidad de ${esc(p.name)}"><button type="button" data-d="-1" aria-label="Quitar uno">−</button><output>0</output><button type="button" data-d="1" aria-label="Añadir uno">+</button></div>` : '<span class="small-note">Agotado</span>'}</div></article>`).join('')}</div>
    <div class="cart" id="cart" hidden><span id="cart-t"></span><button class="btn" id="cart-go" type="button">Reservar mi pedido</button></div>
    <form class="form order" id="order-form" hidden novalidate>
      <label>Nombre<input name="name" autocomplete="name" required maxlength="80"></label><label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label class="full">Teléfono (opcional)<input name="phone" type="tel" autocomplete="tel"></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="check full"><input type="checkbox" name="consent" required><span>Acepto la <a href="/privacidad" target="_blank">política de privacidad</a>.</span></label>
      <div id="o-err" class="full" role="alert"></div><button class="btn full" id="o-send" type="submit">Confirmar reserva</button></form>`;
  const refresh = () => {
    const t = total(), n = Object.values(qty).reduce((a, b) => a + b, 0);
    $('#cart').hidden = !n; $('#cart-t').textContent = `${n} ${n === 1 ? 'producto' : 'productos'} · ${eur(t)}`;
    if (!n) $('#order-form').hidden = true;
  };
  box.querySelectorAll('.prod').forEach((el) => {
    const id = Number(el.dataset.id);
    el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { qty[id] = Math.min(9, Math.max(0, (qty[id] || 0) + Number(b.dataset.d))); el.querySelector('output').textContent = qty[id]; refresh(); }));
  });
  $('#cart-go').onclick = () => { $('#order-form').hidden = false; $('#order-form').querySelector('input').focus({ preventScroll: false }); };
  $('#order-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), err = $('#o-err'), btn = $('#o-send');
    btn.disabled = true; btn.textContent = 'Enviando…'; err.innerHTML = '';
    try {
      const r = await post('/api/orders', { ...f, consent: f.consent === 'on', items: Object.entries(qty).filter(([, q]) => q > 0).map(([product_id, q]) => ({ product_id: Number(product_id), qty: q })) });
      box.innerHTML = `<div class="success"><h3 class="wz-title">Pedido reservado</h3><p>${r.order.items.map((i) => `${i.qty}× ${esc(i.name)}`).join(' · ')} — <b>${eur(r.order.total_cents)}</b></p><div class="summary"><span>${esc(r.payment_info || '')}</span></div></div>`;
    } catch (ex) { err.innerHTML = `<div class="err">${esc(ex.message)}</div>`; btn.disabled = false; btn.textContent = 'Confirmar reserva'; }
  };
}

gift(); shop();
