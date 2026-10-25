/* Ingresos extra: bonos regalo, tienda de cuidados y programa de referidos. */
import { ApiError, addDays, clean, cents, randomHex, EMAIL_RE, nowLocal } from './util.js';
import { getSettings, logInteraction, upsertClient } from './booking.js';

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const pick = (n) => randomHex(n).match(/../g).map((h) => ALPHA[parseInt(h, 16) % ALPHA.length]).join('');
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fmtCode = (c) => { const n = normCode(c); return n.startsWith('NOE') && n.length === 11 ? `NOE-${n.slice(3, 7)}-${n.slice(7)}` : n; };
const addMonths = (d, m) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };

/* ───── bonos regalo ───── */
export function newVoucherCode(store) {
  for (;;) { const c = `NOE-${pick(4)}-${pick(4)}`; if (!store.list('vouchers').some((v) => v.code === c)) return c; }
}

/** Estado real: un bono con saldo pasa a «caducado» al llegar su fecha. */
export const voucherStatus = (v, today) => (v.status === 'activo' && v.expires_at && v.expires_at < today ? 'caducado' : v.status);

export function voucherView(v, today) {
  return { code: v.code, amount_cents: v.amount_cents, balance_cents: v.balance_cents, recipient_name: v.recipient_name, buyer_name: v.buyer_name, message: v.message, status: voucherStatus(v, today), expires_at: v.expires_at };
}

export function createVoucher(store, input, { admin = false, now = new Date(), source = 'web' } = {}) {
  const s = getSettings(store), n = nowLocal(now);
  const amount = cents(input.amount_cents);
  const min = admin ? 100 : Math.max(500, Number(s.voucherMinCents) || 2000);
  if (!Number.isInteger(amount) || amount < min || amount > 100000) throw new ApiError(`El importe debe estar entre ${(min / 100).toFixed(0)} € y 1.000 €.`);
  const buyer_name = clean(input.buyer_name, 80), buyer_email = clean(input.buyer_email, 120).toLowerCase();
  if (!admin && buyer_name.length < 2) throw new ApiError('Indica tu nombre.');
  if (!admin && !EMAIL_RE.test(buyer_email)) throw new ApiError('El email no parece válido.');
  const recipient_email = clean(input.recipient_email, 120).toLowerCase();
  if (recipient_email && !EMAIL_RE.test(recipient_email)) throw new ApiError('El email de quien lo recibe no parece válido.');
  const active = admin && input.paid;
  const v = store.insert('vouchers', {
    code: newVoucherCode(store), amount_cents: amount, balance_cents: amount, status: active ? 'activo' : 'pendiente', source,
    buyer_name, buyer_email, buyer_phone: clean(input.buyer_phone, 24), recipient_name: clean(input.recipient_name, 80), recipient_email,
    message: clean(input.message, 400), paid: !!active, pay_method: active ? clean(input.pay_method, 30) : '', created_at: now.toISOString(),
    paid_at: active ? now.toISOString() : '', expires_at: active ? addMonths(n.date, Number(s.voucherValidMonths) || 12) : '', history: [],
  });
  if (!admin && buyer_email) {
    const c = upsertClient(store, { name: buyer_name, email: buyer_email, phone: clean(input.buyer_phone, 24), source: 'bono', marketing: !!input.marketing }, now);
    logInteraction(store, c.id, 'compra', `Pidió un bono regalo de ${(amount / 100).toFixed(0)} €`, now);
  }
  return v;
}

export function activateVoucher(store, id, { pay_method = '' } = {}, now = new Date()) {
  const v = store.find('vouchers', id);
  if (!v) throw new ApiError('Bono no encontrado.', 404);
  if (v.status !== 'pendiente') throw new ApiError('Este bono ya está activado.', 409);
  const s = getSettings(store);
  return store.update('vouchers', id, { status: 'activo', paid: true, pay_method: clean(pay_method, 30), paid_at: now.toISOString(), expires_at: addMonths(nowLocal(now).date, Number(s.voucherValidMonths) || 12) });
}

