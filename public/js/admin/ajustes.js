import { $, $$, api, esc, toast, guard, openDialog, confirmBox, download } from './core.js';

const c2e = (c) => ((c || 0) / 100).toFixed(2);
const e2c = (v) => Math.round((parseFloat(String(v).replace(',', '.')) || 0) * 100);

export async function render(el, ctx) {
  const s = await api('/api/admin/settings');
  const g = s.gestoria || {};
  el.innerHTML = `<div class="top"><div><h2>Ajustes</h2><p class="sub">Datos del negocio, fiscales, asesoría y objetivos.</p></div></div>
  <form class="stack" id="sf">
    <div class="card"><h3>Negocio y contacto</h3><div class="grid2" style="margin-top:.7rem">
      ${[['businessName', 'Nombre del negocio'], ['tagline', 'Frase descriptiva'], ['city', 'Ciudad / zona'], ['address', 'Dirección del estudio'], ['phone', 'Teléfono'], ['whatsapp', 'WhatsApp (con prefijo, ej. 34600111222)'], ['email', 'Email de contacto'], ['instagram', 'URL de Instagram'], ['siteUrl', 'Dirección de la web (https://…)'], ['homeFeeInfo', 'Texto sobre servicio a domicilio'], ['depositInfo', 'Mensaje sobre señal o pago (opcional)']].map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(s[k] || '')}"></label>`).join('')}</div></div>
    <div class="card"><h3>Datos fiscales</h3><p class="muted small">Aparecen en el resumen para la asesoría.</p><div class="grid2" style="margin-top:.7rem"><label>Nombre o razón social<input name="legalName" value="${esc(s.legalName || '')}"></label><label>NIF<input name="nif" value="${esc(s.nif || '')}"></label><label class="full">Domicilio fiscal<input name="fiscalAddress" value="${esc(s.fiscalAddress || '')}"></label>
      <label>IVA por defecto (%)<input type="number" name="defaultVat" min="0" max="30" value="${s.defaultVat}"></label><label>Pago fraccionado IRPF (%)<input type="number" name="irpfFractionRate" min="0" max="50" value="${s.irpfFractionRate}"></label>
      <label class="check full"><input type="checkbox" name="pricesIncludeVat" ${s.pricesIncludeVat ? 'checked' : ''}> Los precios de la web ya incluyen IVA</label></div></div>
    <div class="card"><h3>Asesoría</h3><p class="muted small">Destinatario del paquete trimestral.</p><div class="grid2" style="margin-top:.7rem"><label>Nombre de la asesoría o asesor/a<input name="g_name" value="${esc(g.name || '')}"></label><label>Email<input type="email" name="g_email" value="${esc(g.email || '')}"></label><label>Email en copia (opcional)<input type="email" name="g_cc" value="${esc(g.cc || '')}"></label><label>Nota fija para la asesoría<input name="g_note" value="${esc(g.note || '')}"></label>
      <label class="check full"><input type="checkbox" name="quarterlyAutoSend" ${s.quarterlyAutoSend ? 'checked' : ''}> Enviar el paquete automáticamente a principios de cada trimestre (requiere correo conectado)</label></div></div>
    <div class="card"><h3>Objetivos y costes (para Rentabilidad)</h3><div class="grid3" style="margin-top:.7rem"><label>Lo que quieres ganar al mes, neto (€)<input name="target" inputmode="decimal" value="${c2e(s.targetNetMonthlyCents)}"></label><label>Cuota mensual de autónomos (€)<input name="autonomo" inputmode="decimal" value="${c2e(s.autonomoFeeMonthlyCents)}"></label><label>Otros costes fijos al mes (€)<input name="extra" inputmode="decimal" value="${c2e(s.fixedExtraMonthlyCents)}"></label></div></div>
    <div><button class="btn">Guardar ajustes</button></div>
  </form>
  <div class="grid2" style="margin-top:1rem;align-items:start">
    <form class="card stack" id="pw"><h3>Cambiar contraseña</h3><label>Contraseña actual<input type="password" name="current" autocomplete="current-password" required></label><label>Nueva contraseña (mín. 8)<input type="password" name="next" autocomplete="new-password" minlength="8" required></label><div><button class="btn sm">Actualizar contraseña</button></div></form>
    <div class="card stack"><h3>Copia de seguridad</h3><p class="muted small">Descarga todos tus datos (clientas, citas, gastos, ajustes) en un archivo. Las facturas adjuntas se guardan aparte, en la carpeta de datos del servidor.</p><div class="row"><button class="btn sm" id="bk">Descargar copia</button><button class="btn sm ghost" id="rs">Restaurar desde copia</button></div>
      <p class="small muted">Estado del servidor: correo ${s.mail ? '<b>conectado</b>' : '<b>sin configurar</b>'} · lectura de facturas con IA ${s.ai ? '<b>activa</b>' : '<b>desactivada</b>'}.</p></div></div>`;
  $('#sf', el).onsubmit = guard(async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const f = e.target.elements;
    const body = {}; for (const k of ['businessName', 'tagline', 'city', 'address', 'phone', 'whatsapp', 'email', 'instagram', 'siteUrl', 'homeFeeInfo', 'depositInfo', 'legalName', 'nif', 'fiscalAddress']) body[k] = v[k] || '';
    body.defaultVat = Number(v.defaultVat); body.irpfFractionRate = Number(v.irpfFractionRate); body.pricesIncludeVat = f.pricesIncludeVat.checked; body.quarterlyAutoSend = f.quarterlyAutoSend.checked;
    body.gestoria = { name: v.g_name, email: v.g_email, cc: v.g_cc, note: v.g_note };
    body.targetNetMonthlyCents = e2c(v.target); body.autonomoFeeMonthlyCents = e2c(v.autonomo); body.fixedExtraMonthlyCents = e2c(v.extra);
    await api('/api/admin/settings', { method: 'PUT', body }); toast('Ajustes guardados');
  });
  $('#pw', el).onsubmit = guard(async (e) => { e.preventDefault(); await api('/api/admin/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('Contraseña actualizada'); });
  $('#bk', el).onclick = guard(() => download('/api/admin/export/backup', `copia-${new Date().toISOString().slice(0, 10)}.json`));
  $('#rs', el).onclick = () => openDialog(`<h3>Restaurar copia</h3><p class="muted">Sustituye <b>todos</b> los datos actuales por los de la copia. Escribe RESTAURAR para confirmar.</p><label>Archivo de copia<input type="file" name="file" accept="application/json" required></label><label>Confirmación<input name="confirm" placeholder="RESTAURAR" required></label>`, async (v, f) => { const file = f.elements.file.files[0]; const data = JSON.parse(await file.text()); await api('/api/admin/restore', { method: 'POST', body: { confirm: v.confirm, data } }); toast('Copia restaurada'); location.reload(); }, { submit: 'Restaurar' });
}
