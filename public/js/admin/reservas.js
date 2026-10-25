/* Interruptor de reservas online y modo de aceptación. */
import { $, api, esc, openDialog, toast, guard } from './core.js';

/** Tarjeta con el interruptor «Aceptar reservas online». */
export async function bookingSwitch(host, after = () => {}) {
  const s = await api('/api/admin/settings'), open = s.bookingsOpen !== false;
  host.innerHTML = `<div class="open-card ${open ? 'is-open' : 'is-closed'}">
    <div><b>${open ? 'Reservas online abiertas' : 'Reservas online pausadas'}</b>
    <p class="small muted">${open ? (s.autoConfirm ? 'Las citas se confirman solas.' : 'Cada solicitud espera a que tú la aceptes, propongas otra hora o la rechaces.') : 'Nadie puede reservar desde la web. Verán tu aviso y tu contacto.'}</p></div>
    <button type="button" class="switch" role="switch" aria-checked="${open}" aria-label="Aceptar reservas online"><i></i></button></div>`;
  const apply = guard(async (body) => { await api('/api/admin/settings', { method: 'PUT', body }); toast(body.bookingsOpen ? 'Reservas abiertas' : 'Reservas pausadas'); after(); });
  $('.switch', host).onclick = () => {
    if (!open) return apply({ bookingsOpen: true });
    openDialog(`<h3>Pausar reservas online</h3><p class="muted">Mientras estén pausadas, la web no deja reservar y muestra este mensaje junto a tus datos de contacto. Las citas ya hechas no cambian.</p>
      <label>Mensaje para tus clientas<textarea name="msg" rows="3">${esc(s.bookingsClosedMessage || '')}</textarea></label>`,
      async (v) => apply({ bookingsOpen: false, bookingsClosedMessage: v.msg }), { submit: 'Pausar reservas' });
  };
}