export const findVoucher = (store, code) => { const n = normCode(code); return n ? store.list('vouchers').find((v) => normCode(v.code) === n) : undefined; };

/** Descuenta saldo de un bono. Devuelve los céntimos aplicados. */
export function redeemVoucher(store, code, want, { booking_id = null, note = '' } = {}, now = new Date()) {
  const v = findVoucher(store, code);
  if (!v) throw new ApiError('No encontramos ese bono.', 404);
  const st = voucherStatus(v, nowLocal(now).date);
  if (st !== 'activo') throw new ApiError(`El bono no se puede usar: está ${st}.`, 409);
  const use = Math.min(v.balance_cents, Math.max(0, Math.round(want)));
  if (use <= 0) throw new ApiError('No hay nada que descontar.');
  const balance = v.balance_cents - use;
  store.update('vouchers', v.id, { balance_cents: balance, status: balance ? 'activo' : 'canjeado', history: [...(v.history || []), { at: now.toISOString(), delta: -use, booking_id, note: clean(note, 100) }] });
  return { used: use, left: balance, voucher: v };
}

export function adjustVoucher(store, id, { balance_cents, note = '' }, now = new Date()) {
  const v = store.find('vouchers', id);
  if (!v) throw new ApiError('Bono no encontrado.', 404);
  const b = Math.max(0, cents(balance_cents));
  return store.update('vouchers', id, { balance_cents: b, status: b ? (v.status === 'canjeado' ? 'activo' : v.status) : 'canjeado', history: [...(v.history || []), { at: now.toISOString(), delta: b - v.balance_cents, note: clean(note || 'Ajuste manual', 100) }] });
}

export const outstandingVouchers = (store, today) => store.list('vouchers').filter((v) => voucherStatus(v, today) === 'activo').reduce((a, v) => a + v.balance_cents, 0);

/* ───── tienda ───── */
export const productView = (p) => ({ id: p.id, name: p.name, description: p.description, price_cents: p.price_cents, external_url: p.external_url || '', available: !!p.active && (p.stock == null || p.stock > 0) });

