/* Bonos regalo, tienda de cuidados y referidos: ingresos extra del estudio. */
import { $, $$, api, esc, eur, eur0, dateShort, dateTime, badge, openDialog, confirmBox, toast, guard, empty } from './core.js';

let tab = 'bonos';
const num = (v) => Math.round((parseFloat(String(v).replace(',', '.')) || 0) * 100);
const VST = { pendiente: ['warn', 'Pendiente de pago'], activo: ['ok', 'Activo'], canjeado: ['neutral', 'Canjeado'], caducado: ['bad', 'Caducado'], cancelado: ['bad', 'Cancelado'] };
const OST = { pendiente: ['warn', 'Reservado'], preparado: ['info', 'Preparado'], entregado: ['ok', 'Entregado'], cancelado: ['bad', 'Cancelado'] };
const METHODS = ['bizum', 'efectivo', 'tarjeta', 'transferencia'];

export async function render(el, ctx) {
  const redraw = () => { render(el, ctx); ctx.refreshCounts(); };
  const [vs, products, orders, refs, settings] = await Promise.all([api('/api/admin/vouchers'), api('/api/admin/products'), api('/api/admin/orders'), api('/api/admin/referrals'), api('/api/admin/settings')]);
  const pendV = vs.vouchers.filter((v) => v.status === 'pendiente').length, pendO = orders.filter((o) => o.status === 'pendiente' || o.status === 'preparado').length;
  el.innerHTML = `
    <div class="top"><div><h2>Bonos y tienda</h2><p class="sub">Ingresos extra que no dependen de tener la silla ocupada: bonos regalo, productos de cuidados y recomendaciones de clientas.</p></div></div>
    <div class="tabs" id="tabs">${[['bonos', `Bonos regalo${pendV ? ` · ${pendV}` : ''}`], ['productos', 'Productos'], ['pedidos', `Pedidos${pendO ? ` · ${pendO}` : ''}`], ['referidos', 'Referidos'], ['ajustes', 'Ajustes']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="tab"></div>`;
  $$('#tabs [data-t]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; redraw(); }));
  const t = $('#tab', el);
  ({ bonos: () => bonos(t, vs, settings, redraw), productos: () => productos(t, products, redraw), pedidos: () => pedidos(t, orders, redraw), referidos: () => referidos(t, refs, settings, redraw), ajustes: () => ajustes(t, settings, redraw) })[tab]();
}

/* ───── bonos ───── */
function bonos(t, vs, settings, redraw) {
  const act = vs.vouchers.filter((v) => v.status === 'activo');
  t.innerHTML = `
    <div class="kpis"><div class="kpi ${vs.outstanding ? 'warn' : ''}"><b>${eur0(vs.outstanding)}</b><span>Saldo por canjear</span><small>${act.length} bonos activos</small></div>
      <div class="kpi"><b>${vs.vouchers.filter((v) => v.status === 'pendiente').length}</b><span>Pendientes de pago</span></div>
      <div class="kpi"><b>${eur0(vs.vouchers.filter((v) => v.paid).reduce((a, v) => a + v.amount_cents, 0))}</b><span>Vendidos en total</span></div></div>
    <p class="muted small" style="margin-bottom:1rem">El dinero de un bono cuenta como ingreso cuando se canjea en una cita, no cuando se vende. Para el tratamiento fiscal exacto, consúltalo con tu asesoría.</p>
    <div class="between" style="margin-bottom:.8rem"><h3>Bonos</h3><button class="btn sm" id="new">+ Vender un bono</button></div>
    ${vs.vouchers.length ? `<div class="table-wrap"><table><thead><tr><th>Código</th><th>Para</th><th class="r">Importe</th><th class="r">Saldo</th><th>Estado</th><th>Caduca</th><th></th></tr></thead><tbody>${vs.vouchers.map((v) => `<tr data-v="${v.id}" class="click"><td><b class="mono">${esc(v.code)}</b></td><td>${esc(v.recipient_name || v.buyer_name || '—')}${v.source === 'referido' ? ' <span class="tag">referido</span>' : ''}</td><td class="num">${eur(v.amount_cents)}</td><td class="num">${eur(v.balance_cents)}</td><td>${badge(...VST[v.status] || ['neutral', v.status])}</td><td>${v.expires_at ? dateShort(v.expires_at) : '—'}</td><td class="r">${v.status === 'pendiente' ? `<button class="btn sm ok" data-act="${v.id}">Cobrado</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('Todavía no hay bonos', 'Cuando alguien compre uno en la web, o tú vendas uno aquí, aparecerá en esta lista.')}`;
  $('#new', t).onclick = () => voucherDialog(settings, redraw);
  $$('[data-act]', t).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); activate(vs.vouchers.find((x) => x.id === Number(b.dataset.act)), vs, redraw); }));
  $$('[data-v]', t).forEach((r) => (r.onclick = () => voucherDetail(vs.vouchers.find((x) => x.id === Number(r.dataset.v)), vs, redraw)));
}

function activate(v, vs, redraw) {
  openDialog(`<h3>Confirmar pago del bono</h3><p class="muted">${esc(v.code)} · ${eur(v.amount_cents)} · ${esc(v.buyer_name)}. Al activarlo, ${v.recipient_email || v.buyer_email ? 'se envía por email a ' + esc(v.recipient_email || v.buyer_email) : 'queda listo para entregarlo'}.</p>
    <label>Cómo se pagó<select name="pay_method">${METHODS.map((m) => `<option>${m}</option>`).join('')}</select></label>`,
    async (f) => { await api(`/api/admin/vouchers/${v.id}`, { method: 'PATCH', body: { action: 'activate', pay_method: f.pay_method } }); toast('Bono activado'); redraw(); }, { submit: 'Activar bono' });
}

function voucherDetail(v, vs, redraw) {
  const link = `${location.origin}/bono?c=${v.code}`;
  const f = openDialog(`<h3>${esc(v.code)}</h3><div class="row">${badge(...VST[v.status] || ['neutral', v.status])}<span class="muted small">${eur(v.balance_cents)} de ${eur(v.amount_cents)}</span></div>
    <dl class="kv"><dt>Comprado por</dt><dd>${esc(v.buyer_name || '—')} ${esc(v.buyer_email || '')}</dd><dt>Para</dt><dd>${esc(v.recipient_name || '—')} ${esc(v.recipient_email || '')}</dd><dt>Mensaje</dt><dd>${esc(v.message || '—')}</dd><dt>Pago</dt><dd>${v.paid ? esc(v.pay_method || 'cobrado') + ' · ' + dateShort((v.paid_at || '').slice(0, 10)) : 'Pendiente'}</dd><dt>Caduca</dt><dd>${v.expires_at ? dateShort(v.expires_at) : '—'}</dd><dt>Enlace</dt><dd class="small" style="word-break:break-all">${esc(link)}</dd></dl>
    ${(v.history || []).length ? `<h4>Movimientos</h4><div class="small">${v.history.map((h) => `<div class="between" style="padding:.3rem 0;border-bottom:1px solid var(--line)"><span>${dateTime(h.at)} · ${esc(h.note || '')}</span><b class="mono">${h.delta > 0 ? '+' : ''}${eur(h.delta)}</b></div>`).join('')}</div>` : ''}
    <div class="row" id="va">${v.status === 'pendiente' ? '<button type="button" class="btn sm ok" data-a="activate">Marcar como cobrado</button>' : ''}${v.status === 'activo' ? '<button type="button" class="btn sm ghost" data-a="resend">Reenviar por email</button><button type="button" class="btn sm ghost" data-a="adjust">Ajustar saldo</button>' : ''}<button type="button" class="btn sm ghost" data-a="copy">Copiar enlace</button>${['pendiente', 'activo'].includes(v.status) ? '<button type="button" class="btn sm danger" data-a="cancel">Cancelar bono</button>' : ''}</div>`, async () => {}, { submit: '' });
  const run = guard(async (a) => {
    if (a === 'copy') { try { await navigator.clipboard.writeText(link); toast('Enlace copiado'); } catch { toast(link); } return; }
    if (a === 'activate') { document.querySelector('#dlg').close(); return activate(v, vs, redraw); }
    if (a === 'adjust') { document.querySelector('#dlg').close(); return openDialog(`<h3>Ajustar saldo</h3><label>Nuevo saldo (€)<input name="b" inputmode="decimal" value="${(v.balance_cents / 100).toFixed(2)}"></label><label>Motivo<input name="n" placeholder="Corrección, regalo extra…"></label>`, async (x) => { await api(`/api/admin/vouchers/${v.id}`, { method: 'PATCH', body: { action: 'adjust', balance_cents: num(x.b), note: x.n } }); toast('Saldo ajustado'); redraw(); }, { submit: 'Guardar' }); }
    if (a === 'cancel') { document.querySelector('#dlg').close(); return confirmBox('¿Cancelar el bono?', 'Dejará de poder usarse. No devuelve el dinero automáticamente.', async () => { await api(`/api/admin/vouchers/${v.id}`, { method: 'PATCH', body: { action: 'cancel' } }); toast('Bono cancelado'); redraw(); }, { label: 'Cancelar bono' }); }
    if (a === 'resend') { await api(`/api/admin/vouchers/${v.id}`, { method: 'PATCH', body: { action: 'resend' } }); toast(vs.mail ? 'Enviado' : 'Email preparado en Automatizaciones'); redraw(); }
  });
  $$('#va [data-a]', f).forEach((b) => (b.onclick = () => run(b.dataset.a)));
}

function voucherDialog(settings, redraw) {
  const f = openDialog(`<h3>Vender un bono</h3>
    <div><label>Importe</label><div class="chips" id="amt" style="margin-top:.4rem">${[30, 50, 100, 150, 200].map((n) => `<button type="button" class="chip" data-n="${n}">${n} €</button>`).join('')}</div></div>
    <div class="grid2"><label>Importe (€)<input name="amount" inputmode="decimal" required value="50"></label><label>Cómo paga<select name="pay_method">${METHODS.map((m) => `<option>${m}</option>`).join('')}</select></label>
    <label>Quién lo compra<input name="buyer_name" required></label><label>Email de quien compra<input type="email" name="buyer_email"></label>
    <label>Para quién<input name="recipient_name"></label><label>Email de quien lo recibe<input type="email" name="recipient_email"></label></div>
    <label>Mensaje (opcional)<textarea name="message" rows="2" placeholder="Feliz cumpleaños…"></textarea></label>
    <label class="check"><input type="checkbox" name="paid" checked> Ya está cobrado (activarlo ahora)</label><label class="check"><input type="checkbox" name="send" checked> Enviarlo por email si hay dirección</label>`,
    async (v) => { await api('/api/admin/vouchers', { method: 'POST', body: { amount_cents: num(v.amount), buyer_name: v.buyer_name, buyer_email: v.buyer_email, recipient_name: v.recipient_name, recipient_email: v.recipient_email, message: v.message, paid: v.paid, pay_method: v.pay_method, send: v.send } }); toast('Bono creado'); redraw(); }, { submit: 'Crear bono' });
  $$('#amt [data-n]', f).forEach((b) => (b.onclick = () => { f.elements.amount.value = b.dataset.n; }));
}

/* ───── productos ───── */
function productos(t, products, redraw) {
  t.innerHTML = `<div class="between" style="margin-bottom:.8rem"><div><h3>Productos</h3><p class="muted small">Se muestran en la web para reservar y recoger en el estudio. Si pones un enlace externo, el botón lleva a esa tienda (afiliación) y no se gestiona aquí.</p></div><button class="btn sm" id="new">+ Producto</button></div>
    ${products.length ? `<div class="table-wrap"><table><thead><tr><th>Producto</th><th class="r">Precio</th><th>Stock</th><th>Estado</th></tr></thead><tbody>${products.map((p) => `<tr class="click" data-p="${p.id}"><td><b>${esc(p.name)}</b><div class="muted small">${esc(p.description)}</div></td><td class="num">${eur(p.price_cents)}</td><td>${p.external_url ? 'Enlace externo' : p.stock == null ? 'Sin límite' : p.stock}</td><td>${p.active ? badge('ok', 'Visible') : badge('neutral', 'Oculto')}</td></tr>`).join('')}</tbody></table></div>` : empty('Sin productos', 'Añade tu primer producto de cuidados.')}`;
  $('#new', t).onclick = () => productDialog(null, redraw);
  $$('[data-p]', t).forEach((r) => (r.onclick = () => productDialog(products.find((x) => x.id === Number(r.dataset.p)), redraw)));
}
function productDialog(p, redraw) {
  p = p || { name: '', description: '', price_cents: 0, vat_rate: 21, stock: null, active: true, external_url: '' };
  const f = openDialog(`<h3>${p.id ? 'Producto' : 'Nuevo producto'}</h3>
    <label>Nombre<input name="name" required value="${esc(p.name)}"></label><label>Descripción<textarea name="description" rows="2">${esc(p.description)}</textarea></label>
    <div class="grid3"><label>Precio con IVA (€)<input name="price" inputmode="decimal" value="${(p.price_cents / 100).toFixed(2)}"></label><label>IVA %<select name="vat_rate">${[21, 10, 4, 0].map((r) => `<option ${r === p.vat_rate ? 'selected' : ''}>${r}</option>`).join('')}</select></label><label>Stock (vacío = sin límite)<input name="stock" type="number" min="0" value="${p.stock ?? ''}"></label></div>
    <label>Enlace de afiliación (opcional)<input name="external_url" placeholder="https://" value="${esc(p.external_url || '')}"></label>
    <label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Visible en la web</label>`,
    async (v) => { const body = { name: v.name, description: v.description, price_cents: num(v.price), vat_rate: Number(v.vat_rate), stock: v.stock, external_url: v.external_url, active: v.active }; if (p.id) await api(`/api/admin/products/${p.id}`, { method: 'PUT', body }); else await api('/api/admin/products', { method: 'POST', body }); toast('Producto guardado'); redraw(); }, { submit: 'Guardar' });
  if (p.id) { const del = document.createElement('button'); del.type = 'button'; del.className = 'btn danger'; del.textContent = 'Eliminar'; del.style.marginRight = 'auto'; del.onclick = () => confirmBox('¿Eliminar el producto?', 'Si ya tiene pedidos, se oculta en lugar de borrarse.', async () => { await api(`/api/admin/products/${p.id}`, { method: 'DELETE' }); toast('Producto eliminado'); redraw(); }, { label: 'Eliminar' }); $('.dlg-actions', f).prepend(del); }
}

/* ───── pedidos ───── */
function pedidos(t, orders, redraw) {
  t.innerHTML = `<h3 style="margin-bottom:.8rem">Pedidos</h3>${orders.length ? orders.map((o) => `<div class="card" style="margin-bottom:.6rem"><div class="between"><div><b>${esc(o.name)}</b> ${badge(...OST[o.status])} ${o.paid_cents ? badge('ok', 'Cobrado') : badge('warn', 'Sin cobrar')}<div class="muted small">${esc(o.email)}${o.phone ? ' · ' + esc(o.phone) : ''} · ${dateTime(o.created_at)}</div></div><b class="mono">${eur(o.total_cents)}</b></div>
      <p class="small" style="margin:.5rem 0">${o.items.map((i) => `${i.qty}× ${esc(i.name)}`).join(' · ')}${o.notes ? ` · “${esc(o.notes)}”` : ''}</p>
      <div class="row">${o.status === 'pendiente' ? `<button class="btn sm ghost" data-s="${o.id}:preparado">Preparado</button>` : ''}${!o.paid_cents && o.status !== 'cancelado' ? `<button class="btn sm ok" data-pay="${o.id}">Cobrado y entregado</button>` : ''}${o.status === 'preparado' && o.paid_cents ? `<button class="btn sm" data-s="${o.id}:entregado">Entregado</button>` : ''}${o.status !== 'cancelado' && o.status !== 'entregado' ? `<button class="btn sm danger" data-s="${o.id}:cancelado">Cancelar</button>` : ''}</div></div>`).join('') : empty('Sin pedidos', 'Los pedidos de la web aparecerán aquí para que los prepares.')}`;
  $$('[data-s]', t).forEach((b) => (b.onclick = guard(async () => { const [id, status] = b.dataset.s.split(':'); await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status } }); toast('Pedido actualizado'); redraw(); })));
  $$('[data-pay]', t).forEach((b) => (b.onclick = () => openDialog(`<h3>Cobrar pedido</h3><label>Cómo se pagó<select name="m">${METHODS.map((m) => `<option>${m}</option>`).join('')}</select></label>`, async (v) => { await api(`/api/admin/orders/${b.dataset.pay}`, { method: 'PATCH', body: { paid: true, pay_method: v.m, status: 'entregado' } }); toast('Cobrado. Cuenta como ingreso en Resultados.'); redraw(); }, { submit: 'Registrar cobro' })));
}

/* ───── referidos ───── */
function referidos(t, refs, settings, redraw) {
  t.innerHTML = `<div class="card" style="margin-bottom:1rem"><div class="between"><div><h3>Programa «trae a una amiga»</h3><p class="muted small">Cuando una clienta nueva reserva con el código de otra y termina su primera cita, las dos reciben un bono de <b>${eur0(refs.reward_cents)}</b>. Cada clienta tiene su código y enlace en su ficha.</p></div>${refs.on ? badge('ok', 'Activo') : badge('neutral', 'Desactivado')}</div><p class="small muted" style="margin-top:.6rem">Para activar el email que invita a compartir, ve a Automatizaciones («Comparte tu regalo con una amiga»). Importe y activación, en la pestaña Ajustes.</p></div>
    <h3 style="margin-bottom:.8rem">Quién recomienda (${refs.total} ${refs.total === 1 ? 'amiga' : 'amigas'})</h3>
    ${refs.referrers.length ? refs.referrers.map((r) => `<div class="card" style="margin-bottom:.6rem"><div class="between"><a class="link" href="#clientas.${r.client_id}"><b>${esc(r.name)}</b></a><span class="tag">${esc(r.code)}</span></div>${r.friends.map((f) => `<div class="between small" style="padding:.35rem 0;border-top:1px solid var(--line)"><span>${esc(f.name)} · ${dateShort(f.date)}</span>${f.rewarded ? badge('ok', 'Premiadas') : badge('warn', 'Pendiente de su 1.ª cita')}</div>`).join('')}</div>`).join('') : empty('Aún no hay recomendaciones', 'Comparte el enlace de cada clienta desde su ficha, o activa el email de invitación.')}`;
}

/* ───── ajustes ───── */
function ajustes(t, s, redraw) {
  t.innerHTML = `<form class="stack" id="f"><div class="card stack"><h3>Bonos regalo</h3><div class="grid3"><label>Importe mínimo (€)<input name="vmin" inputmode="decimal" value="${(s.voucherMinCents / 100).toFixed(0)}"></label><label>Validez (meses)<input type="number" name="vmonths" min="1" max="36" value="${s.voucherValidMonths}"></label></div>
      <label>Cómo se paga (se muestra al comprar)<textarea name="vpay" rows="2">${esc(s.voucherPaymentInfo || '')}</textarea></label></div>
    <div class="card stack"><h3>Tienda</h3><label>Cómo se recoge y se paga<textarea name="spay" rows="2">${esc(s.shopPaymentInfo || '')}</textarea></label></div>
    <div class="card stack"><h3>Referidos</h3><label class="check"><input type="checkbox" name="ron" ${s.referralOn !== false ? 'checked' : ''}> Programa activo</label><label>Regalo para cada una (€)<input name="rrew" inputmode="decimal" value="${((s.referralRewardCents || 0) / 100).toFixed(0)}"></label></div>
    <div><button class="btn">Guardar ajustes</button></div></form>`;
  $('#f', t).onsubmit = guard(async (e) => {
    e.preventDefault(); const x = e.target.elements;
    await api('/api/admin/settings', { method: 'PUT', body: { voucherMinCents: num(x.vmin.value), voucherValidMonths: Number(x.vmonths.value), voucherPaymentInfo: x.vpay.value, shopPaymentInfo: x.spay.value, referralOn: x.ron.checked, referralRewardCents: num(x.rrew.value) } });
    toast('Ajustes guardados'); redraw();
  });
}
