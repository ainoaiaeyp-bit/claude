import { $, $$, api, esc, toast, guard, confirmBox, empty } from './core.js';

export async function render(el, ctx) {
  const redraw = () => render(el, ctx);
  const list = await api('/api/gallery');
  el.innerHTML = `<div class="top"><div><h2>Portfolio</h2><p class="sub">Las fotos que subas aparecen al principio de “Trabajos recientes” en la web.</p></div><div class="actions"><label class="btn" style="cursor:pointer;text-transform:none;letter-spacing:0;font-size:.85rem">+ Subir fotos<input type="file" id="up" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div></div>
    ${list.length ? `<div class="grid4">${list.map((u) => `<div class="card" style="padding:.5rem"><img src="${esc(u)}" alt="" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:12px"><div style="padding:.5rem .3rem 0"><button class="btn sm danger" data-rm="${esc(u.split('/').pop())}">Eliminar</button></div></div>`).join('')}</div>` : empty('Todavía no has subido fotos', 'La web ya muestra una selección de trabajos. Sube las tuyas (JPG, PNG o WebP, máx. 8 MB) y aparecerán delante.')}`;
  $('#up', el).onchange = guard(async (e) => { for (const f of e.target.files) await api('/api/admin/gallery', { method: 'POST', raw: f, type: f.type }); toast('Fotos subidas'); redraw(); });
  $$('[data-rm]', el).forEach((b) => (b.onclick = () => confirmBox('¿Eliminar la foto?', 'Dejará de verse en la web.', async () => { await api(`/api/admin/gallery/${b.dataset.rm}`, { method: 'DELETE' }); redraw(); }, { label: 'Eliminar' })));
}