export function saveProduct(store, id, b) {
  const name = clean(b.name, 80);
  if (name.length < 2) throw new ApiError('Indica el nombre del producto.');
  const price = cents(b.price_cents);
  if (!(price >= 0)) throw new ApiError('Precio no válido.');
  const stock = b.stock === '' || b.stock == null ? null : Math.max(0, Math.floor(Number(b.stock)));
  const url = clean(b.external_url, 300);
  if (url && !/^https?:\/\//i.test(url)) throw new ApiError('El enlace debe empezar por https://');
  const doc = { name, description: clean(b.description, 400), price_cents: price, vat_rate: Number(b.vat_rate) >= 0 ? Number(b.vat_rate) : 21, stock, active: b.active !== false, external_url: url, sort: Number(b.sort) || 0 };
  return id ? store.update('products', id, doc) : store.insert('products', { ...doc, created_at: new Date().toISOString() });
}

export function createOrder(store, input, now = new Date()) {
  const name = clean(input.name, 80), email = clean(input.email, 120).toLowerCase(), phone = clean(input.phone, 24);
  if (name.length < 2) throw new ApiError('Indica tu nombre.');
  if (!EMAIL_RE.test(email)) throw new ApiError('El email no parece válido.');
  const lines = Array.isArray(input.items) ? input.items : [];
  if (!lines.length) throw new ApiError('Elige al menos un producto.');
  const items = [];
  for (const l of lines) {
    const p = store.find('products', Number(l.product_id)), qty = Math.floor(Number(l.qty));
    if (!p || !p.active || p.external_url) throw new ApiError('Uno de los productos ya no está disponible.');
    if (!(qty >= 1 && qty <= 20)) throw new ApiError('Cantidad no válida.');
    if (p.stock != null && p.stock < qty) throw new ApiError(`Solo quedan ${p.stock} de ${p.name}.`, 409);
    items.push({ product_id: p.id, name: p.name, qty, price_cents: p.price_cents, vat_rate: p.vat_rate });
  }
  for (const it of items) { const p = store.find('products', it.product_id); if (p.stock != null) store.update('products', p.id, { stock: p.stock - it.qty }); }
  const total = items.reduce((a, i) => a + i.price_cents * i.qty, 0);
  const client = upsertClient(store, { name, email, phone, source: 'tienda', marketing: !!input.marketing }, now);
  const o = store.insert('orders', { client_id: client.id, items, total_cents: total, name, email, phone, notes: clean(input.notes, 400), status: 'pendiente', paid_cents: 0, pay_method: '', paid_date: '', token: randomHex(12), created_at: now.toISOString() });
  logInteraction(store, client.id, 'compra', `Pedido de productos: ${items.map((i) => `${i.qty}× ${i.name}`).join(', ')} (${(total / 100).toFixed(2)} €)`, now);
  return o;
}

export function updateOrder(store, id, b, now = new Date()) {
  const o = store.find('orders', id);
  if (!o) throw new ApiError('Pedido no encontrado.', 404);
  const patch = {};
  if (b.status && b.status !== o.status) {
    if (!['pendiente', 'preparado', 'entregado', 'cancelado'].includes(b.status)) throw new ApiError('Estado no válido.');
    if (b.status === 'cancelado' && o.status !== 'cancelado') for (const it of o.items) { const p = store.find('products', it.product_id); if (p && p.stock != null) store.update('products', p.id, { stock: p.stock + it.qty }); }
    if (o.status === 'cancelado' && b.status !== 'cancelado') for (const it of o.items) { const p = store.find('products', it.product_id); if (p && p.stock != null) store.update('products', p.id, { stock: Math.max(0, p.stock - it.qty) }); }
    patch.status = b.status;
  }
  if (b.paid !== undefined) {
    if (b.paid) { patch.paid_cents = o.total_cents; patch.pay_method = clean(b.pay_method, 30) || o.pay_method || 'efectivo'; patch.paid_date = o.paid_date || nowLocal(now).date; }
    else { patch.paid_cents = 0; patch.pay_method = ''; patch.paid_date = ''; }
  }
  return store.update('orders', id, patch);
}

/* ───── referidos ───── */
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6) || 'AMIGA';
export function ensureReferralCode(store, c) {
  if (c.referral_code) return c;
  let code; do { code = slug(String(c.name).split(' ')[0]) + String(10 + (parseInt(randomHex(2), 16) % 90)); } while (store.list('clients').some((x) => x.referral_code === code));
  return store.update('clients', c.id, { referral_code: code });
}
export const findByReferral = (store, code) => { const n = String(code || '').toUpperCase().trim(); return n ? store.list('clients').find((c) => c.referral_code === n) : undefined; };

/** Premia a quien recomendó y a quien llegó recomendada, una sola vez, cuando la cita se realiza. */
export function grantReferralReward(store, booking, now = new Date()) {
  const s = getSettings(store);
  if (!booking.referred_by || booking.referral_rewarded || s.referralOn === false) return null;
  const amount = Number(s.referralRewardCents) || 0;
  if (amount <= 0) return null;
  const referrer = store.find('clients', booking.referred_by), friend = store.find('clients', booking.client_id);
  if (!referrer || !friend) return null;
  const mk = (c, why) => createVoucher(store, { amount_cents: amount, buyer_name: c.name, buyer_email: c.email, recipient_name: c.name, recipient_email: c.email, message: why, paid: true, pay_method: 'regalo' }, { admin: true, now, source: 'referido' });
  const v1 = mk(referrer, `Gracias por recomendar a ${friend.name.split(' ')[0]}.`), v2 = mk(friend, `Tu regalo por llegar recomendada por ${referrer.name.split(' ')[0]}.`);
  store.update('bookings', booking.id, { referral_rewarded: true });
  logInteraction(store, referrer.id, 'referido', `Recomendó a ${friend.name}: bono ${v1.code} de ${(amount / 100).toFixed(0)} €`, now);
  logInteraction(store, friend.id, 'referido', `Llegó recomendada por ${referrer.name}: bono ${v2.code} de ${(amount / 100).toFixed(0)} €`, now);
  return { referrer, friend, vouchers: [v1, v2], amount };
}
