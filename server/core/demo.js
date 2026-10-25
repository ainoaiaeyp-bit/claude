/* Datos de demostración (ficticios) para probar el panel o enseñarlo: clientas, citas, cobros, gastos, facturas y tareas.
   Es determinista y puro: se usa desde `npm run demo` y desde la vista previa del panel. */
import { addDays, nowLocal, randomHex } from './util.js';
import { vatSplit } from './accounting.js';

/** Genera un PDF mínimo y válido con unas líneas de texto. */
export function demoPdf(title, lines = []) {
  const esc = (s) => String(s).replace(/[()\\]/g, '\\$&').replace(/[^\x20-\x7e]/g, (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N', '€': 'EUR' }[c] || ''));
  const content = ['BT /F1 18 Tf 50 780 Td (' + esc(title) + ') Tj ET', ...lines.map((l, i) => `BT /F1 11 Tf 50 ${745 - i * 18} Td (${esc(l)}) Tj ET`)].join('\n');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return new TextEncoder().encode(out);
}

const CLIENTS = [
  // nombre, email, teléfono, cumpleaños (mes-día), origen, etiquetas, permiso novedades, notas
  ['Lucía Martínez Gil', 'lucia.martinez@ejemplo.com', '611 222 333', '03-14', 'instagram', ['microblading'], true, 'Cejas muy finas por depilación excesiva.'],
  ['Carmen Ruiz Soto', 'carmen.ruiz@ejemplo.com', '622 333 444', '09-02', 'referida', ['vip', 'powder'], true, 'Prefiere citas por la tarde.'],
  ['Marta Sánchez Pérez', 'marta.sanchez@ejemplo.com', '633 444 555', '11-21', 'web', ['piel mixta'], true, ''],
  ['Elena Gómez Navarro', 'elena.gomez@ejemplo.com', '644 555 666', '06-08', 'instagram', ['novia'], true, 'Boda en junio. Prueba de maquillaje pendiente.'],
  ['Paula Navarro Díaz', 'paula.navarro@ejemplo.com', '655 666 777', '', 'web', [], false, ''],
  ['Sofía Hernández Ortiz', 'sofia.hernandez@ejemplo.com', '666 777 888', '01-30', 'web', ['hiperrealismo'], true, ''],
  ['Ana Belén Ortiz Ros', 'anabelen.ortiz@ejemplo.com', '677 888 999', '12-05', 'referida', ['vip'], true, 'Alergia al níquel.'],
  ['Irene Molina Cano', 'irene.molina@ejemplo.com', '688 999 000', '07-19', 'instagram', [], false, ''],
  ['Rocío Campos Lara', 'rocio.campos@ejemplo.com', '699 000 111', '04-27', 'evento', [], true, ''],
  ['Nuria Pérez Sala', 'nuria.perez@ejemplo.com', '610 111 222', '10-03', 'web', ['labios'], true, ''],
  ['Laura Díaz Mora', 'laura.diaz@ejemplo.com', '620 222 333', '02-11', 'instagram', [], true, ''],
  ['Alba Torres Vera', 'alba.torres@ejemplo.com', '630 333 444', '08-23', 'web', [], false, 'No asistió una vez.'],
  ['Inés Romero Paz', 'ines.romero@ejemplo.com', '640 444 555', '05-16', 'referida', ['microblading'], true, ''],
  ['Cristina Vidal Ruiz', 'cristina.vidal@ejemplo.com', '650 555 666', '', 'web', [], true, ''],
];

export function seedDemo(store, now = new Date(), { saveFile } = {}) {
  const today = nowLocal(now).date, y = today.slice(0, 4), m = today.slice(5, 7);
  const iso = (n) => addDays(today, n);
  const svc = Object.fromEntries(store.list('services').map((s) => [s.name.split(' ')[0] + (s.name.split(' ')[1] === 'de' ? ' de' : ''), s]));
  const S = (name) => store.list('services').find((s) => s.name.startsWith(name));
  const created = (n) => new Date(addDays(today, n) + 'T10:00:00Z').toISOString();

  // clientas (cumpleaños: una hoy, otra esta semana)
  const ids = CLIENTS.map((c, i) => {
    let bd = c[3] ? `${1988 + (i % 9)}-${c[3]}` : '';
    if (i === 1) bd = `1991-${today.slice(5)}`;
    if (i === 5) bd = `1994-${addDays(today, 4).slice(5)}`;
    return store.insert('clients', { name: c[0], email: c[1], phone: c[2], birthday: bd, source: c[4], tags: c[5], notes: c[7], health: i === 6 ? 'Sin contraindicaciones. No toma anticoagulantes.' : '', allergies: i === 6 ? 'Níquel' : '', instagram: '', consent_marketing: c[6], consent_date: c[6] ? created(-120) : '', token: randomHex(12), archived: false, created_at: created(-[170, 160, 90, 75, 62, 55, 140, 100, 28, 120, 80, 130, 20, 9][i]) }).id;
  });

  // citas: [cliente, servicio, díasDesdeHoy, hora, estado, % cobrado]
  const H = (h, mm = 0) => h * 60 + mm;
  const plan = [
    [0, 'Microblading', -55, H(10), 'done'], [0, 'Retoque', 12, H(11), 'confirmed'],
    [1, 'Powder', -160, H(16), 'done'], [1, 'Retoque', -118, H(17), 'done'], [1, 'Higiene', -75, H(17, 30), 'done'], [1, 'Maquillaje social', -40, H(18), 'done'], [1, 'Henna', -14, H(16, 30), 'done'], [1, 'Diseño', 6, H(17), 'confirmed'],
    [2, 'Powder', 2, H(10, 30), 'pending'],
    [3, 'Maquillaje de novia', 25, H(9, 30), 'confirmed'], [3, 'Consulta', -50, H(12), 'done'],
    [4, 'Microblading', -62, H(10), 'done'],
    [5, 'Hiperrealismo', 4, H(16), 'pending'],
    [6, 'Microblading', -140, H(10, 30), 'done'], [6, 'Retoque', -100, H(11), 'done'], [6, 'Depilación con hilo', -70, H(17), 'done'], [6, 'Higiene', -45, H(17), 'done'], [6, 'Peeling', -20, H(16), 'done'], [6, 'Diseño', 8, H(17, 30), 'confirmed'],
    [7, 'Henna', -90, H(17), 'done'], [7, 'Diseño', -30, H(17), 'done'],
    [8, 'Consulta', -25, H(12, 20), 'done'], [8, 'Powder', 1, H(10), 'pending'],
    [9, 'Micropigmentación de labios', -100, H(10), 'done'],
    [10, 'Maderoterapia', -60, H(18), 'done'], [10, 'Maderoterapia', -30, H(18), 'done'], [10, 'Maderoterapia', 3, H(18), 'confirmed'],
    [11, 'Microblading', -85, H(11), 'no_show'], [11, 'Diseño', -80, H(17), 'done'],
    [12, 'Microblading', -18, H(10), 'done'],
    [13, 'Consulta', -8, H(12), 'done'], [13, 'Higiene', 10, H(16), 'confirmed'],
    // semanas recientes para que los gráficos tengan forma
    [2, 'Higiene', -50, H(16), 'done'], [8, 'Maquillaje social', -12, H(18, 30), 'done'], [4, 'Retoque', -22, H(11), 'done'], [10, 'Depilación con cera', -6, H(17), 'done'], [7, 'Peeling', -9, H(16, 30), 'done'], [9, 'Henna', -4, H(17), 'done'], [12, 'Diseño', -2, H(17), 'done'],
  ];
  // actividad realista de los últimos 75 días: ~2 citas por jornada laborable, con la mezcla de servicios del estudio
  let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const mix = ['Microblading', 'Microblading', 'Powder', 'Hiperrealismo', 'Retoque', 'Retoque', 'Diseño', 'Henna', 'Higiene', 'Depilación con hilo', 'Maquillaje social', 'Consulta', 'Peeling', 'Maderoterapia', 'Micropigmentación de labios'];
  for (let off = -75; off <= -1; off++) {
    const dow = new Date(addDays(today, off) + 'T12:00:00Z').getUTCDay();
    if (dow === 0) continue;
    const n = dow === 6 ? 1 : rnd() < 0.7 ? 2 : 1;
    let t = H(10);
    for (let k = 0; k < n; k++) {
      const name = mix[Math.floor(rnd() * mix.length)], s = S(name); if (!s) continue;
      if (t + s.duration_min > 1200) break;
      plan.push([Math.floor(rnd() * ids.length), name, off, t, rnd() < 0.04 ? 'no_show' : 'done']);
      t += s.duration_min + 30 + (rnd() < 0.5 ? 270 * (t < 840 ? 1 : 0) : 0);
      if (t > 840 && t < 960) t = 960;
    }
  }
  const methods = ['tarjeta', 'efectivo', 'bizum', 'tarjeta'];
  plan.forEach(([ci, name, off, start, status], k) => {
    const s = S(name); if (!s) return;
    const c = store.find('clients', ids[ci]);
    const paid = status === 'done' ? (k % 11 === 4 ? Math.max(0, s.price_cents - 1000) : s.price_cents) : 0;
    const b = store.insert('bookings', { client_id: c.id, service_id: s.id, service_name: s.name, category: s.category, price_cents: s.price_cents, paid_cents: paid, pay_method: paid ? methods[k % 4] : '', name: c.name, email: c.email, phone: c.phone, date: iso(off), start_min: start, end_min: start + s.duration_min, location: s.name.startsWith('Maquillaje de novia') ? 'home' : 'studio', address: s.name.startsWith('Maquillaje de novia') ? 'C/ Mayor 12, Alcantarilla' : '', notes: ci === 2 ? 'Piel mixta, primera vez.' : '', internal_notes: '', status, source: k % 7 === 0 ? 'admin' : 'web', token: randomHex(16), created_at: created(off - 6) });
    const label = { done: 'realizada', confirmed: 'confirmada', pending: 'pendiente', no_show: 'no asistió' }[status];
    store.insert('interactions', { client_id: c.id, kind: 'cita', text: `Cita ${label}: ${s.name} el ${iso(off)}`, booking_id: b.id, created_at: created(off) });
    if (paid) store.insert('interactions', { client_id: c.id, kind: 'cobro', text: `Cobro registrado: ${(paid / 100).toFixed(2)} € por ${s.name}`, booking_id: b.id, created_at: created(off) });
  });
  store.insert('interactions', { client_id: ids[3], kind: 'llamada', text: 'Hablamos de la prueba de novia: quiere un look natural y luminoso.', created_at: created(-20) });
  store.insert('interactions', { client_id: ids[6], kind: 'nota', text: 'Le encantó el resultado. Quiere probar labios en otoño.', created_at: created(-45) });

  // fichas técnicas
  store.insert('records', { client_id: ids[0], booking_id: null, date: iso(-55), technique: 'Microblading', areas: 'Cejas', pigment: 'Moca 03', device: 'Cuchilla 18U', skin_type: 'Normal', notes: 'Piel fina. Buena cicatrización. Retoque a las 6–8 semanas.', consent_signed: true, created_at: created(-55) });
  store.insert('records', { client_id: ids[1], booking_id: null, date: iso(-160), technique: 'Powder brows', areas: 'Cejas', pigment: 'Ébano 02', device: 'Cartucho 1RL', skin_type: 'Mixta', notes: 'Sombreado degradado desde el arco.', consent_signed: true, created_at: created(-160) });
  store.insert('records', { client_id: ids[6], booking_id: null, date: iso(-140), technique: 'Microblading', areas: 'Cejas', pigment: 'Castaño 01', device: 'Cuchilla 14U', skin_type: 'Seca', notes: 'Alergia al níquel: se usó material hipoalergénico.', consent_signed: true, created_at: created(-140) });

  // tareas y contactos
  store.insert('tasks', { client_id: ids[3], title: 'Confirmar fecha de la prueba de novia', due_date: iso(1), done: false, kind: 'tarea', created_at: created(-3) });
  store.insert('tasks', { client_id: null, title: 'Pedir pigmentos para el mes que viene', due_date: iso(3), done: false, kind: 'tarea', created_at: created(-1) });
  store.insert('tasks', { client_id: ids[13], title: 'Responder a contacto web', due_date: iso(-1), done: false, kind: 'lead', created_at: created(-2) });
  const lead = store.insert('clients', { name: 'Beatriz Fuentes', email: 'beatriz.fuentes@ejemplo.com', phone: '', birthday: '', source: 'web', tags: [], notes: '', health: '', allergies: '', consent_marketing: false, consent_date: '', token: randomHex(12), archived: false, created_at: created(-3) });
  store.insert('interactions', { client_id: lead.id, kind: 'mensaje', text: '¿Cuánto cuesta el microblading y cuánto dura?', created_at: created(-3) });

  // gastos de los últimos 4 meses (con IVA y facturas en PDF)
  const files = [];
  const addExp = async (e) => e;
  const mkFile = (name, title, lines) => { if (!saveFile) return []; const id = saveFile(demoPdf(title, lines)); return [{ id, name, mime: 'application/pdf', size: 900 }]; };
  const exp = (off, supplier, nif, number, cat, base, rate, extra = {}) => {
    const irpf = extra.irpf || 0, vat = Math.round(base * rate / 100), total = base + vat - irpf;
    const f = extra.noFile ? [] : mkFile(`${number}.pdf`, `Factura ${number}`, [supplier, `NIF ${nif}`, `Fecha ${iso(off)}`, `Base ${(base / 100).toFixed(2)} EUR`, `IVA ${rate}% ${(vat / 100).toFixed(2)} EUR`, `Total ${(total / 100).toFixed(2)} EUR`]);
    store.insert('expenses', { supplier, supplier_nif: extra.noNif ? '' : nif, number, date: iso(off), concept: extra.concept || '', category: cat, base_cents: base, vat_rate: rate, vat_cents: vat, irpf_cents: irpf, total_cents: total, deductible_pct: extra.ded ?? 100, paid: true, pay_method: 'transferencia', recurring: extra.recurring ? 'monthly' : '', notes: '', files: f, draft: false, source: 'manual', created_at: created(off) });
  };
  for (let k = 0; k < 4; k++) {
    const o = -k * 30 - 3;
    exp(o, 'Inmobiliaria Fina Carpe', 'B30111222', `AL-${4 - k}`, 'alquiler', 40000, 21, { irpf: 7600, concept: 'Alquiler del puesto', recurring: true });
    exp(o - 4, 'Suministros del Segura', 'A30222333', `SU-${204 - k}`, 'suministros', 6500, 21, { concept: 'Electricidad' });
    exp(o - 6, 'Fibra Murcia Telecom', 'B30333444', `FM-${88 - k}`, 'suministros', 3000, 21, { concept: 'Internet y móvil', recurring: true });
    exp(o - 9, 'Gestoría Levante', 'B30444555', `GL-${12 - k}`, 'asesoria', 6000, 21, { concept: 'Cuota de asesoría', recurring: true });
    exp(o - 12, 'Agenda Pro Software', 'ESB12345678', `AP-${900 - k}`, 'software', 2400, 21, { concept: 'Suscripción', recurring: true, noNif: k === 3 });
  }
  exp(-15, 'Pigmentos Levante SL', 'B30555666', 'PL-2041', 'pigmentos', 28000, 21, { concept: 'Pigmentos y cartuchos' });
  exp(-47, 'Pigmentos Levante SL', 'B30555666', 'PL-1988', 'pigmentos', 24500, 21, { concept: 'Pigmentos y agujas' });
  exp(-78, 'Pigmentos Levante SL', 'B30555666', 'PL-1902', 'pigmentos', 31000, 21, { concept: 'Pedido trimestral' });
  exp(-20, 'Higiene Profesional SA', 'A30666777', 'HP-5521', 'material', 9000, 21, { concept: 'Guantes, desechables y desinfección' });
  exp(-62, 'Higiene Profesional SA', 'A30666777', 'HP-5410', 'material', 8200, 21, { concept: 'Material desechable' });
  exp(-33, 'Academia Brow Artists', 'B30777888', 'AB-310', 'formacion', 45000, 21, { concept: 'Curso de hiperrealismo' });
  exp(-100, 'Mobiliario Estética SL', 'B30888999', 'ME-77', 'equipamiento', 120000, 21, { concept: 'Camilla y lámpara de trabajo' });
  exp(-70, 'Seguros Costa Sur', 'A30999000', 'SC-9012', 'seguros', 18000, 0, { concept: 'Responsabilidad civil anual' });
  exp(-10, 'Imprenta Rápida', 'B30101010', 'IR-445', 'marketing', 5500, 21, { concept: 'Tarjetas y cartelería', noFile: true });
  // facturas subidas pendientes de revisar
  const d1 = mkFile('scan-0041.pdf', 'Factura escaneada', ['Documento subido sin leer']);
  store.insert('expenses', { supplier: '', supplier_nif: '', number: '', date: today, concept: '', category: 'otros', base_cents: 0, vat_rate: 21, vat_cents: 0, irpf_cents: 0, total_cents: 0, deductible_pct: 100, paid: true, pay_method: '', recurring: '', notes: 'Lectura automática desactivada: completa los datos a mano.', files: d1.length ? [{ ...d1[0], name: 'scan-0041.pdf' }] : [], draft: true, source: 'subida', created_at: created(0) });
  const d2 = mkFile('factura-luz-oct.pdf', 'Factura de electricidad', ['Suministros del Segura', 'Total 78,65 EUR']);
  store.insert('expenses', { supplier: 'Suministros del Segura', supplier_nif: 'A30222333', number: 'SU-209', date: iso(-2), concept: 'Electricidad', category: 'suministros', base_cents: 6500, vat_rate: 21, vat_cents: 1365, irpf_cents: 0, total_cents: 7865, deductible_pct: 100, paid: true, pay_method: '', recurring: '', notes: '', files: d2.length ? [{ ...d2[0], name: 'factura-luz-oct.pdf' }] : [], draft: true, source: 'subida', created_at: created(-2) });

  // ajustes de ejemplo
  store.setSetting('legalName', 'Noelia Duque (nombre fiscal de ejemplo)'); store.setSetting('nif', '00000000X');
  store.setSetting('gestoria', { name: 'Gestoría Levante', email: 'asesoria@ejemplo.com', cc: '', note: '' });
  store.setSetting('targetNetMonthlyCents', 180000); store.setSetting('autonomoFeeMonthlyCents', 29400); store.setSetting('fixedExtraMonthlyCents', 0);
  store.setSetting('siteUrl', 'https://www.ejemplo.es');
  // bonos, pedidos y referidos de ejemplo
  const vch = (code, amount, balance, status, who, extra = {}) => store.insert('vouchers', { code, amount_cents: amount, balance_cents: balance, status, source: 'web', buyer_name: who[0], buyer_email: who[1], buyer_phone: '', recipient_name: who[2], recipient_email: '', message: extra.message || '', paid: status !== 'pendiente', pay_method: status !== 'pendiente' ? 'bizum' : '', created_at: created(extra.age || -10), paid_at: status !== 'pendiente' ? created(extra.age || -10) : '', expires_at: status !== 'pendiente' ? iso(300) : '', history: extra.history || [] });
  vch('NOE-7KQ2-M4XD', 10000, 10000, 'activo', ['Lucía Mora', 'lucia.mora@ejemplo.com', 'Irene Molina'], { message: 'Feliz cumpleaños, te lo mereces.', age: -12 });
  vch('NOE-B9TH-2WRA', 5000, 2000, 'activo', ['Carmen Ruiz', 'carmen.ruiz@ejemplo.com', 'Alba Torres'], { age: -40, history: [{ at: created(-20), delta: -3000, note: 'Peeling con ácidos · Alba Torres' }] });
  vch('NOE-4PZD-8CNE', 5000, 5000, 'pendiente', ['Elena Gil', 'elena.gil@ejemplo.com', 'Sara'], { message: 'Para que te cuides un poco.', age: -1 });
  const pr = store.list('products');
  if (pr.length > 1) {
    store.insert('orders', { client_id: ids[1], items: [{ product_id: pr[0].id, name: pr[0].name, qty: 1, price_cents: pr[0].price_cents, vat_rate: 21 }], total_cents: pr[0].price_cents, name: 'Carmen Ruiz Soto', email: 'carmen.ruiz@ejemplo.com', phone: '', notes: '', status: 'entregado', paid_cents: pr[0].price_cents, pay_method: 'efectivo', paid_date: iso(-9), token: randomHex(12), created_at: created(-9) });
    store.insert('orders', { client_id: ids[2], items: [{ product_id: pr[1].id, name: pr[1].name, qty: 2, price_cents: pr[1].price_cents, vat_rate: 21 }], total_cents: pr[1].price_cents * 2, name: 'Alba Torres Vera', email: 'alba.torres@ejemplo.com', phone: '', notes: 'Lo recojo el jueves', status: 'pendiente', paid_cents: 0, pay_method: '', paid_date: '', token: randomHex(12), created_at: created(-1) });
  }
  return { clients: ids.length + 1, bookings: plan.length };
}
