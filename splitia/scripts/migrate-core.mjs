// Lógica pura de la migración (testeable sin red).

/** Tablas en orden de dependencias y columnas que referencian usuarios. */
export const TABLES = [
  { name: 'groups', users: ['created_by'] },
  { name: 'group_members', users: ['user_id'], conflict: 'group_id,user_id' },
  { name: 'custom_categories', users: ['created_by'] },
  { name: 'expenses', users: ['paid_by', 'split_with'], deferred: ['refund_of'] },
  { name: 'expense_splits', users: ['user_id'] },
  { name: 'expense_attachments', users: [] },
  { name: 'balance_adjustments', users: ['from_user', 'to_user', 'created_by'] },
  { name: 'recurring_expenses', users: ['paid_by', 'split_with', 'created_by'] },
  { name: 'subscriptions', users: ['created_by'] },
  { name: 'category_budgets', users: ['created_by'] },
  { name: 'savings_goals', users: ['created_by'] },
  { name: 'tasks', users: ['assigned_to', 'created_by'] },
  { name: 'calendar_events', users: ['created_by'] },
  { name: 'shopping_categories', users: ['created_by'] },
  { name: 'shopping_items', users: ['purchased_by', 'created_by'] },
  { name: 'food_inventory', users: ['created_by'] },
  { name: 'weight_tracker', users: ['user_id'] },
  { name: 'watchlist_items', users: ['created_by'] },
  { name: 'chat_messages', users: ['user_id'] },
  { name: 'chat_reactions', users: ['user_id'] },
  { name: 'activity_notifications', users: ['user_id'] },
];

export const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

/** Ids de usuario distintos presentes en las filas leídas. */
export function collectUserIds(data) {
  const ids = new Set();
  for (const t of TABLES) for (const row of data[t.name] ?? []) for (const c of t.users) if (row[c]) ids.add(row[c]);
  return [...ids];
}

/** Cambia los ids de usuario antiguos por los nuevos; los ids de fila se conservan. */
export function remapRow(row, userCols, map, deferredCols = []) {
  const out = { ...row };
  for (const c of userCols) {
    if (out[c] == null) continue;
    if (!map[out[c]]) throw new Error(`Usuario sin correspondencia (${c}=${out[c]})`);
    out[c] = map[out[c]];
  }
  for (const c of deferredCols) out[c] = null;
  return out;
}

/** Ruta de adjunto en el bucket nuevo: el primer segmento es el id de usuario. */
export function remapAttachmentPath(path, map) {
  const [first, ...rest] = String(path).split('/');
  return [map[first] ?? first, ...rest].join('/');
}

/** Plantilla users.json: lo que el usuario debe rellenar (correo de cada persona). */
export function buildUserTemplate(ids, names, knownEmails = {}) {
  return ids.map((id) => ({ old_id: id, display_name: names[id] ?? '', email: knownEmails[id] ?? '' }));
}

export const missingEmails = (tpl) => tpl.filter((u) => !/^\S+@\S+\.\S+$/.test(u.email ?? ''));

export function compareCounts(oldCounts, newCounts) {
  return Object.keys(oldCounts).map((t) => ({ table: t, old: oldCounts[t], new: newCounts[t] ?? 0, ok: oldCounts[t] === (newCounts[t] ?? 0) }));
}
