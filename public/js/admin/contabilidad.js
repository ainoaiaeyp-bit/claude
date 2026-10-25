import { $, $$, api, qs, esc, eur, eur0, dateShort, today, badge, openDialog, confirmBox, toast, guard, empty, download } from './core.js';

const now = new Date();
let tab = 'gastos', yr = now.getFullYear(), qt = Math.floor(now.getMonth() / 3) + 1, per = 'q', cf = '', ct = '';
const PER = [['q', 'Trimestre'], ['year', 'Año'], ['all', 'Todo'], ['custom', 'Fechas']];
/** Parámetros de periodo para la API (trimestre, año, todo el historial o fechas a medida). */
const pq = () => (per === 'q' ? { year: yr, q: qt } : per === 'year' ? { from: `${yr}-01-01`, to: `${yr}-12-31` } : per === 'all' ? { all: 1 } : { from: cf, to: ct });
const plabel = () => (per === 'q' ? `T${qt}` : per === 'year' ? `${yr}` : per === 'all' ? 'todo el historial' : 'el periodo');
const num = (v) => Math.round((parseFloat(String(v).replace(',', '.')) || 0) * 100);
const e2 = (c) => ((c || 0) / 100).toFixed(2);

export async function render(el, ctx) {
  const redraw = () => render(el, ctx);
  const ready = per !== 'custom' || (cf && ct && cf <= ct);
  const [acc, ex] = await Promise.all([ready ? api(`/api/admin/accounting?${qs(pq())}`) : api(`/api/admin/accounting?${qs({ year: yr, q: qt })}`), api('/api/admin/expenses')]);
  const s = acc.summary, drafts = ex.items.filter((x) => x.draft), confirmed = ex.items.filter((x) => !x.draft);
  el.innerHTML = `
    <div class="top"><div><h2>Contabilidad</h2><p class="sub">Facturas recibidas, libro de ingresos y paquete para la asesoría, por trimestre, año, todo el historial o fechas a medida.</p></div></div>
    <div class="chips" id="per" style="margin-bottom:.9rem">${PER.map(([k, l]) => `<button class="chip ${per === k ? 'on' : ''}" data-p="${k}">${l}</button>`).join('')}</div>
    <div class="row" style="margin-bottom:1.1rem">${per === 'custom' ? `<label>Desde<input type="date" id="cf" value="${cf}"></label><label>Hasta<input type="date" id="ct" value="${ct}"></label>` : ''}${per === 'q' || per === 'year' ? `<select id="yr" style="width:100px">${[yr + 1, yr, yr - 1, yr - 2].filter((v, i, a) => a.indexOf(v) === i).sort().reverse().map((y) => `<option ${y === yr ? 'selected' : ''}>${y}</option>`).join('')}</select>` : ''}${per === 'q' ? `<select id="qt" style="width:130px">${[1, 2, 3, 4].map((q) => `<option value="${q}" ${q === qt ? 'selected' : ''}>${q}.º trimestre</option>`).join('')}</select>` : ''}</div>
    ${ready ? '' : '<div class="empty"><b>Elige las dos fechas</b>Indica desde y hasta cuándo quieres ver la contabilidad.</div>'}
    <div class="kpis" ${ready ? '' : 'hidden'}><div class="kpi"><b>${eur0(s.income.total)}</b><span>Cobrado en ${plabel()}</span><small>${s.income.count} cobros</small></div><div class="kpi"><b>${eur0(s.expenses.total)}</b><span>Gastos en ${plabel()}</span><small>${s.expenses.count} facturas</small></div>
      <div class="kpi ${s.m303.resultado > 0 ? 'warn' : 'good'}"><b>${eur0(s.m303.resultado)}</b><span>IVA a ingresar (303)</span><small>${s.m303.resultado < 0 ? 'A compensar' : 'Estimado'}</small></div><div class="kpi ${s.m130.to_pay ? 'warn' : ''}"><b>${eur0(s.m130.to_pay)}</b><span>IRPF fraccionado (130)</span><small>Estimado</small></div></div>
    <div class="tabs" id="tabs">${[['gastos', `Facturas y gastos${drafts.length ? ` · ${drafts.length} por revisar` : ''}`], ['ingresos', 'Ingresos'], ['trimestre', per === 'q' ? 'Paquete trimestral' : 'Paquete del periodo']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tab"></div>`;
  $$('#per [data-p]', el).forEach((b) => (b.onclick = () => { per = b.dataset.p; redraw(); }));
  const yS = $('#yr', el), qS = $('#qt', el), fS = $('#cf', el), tS = $('#ct', el);
  if (yS) yS.onchange = (e) => { yr = Number(e.target.value); redraw(); };
  if (qS) qS.onchange = (e) => { qt = Number(e.target.value); redraw(); };
  if (fS) { fS.onchange = () => { cf = fS.value; if (cf && ct) redraw(); }; tS.onchange = () => { ct = tS.value; if (cf && ct) redraw(); }; }
  if (!ready) return;
  $$('#tabs [data-t]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; redraw(); }));
  const t = $('#tab', el);
  if (tab === 'gastos') gastos(t, ex, drafts, confirmed, ctx, redraw, s);
  else if (tab === 'ingresos') ingresos(t, acc);
  else trimestre(t, acc, redraw);
}

/* ───── gastos ───── */
function gastos(t, ex, drafts, confirmed, ctx, redraw, s) {
  const cats = Object.fromEntries(ex.categories.map((c) => [c.id, c]));
  t.innerHTML = `
    <div class="drop" id="drop" tabindex="0" role="button" aria-label="Subir facturas"><b>Arrastra aquí tus facturas</b><span class="muted">PDF, JPG, PNG o XML · puedes subir varias a la vez · o pulsa para elegir</span><input type="file" id="files" accept="application/pdf,image/jpeg,image/png,image/webp,text/xml,application/xml" multiple hidden></div>
    <p class="muted small" id="up-status" style="margin:.6rem 0 1.2rem"></p>
    ${drafts.length ? `<div class="card" style="border-color:#e3cc96;background:var(--warn-bg);margin-bottom:1.2rem"><div class="between"><h3>Por revisar (${drafts.length})</h3><button class="btn sm" id="confirm-all">Confirmar las completas</button></div><p class="small muted" style="margin-bottom:.6rem">Estas facturas aún no cuentan en la contabilidad. Revisa los datos y confírmalas.</p>${drafts.map((d) => `<div class="between" style="padding:.55rem 0;border-top:1px solid rgba(0,0,0,.08)"><div><b>${esc(d.supplier || 'Proveedor sin identificar')}</b> ${d.duplicate_of ? badge('bad', 'Posible duplicada') : ''}<div class="small muted">${dateShort(d.date)} · ${eur(d.total_cents)} · ${esc(d.category_label)}${d.files?.length ? ` · ${esc(d.files[0].name)}` : ''}</div></div><button class="btn sm" data-rev="${d.id}">Revisar</button></div>`).join('')}</div>` : ''}
    <div class="between" style="margin-bottom:.8rem"><h3>Facturas del año</h3><button class="btn sm ghost" id="add">+ Gasto sin factura / manual</button></div>
    ${confirmed.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>Categoría</th><th class="r">Base</th><th class="r">IVA</th><th class="r">Total</th><th>Archivo</th></tr></thead><tbody>${confirmed.map((e) => `<tr class="click" data-e="${e.id}"><td>${dateShort(e.date)}</td><td><b>${esc(e.supplier)}</b><div class="muted small">${esc(e.number || e.concept || '')}</div></td><td>${esc(e.category_label)} ${cats[e.category]?.kind === 'fijo' ? '' : ''}</td><td class="num">${eur(e.base_cents)}</td><td class="num">${eur(e.vat_cents)}</td><td class="num"><b>${eur(e.total_cents)}</b></td><td>${e.files?.length ? badge('ok', `${e.files.length} adjunto${e.files.length > 1 ? 's' : ''}`) : badge('warn', 'Sin factura')}${!e.supplier_nif ? ' ' + badge('warn', 'Sin NIF') : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('Todavía no hay gastos', 'Sube tus facturas de proveedores y se contabilizan solas en el trimestre que les corresponde.')}
    ${s.expenses.by_category.length ? `<div class="card" style="margin-top:1.2rem"><h3>Gastos del trimestre por categoría</h3>${s.expenses.by_category.map((c) => `<div class="hbar"><span>${esc(c.label)}</span><div class="track"><i style="width:${(c.total / s.expenses.total) * 100}%"></i></div><b class="mono">${eur(c.total)}</b></div>`).join('')}</div>` : ''}`;
  const drop = $('#drop', t), input = $('#files', t), status = $('#up-status', t);
  drop.onclick = () => input.click(); drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); };
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  const upload = async (list) => {
    const files = [...list]; let ok = 0, bad = 0;
    for (let i = 0; i < files.length; i++) {
      status.textContent = `Subiendo ${i + 1} de ${files.length}: ${files[i].name}…`;
      try { await api('/api/admin/expenses/import', { method: 'POST', raw: files[i], type: files[i].type || 'application/pdf', filename: files[i].name }); ok++; } catch (e) { bad++; toast(`${files[i].name}: ${e.message}`, true); }
    }
    status.textContent = ''; if (ok) toast(`${ok} ${ok === 1 ? 'factura subida' : 'facturas subidas'}. Revísalas para contabilizarlas.`);
    redraw(); ctx.refreshCounts();
  };
  drop.addEventListener('drop', (e) => upload(e.dataTransfer.files)); input.onchange = () => upload(input.files);
  $$('[data-rev]', t).forEach((b) => (b.onclick = () => expenseDialog(ex, ex.items.find((x) => x.id === Number(b.dataset.rev)), redraw, ctx)));
  $$('[data-e]', t).forEach((r) => (r.onclick = () => expenseDialog(ex, ex.items.find((x) => x.id === Number(r.dataset.e)), redraw, ctx)));
  $('#add', t).onclick = () => expenseDialog(ex, null, redraw, ctx);
  const ca = $('#confirm-all', t); if (ca) ca.onclick = guard(async () => { const r = await api('/api/admin/expenses/confirm', { method: 'POST', body: { ids: drafts.map((d) => d.id) } }); toast(`${r.confirmed} confirmadas`); redraw(); ctx.refreshCounts(); });
}

async function showFile(box, f) {
  try {
    const blob = await api(`/api/admin/files/${f.id}`, { blob: true });
    const url = URL.createObjectURL(blob);
    box.innerHTML = f.mime.startsWith('image/') ? `<img class="viewer-img" src="${url}" alt="${esc(f.name)}">` : f.mime === 'application/pdf' ? `<iframe class="viewer" src="${url}" title="${esc(f.name)}"></iframe>` : `<p class="muted small">${esc(f.name)} (vista previa no disponible)</p>`;
  } catch { box.innerHTML = `<p class="muted small">No se puede mostrar ${esc(f.name)} aquí.</p>`; }
}

function expenseDialog(ex, e, redraw, ctx) {
  const draft = e && e.draft, isNew = !e;
  e = e || { supplier: '', supplier_nif: '', number: '', date: today(), concept: '', category: 'material', base_cents: 0, vat_rate: 21, vat_cents: 0, irpf_cents: 0, total_cents: 0, deductible_pct: 100, paid: true, pay_method: '', recurring: '', notes: '', files: [] };
  const f = openDialog(`<h3>${draft ? 'Revisar factura' : isNew ? 'Nuevo gasto' : 'Gasto'}</h3>
    ${e.duplicate_of ? '<div class="advice"><li class="bad">Ya existe una factura con el mismo proveedor, número e importe. Comprueba que no esté duplicada.</li></div>' : ''}
    ${e.notes && draft ? `<p class="small muted">${esc(e.notes)}</p>` : ''}
    <div id="fv"></div>
    <div class="grid2"><label>Proveedor<input name="supplier" required value="${esc(e.supplier)}"></label><label>NIF / CIF<input name="supplier_nif" value="${esc(e.supplier_nif)}"></label>
      <label>Nº de factura<input name="number" value="${esc(e.number)}"></label><label>Fecha<input type="date" name="date" required value="${e.date}"></label>
      <label class="full">Concepto<input name="concept" value="${esc(e.concept)}"></label>
      <label class="full">Categoría<select name="category">${ex.categories.map((c) => `<option value="${c.id}" ${c.id === e.category ? 'selected' : ''}>${esc(c.label)} · ${c.kind}</option>`).join('')}</select></label></div>
    <div class="grid4"><label>Base (€)<input name="base" inputmode="decimal" value="${e2(e.base_cents)}"></label><label>IVA<select name="vat_rate">${[21, 10, 4, 0].map((r) => `<option ${r === e.vat_rate ? 'selected' : ''}>${r}</option>`).join('')}</select></label><label>Retención IRPF (€)<input name="irpf" inputmode="decimal" value="${e2(e.irpf_cents)}"></label><label>Total (€)<input name="total" inputmode="decimal" value="${e2(e.total_cents)}"></label></div>
    <p class="small muted" id="calc"></p>
    <div class="grid3"><label>% deducible<input type="number" name="deductible_pct" min="0" max="100" value="${e.deductible_pct}"></label><label>Método de pago<select name="pay_method">${['', 'tarjeta', 'transferencia', 'efectivo', 'domiciliación'].map((m) => `<option ${m === e.pay_method ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label class="check" style="align-self:end"><input type="checkbox" name="paid" ${e.paid ? 'checked' : ''}> Pagada</label></div>
    <label class="check"><input type="checkbox" name="recurring" ${e.recurring ? 'checked' : ''}> Se repite cada mes (alquiler, software…)</label>
    <label>Notas<textarea name="notes" rows="2"></textarea></label>
    ${!isNew ? `<div><h4>Archivos</h4><div class="row" id="fl" style="margin-top:.4rem">${(e.files || []).map((x) => `<span class="filechip" data-f="${x.id}">${esc(x.name)} <button type="button" class="link" data-rf="${x.id}" aria-label="Quitar">✕</button></span>`).join('')}<label class="btn sm ghost" style="cursor:pointer;text-transform:none;letter-spacing:0;font-size:.78rem">+ Adjuntar<input type="file" id="af" hidden accept="application/pdf,image/jpeg,image/png,image/webp,text/xml,application/xml"></label></div></div>` : ''}`,
    async (v) => {
      const body = { supplier: v.supplier, supplier_nif: v.supplier_nif, number: v.number, date: v.date, concept: v.concept, category: v.category, base_cents: num(v.base), vat_rate: Number(v.vat_rate), irpf_cents: num(v.irpf), total_cents: num(v.total), deductible_pct: Number(v.deductible_pct), paid: !!v.paid, pay_method: v.pay_method, recurring: !!v.recurring, notes: v.notes };
      if (isNew) await api('/api/admin/expenses', { method: 'POST', body }); else await api(`/api/admin/expenses/${e.id}`, { method: 'PUT', body: { ...body, confirm: true } });
      toast(draft ? 'Factura contabilizada' : 'Gasto guardado'); redraw(); ctx.refreshCounts();
    }, { submit: draft ? 'Confirmar y contabilizar' : 'Guardar', wide: true });
  f.elements.notes.value = draft ? '' : e.notes || '';
  const set = (n, v) => (f.elements[n].value = v);
  const recalc = (from) => {
    const rate = Number(f.elements.vat_rate.value), irpf = num(f.elements.irpf.value);
    if (from === 'total') { const total = num(f.elements.total.value); const base = Math.round((total + irpf) / (1 + rate / 100)); set('base', e2(base)); }
    else { const base = num(f.elements.base.value), vat = Math.round(base * rate / 100); set('total', e2(base + vat - irpf)); }
    const base = num(f.elements.base.value); $('#calc', f).textContent = `IVA: ${eur(Math.round(base * rate / 100))}`;
  };
  ['base', 'irpf'].forEach((n) => (f.elements[n].oninput = () => recalc('base'))); f.elements.vat_rate.onchange = () => recalc('base'); f.elements.total.oninput = () => recalc('total'); recalc(e.total_cents && !e.base_cents ? 'total' : 'keep');
  if (!(e.total_cents && e.base_cents)) $('#calc', f).textContent = '';
  const fv = $('#fv', f); if (e.files?.length) showFile(fv, e.files[0]);
  if (!isNew) {
    $$('[data-f]', f).forEach((c) => (c.onclick = (ev) => { if (ev.target.closest('[data-rf]')) return; showFile(fv, e.files.find((x) => x.id === c.dataset.f)); }));
    $$('[data-rf]', f).forEach((b) => (b.onclick = guard(async () => { await api(`/api/admin/expenses/${e.id}/files/${b.dataset.rf}`, { method: 'DELETE' }); toast('Archivo quitado'); document.querySelector('#dlg').close(); redraw(); })));
    $('#af', f).onchange = guard(async (ev) => { const file = ev.target.files[0]; if (!file) return; await api(`/api/admin/expenses/${e.id}/files`, { method: 'POST', raw: file, type: file.type, filename: file.name }); toast('Archivo adjuntado'); document.querySelector('#dlg').close(); redraw(); });
    const del = document.createElement('button'); del.type = 'button'; del.className = 'btn danger'; del.textContent = 'Eliminar'; del.style.marginRight = 'auto';
    del.onclick = () => confirmBox('¿Eliminar el gasto?', 'Se borra también el archivo adjunto.', async () => { await api(`/api/admin/expenses/${e.id}`, { method: 'DELETE' }); toast('Gasto eliminado'); redraw(); ctx.refreshCounts(); }, { label: 'Eliminar' });
    $('.dlg-actions', f).prepend(del);
  }
}

/* ───── ingresos ───── */
function ingresos(t, acc) {
  const s = acc.summary;
  t.innerHTML = `<div class="between" style="margin-bottom:.8rem"><div><h3>Libro de ingresos · ${acc.summary.range ? `${dateShort(acc.summary.from)} – ${dateShort(acc.summary.to)}` : `T${acc.q} ${acc.year}`}</h3><p class="muted small">Se genera solo a partir de los cobros que registras en cada cita. El IVA se calcula con el tipo de cada servicio.</p></div></div>
    ${acc.income.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Clienta</th><th>Concepto</th><th>Método</th><th class="r">Base</th><th class="r">IVA</th><th class="r">Total</th></tr></thead><tbody>${acc.income.map((r) => `<tr><td>${dateShort(r.date)}</td><td>${esc(r.client)}</td><td>${esc(r.concept)}</td><td>${esc(r.method || '—')}</td><td class="num">${eur(r.base)}</td><td class="num">${eur(r.vat)} <span class="muted small">${r.vat_rate}%</span></td><td class="num"><b>${eur(r.total)}</b></td></tr>`).join('')}</tbody><tfoot><tr><td colspan="4"><b>Total</b></td><td class="num"><b>${eur(s.income.base)}</b></td><td class="num"><b>${eur(s.income.vat)}</b></td><td class="num"><b>${eur(s.income.total)}</b></td></tr></tfoot></table></div>` : empty('Sin cobros en este periodo', 'Registra el cobro en cada cita realizada y aparecerá aquí.')}`;
}

/* ───── paquete trimestral ───── */
function trimestre(t, acc, redraw) {
  const s = acc.summary, m = s.m303, g = s.m130;
  t.innerHTML = `
    <div class="between" style="margin-bottom:1rem"><div><h3>Paquete ${s.range ? `del ${dateShort(s.from)} al ${dateShort(s.to)}` : `del ${s.q}.º trimestre de ${s.year}`}</h3><p class="muted small">${s.deadline ? `Plazo de presentación: <b>${dateShort(s.deadline.date)}</b> · Modelos ${s.deadline.models.join(', ')}` : 'Cifras acumuladas del periodo. Para presentar un trimestre concreto, elige «Trimestre».'}</p></div>
      <div class="actions"><button class="btn ghost" id="dl">Descargar ZIP</button><button class="btn" id="send">Enviar a la asesoría</button></div></div>
    ${s.warnings.length ? `<ul class="advice" style="margin-bottom:1rem">${s.warnings.map((w) => `<li class="warn">${esc(w)}</li>`).join('')}</ul>` : '<ul class="advice" style="margin-bottom:1rem"><li class="good">Todo en orden para enviar a la asesoría.</li></ul>'}
    <div class="grid3">
      <div class="card"><h4>Modelo 303 · IVA</h4><dl class="kv" style="margin-top:.7rem;grid-template-columns:1fr auto"><dt>IVA repercutido</dt><dd class="mono">${eur(m.repercutido)}</dd><dt>IVA soportado deducible</dt><dd class="mono">${eur(m.soportado)}</dd><dt><b>Resultado</b></dt><dd class="mono"><b>${eur(m.resultado)}</b></dd></dl><p class="small muted" style="margin-top:.6rem">${m.resultado < 0 ? 'Sale a compensar o devolver.' : 'Importe estimado a ingresar.'}</p></div>
      <div class="card"><h4>Modelo 130 · IRPF (${g.rate}%)</h4><dl class="kv" style="margin-top:.7rem;grid-template-columns:1fr auto"><dt>Ingresos acumulados</dt><dd class="mono">${eur(g.income_ytd)}</dd><dt>Gastos deducibles</dt><dd class="mono">${eur(g.expenses_ytd)}</dd><dt>Rendimiento neto</dt><dd class="mono">${eur(g.net_ytd)}</dd><dt>Pagos anteriores</dt><dd class="mono">${eur(g.previous_paid)}</dd><dt><b>A ingresar</b></dt><dd class="mono"><b>${eur(g.to_pay)}</b></dd></dl></div>
      <div class="card"><h4>Modelo 115 · Retenciones</h4><dl class="kv" style="margin-top:.7rem;grid-template-columns:1fr auto"><dt>Alquiler del trimestre</dt><dd class="mono">${eur(s.m115.retenciones)}</dd></dl><p class="small muted" style="margin-top:.6rem">Solo si pagas alquiler con retención.</p></div></div>
    <div class="card" style="margin-top:1rem"><h3>Qué lleva el paquete</h3><ul style="margin:.4rem 0 0;padding-left:1.1rem" class="small"><li>Libro de ingresos (${s.income.count} cobros) y libro de gastos (${s.expenses.count} facturas) en CSV para Excel.</li><li>Resumen imprimible con las estimaciones de los modelos 303, 130 y 115.</li><li>Carpeta con todas las facturas recibidas del trimestre, renombradas por fecha y proveedor.</li></ul><p class="small muted" style="margin-top:.8rem">Son estimaciones para que la asesoría trabaje más rápido. La presentación oficial de los modelos la hace ella.</p></div>`;
  $('#dl', t).onclick = guard(async () => { await download(`/api/admin/accounting/package?${qs(pq())}`, `Paquete-${s.range ? s.from + '_a_' + s.to : 'T' + s.q + '-' + s.year}.zip`); toast('Paquete descargado'); });
  $('#send', t).onclick = () => {
    const gs = acc.gestoria;
    if (!gs.email) return openDialog('<h3>Falta la asesoría</h3><p class="muted">Añade el nombre y el email de tu asesoría en Ajustes para poder enviarle el paquete.</p>', async () => { location.hash = 'ajustes'; }, { submit: 'Ir a Ajustes' });
    if (!acc.mail) return openDialog(`<h3>Correo no configurado</h3><p class="muted">El servidor aún no tiene SMTP configurado, así que no puede enviar por ti. Descarga el ZIP y mándalo desde tu correo a <b>${esc(gs.email)}</b>.</p>`, async () => {}, { submit: '' });
    openDialog(`<h3>Enviar a ${esc(gs.name || gs.email)}</h3><p class="muted small">Para: ${esc(gs.email)}${gs.cc ? ' · Copia: ' + esc(gs.cc) : ''}</p>${s.warnings.length ? `<ul class="advice">${s.warnings.map((w) => `<li class="warn">${esc(w)}</li>`).join('')}</ul>` : ''}<label>Mensaje (opcional, si no escribes nada se usa el texto estándar)<textarea name="message" rows="4"></textarea></label>`,
      async (v) => { const r = await api('/api/admin/accounting/send', { method: 'POST', body: { ...pq(), message: v.message } }); toast(`Enviado a ${r.to}`); redraw(); }, { submit: 'Enviar paquete' });
  };
}
