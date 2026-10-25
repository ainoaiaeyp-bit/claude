/* Almacén en memoria con colecciones de documentos. Cada cambio se notifica para poder persistirlo (SQLite en servidor). */

export const COLLECTIONS = ['services', 'bookings', 'clients', 'interactions', 'records', 'tasks', 'expenses', 'blocked', 'outbox', 'invoices_files', 'vouchers', 'products', 'orders'];

export function createStore(seed = {}, onChange = () => {}) {
  const cols = {}, seq = {};
  for (const c of COLLECTIONS) { cols[c] = new Map(); seq[c] = 0; }
  let settings = {};

  const load = (data) => {
    for (const c of COLLECTIONS) for (const d of data[c] || []) { cols[c].set(String(d.id), d); if (typeof d.id === 'number') seq[c] = Math.max(seq[c], d.id); }
    settings = { ...(data.settings || {}) };
  };
  load(seed);

  const clone = (d) => (d == null ? d : structuredClone(d));
  return {
    list: (c) => [...cols[c].values()].map(clone),
    find: (c, id) => clone(cols[c].get(String(id))),
    insert(c, doc) {
      const id = doc.id ?? ++seq[c];
      if (typeof id === 'number') seq[c] = Math.max(seq[c], id);
      const d = { ...doc, id };
      cols[c].set(String(id), d); onChange({ op: 'put', col: c, doc: d });
      return clone(d);
    },
    update(c, id, patch) {
      const cur = cols[c].get(String(id)); if (!cur) return undefined;
      const d = { ...cur, ...patch, id: cur.id };
      cols[c].set(String(id), d); onChange({ op: 'put', col: c, doc: d });
      return clone(d);
    },
    remove(c, id) { const ok = cols[c].delete(String(id)); if (ok) onChange({ op: 'del', col: c, id }); return ok; },
    setting: (k, fallback) => (k in settings ? settings[k] : fallback),
    settings: () => ({ ...settings }),
    setSetting(k, v) { settings[k] = v; onChange({ op: 'setting', key: k, value: v }); },
    exportAll() { const out = { settings: Object.fromEntries(Object.entries(settings).filter(([k]) => !k.startsWith('_'))) }; for (const c of COLLECTIONS) out[c] = [...cols[c].values()]; return structuredClone(out); },
    replaceAll(data) { for (const c of COLLECTIONS) { cols[c].clear(); seq[c] = 0; } settings = {}; load(data); onChange({ op: 'reset', data: this.exportAll() }); },
  };
}
