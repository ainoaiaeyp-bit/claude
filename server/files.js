/* Archivos en disco: facturas adjuntas y fotos del portfolio. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function diskFiles(dir) {
  const root = path.join(dir, 'files');
  fs.mkdirSync(root, { recursive: true });
  const safe = (id) => /^[a-f0-9]{32}$/.test(id) ? path.join(root, id) : null;
  return {
    async save(bytes) { const id = crypto.randomBytes(16).toString('hex'); fs.writeFileSync(path.join(root, id), bytes); return id; },
    async read(id) { const p = safe(id); return p && fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : null; },
    async remove(id) { const p = safe(id); if (p && fs.existsSync(p)) fs.unlinkSync(p); },
  };
}

export function galleryFiles(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return {
    async list() { try { return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => `/img/gallery/${f}`); } catch { return []; } },
    async add(buf, type) {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[type];
      if (!ext || !buf?.length) { const e = new Error('Solo se admiten imágenes JPG, PNG o WebP.'); e.status = 415; throw e; }
      const m = buf.subarray(0, 12);
      const ok = (ext === '.jpg' && m[0] === 0xff && m[1] === 0xd8) || (ext === '.png' && Buffer.from(m.subarray(1, 4)).toString() === 'PNG') || (ext === '.webp' && Buffer.from(m.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(m.subarray(8, 12)).toString() === 'WEBP');
      if (!ok) { const e = new Error('El archivo no es una imagen válida.'); e.status = 415; throw e; }
      const name = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(dir, name), buf);
      return `/img/gallery/${name}`;
    },
    async remove(name) { const f = path.join(dir, path.basename(name)); if (f.startsWith(dir + path.sep) && fs.existsSync(f)) fs.unlinkSync(f); },
  };
}
