/** Parser CSV mínimo (comillas, saltos de línea dentro de campos, separador , ; o tab). */
export function parseCsv(text) {
  const src = String(text).replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = [',', ';', '\t'].map((s) => [s, firstLine.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const HEADERS = {
  email: ['email', 'e-mail', 'correo', 'correo electronico', 'correo electrónico', 'mail'],
  first_name: ['first_name', 'firstname', 'first name', 'nombre', 'name'],
  last_name: ['last_name', 'lastname', 'last name', 'apellidos', 'apellido', 'surname'],
};

/** Devuelve [{email, first_name, last_name}] a partir de un CSV con o sin cabecera. */
export function contactsFromCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {};
  for (const [field, names] of Object.entries(HEADERS)) idx[field] = head.findIndex((h) => names.includes(h));
  let data = rows;
  if (idx.email >= 0) data = rows.slice(1);
  else {
    // Sin cabecera: la primera columna con una @ es el email; nombre y apellidos van detrás.
    const emailCol = Math.max(0, rows[0].findIndex((c) => c.includes('@')));
    idx.email = emailCol;
    idx.first_name = rows[0].length > emailCol + 1 ? emailCol + 1 : -1;
    idx.last_name = rows[0].length > emailCol + 2 ? emailCol + 2 : -1;
  }
  const get = (r, k) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim() : '');
  return data.map((r) => ({ email: get(r, 'email'), first_name: get(r, 'first_name'), last_name: get(r, 'last_name') }));
}

/** Escapa una celda y neutraliza inyección de fórmulas en Excel. */
export function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
