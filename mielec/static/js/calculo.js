// Motor de cálculo del simulador de factura. Sin DOM: se prueba con `node prueba.mjs`.
// Todo son funciones puras: el mismo estado da siempre el mismo resultado.

export const TARIFAS = {
  '2.0TD': { nPot: 2, nEn: 3, pot: ['P1 punta', 'P2 valle'], en: ['P1 punta', 'P2 llano', 'P3 valle'], desc: 'Hasta 15 kW (hogares, comercios y pymes pequeñas)' },
  '3.0TD': { nPot: 6, nEn: 6, pot: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], en: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], desc: 'Más de 15 kW en baja tensión' },
  '6.1TD': { nPot: 6, nEn: 6, pot: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], en: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], desc: 'Alta tensión hasta 30 kV' },
};

// Factor para pasar cada unidad de precio a "€ por kW y día" o "€ por kWh"
export const UNI_POT = { dia: 1, mes: 12 / 365, anio: 1 / 365 };
export const UNI_EN = { eur: 1, cent: 0.01, mwh: 0.001 };
export const UNI_FIJA = { dia: 1, mes: 12 / 365, anio: 1 / 365 };
const DIAS_MES = 365 / 12;

export const APLICA = {
  potencia: 'Término de potencia',
  energia: 'Término de energía',
  electricidad: 'Potencia + energía',
  servicio: 'Un servicio concreto',
  servicios: 'Todos los servicios',
  total: 'Toda la factura (electricidad + servicios)',
};

// Reparto por defecto de los periodos de energía según cuántos precios distintos da la comercializadora
export function gruposPorDefecto(tarifa, n) {
  const np = TARIFAS[tarifa].nEn;
  if (np === 3) return { 1: [0, 0, 0], 2: [0, 0, 1], 3: [0, 1, 2] }[Math.min(n, 3)];
  const t = { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 1, 1], 3: [0, 0, 1, 1, 2, 2], 4: [0, 1, 2, 2, 3, 3], 5: [0, 1, 2, 3, 4, 4], 6: [0, 1, 2, 3, 4, 5] };
  return t[Math.min(n, 6)];
}

export const num = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

export function ladoVacio(tarifa = '2.0TD') {
  const t = TARIFAS[tarifa];
  return {
    nombre: '',
    potencia: { unidad: 'dia', unico: false, contratada: Array(6).fill(''), precios: Array(6).fill('') },
    energia: { unidad: 'eur', nPrecios: t.nEn, grupos: gruposPorDefecto(tarifa, t.nEn), precios: Array(6).fill('') },
    compensacion: { precio: '' },
    otros: [],
    servicios: [],
    descuentos: [],
    permanencia: { meses: '', penalizacion: '' },
    alquilerPropio: { activo: false, importe: '', unidad: 'mes' },
    real: { total: '' },
  };
}

export function estadoVacio() {
  return {
    cliente: { nombre: '', cups: '', tarifa: '2.0TD', dias: 30, inicio: '', fin: '', consumo: Array(6).fill(''), excedentes: '', uso: 'domestico', alquiler: { importe: '', unidad: 'mes' }, cargos: [] },
    perfil: { modo: 'plano', inicio: '', refMes: -1, variacion: Array(12).fill(''), real: Array.from({ length: 12 }, () => ({ total: '', kwh: Array(6).fill('') })), porPeriodos: false, fuente: '' },
    fiscal: { iva: 21, iee: 5.11269632, alquilerIEE: false },
    horizonte: 12,
    incluirPenalizacion: true,
    actual: ladoVacio(),
    propuesta: ladoVacio(),
  };
}

// ---------------------------------------------------------------------------
// Factura de un periodo. `mes` es el número de mensualidad dentro del horizonte (1 = primera):
// sirve para saber si un descuento o un servicio todavía está en vigor.
// ---------------------------------------------------------------------------
export function facturar(e, lado, mes = 1, dias = null, o = {}) {
  const cl = e.cliente;
  const t = TARIFAS[cl.tarifa];
  const diasRef = Math.max(1, num(cl.dias));
  const d = dias ?? diasRef;
  const esc = d / diasRef; // escala del consumo y de importes fijos por periodo

  // Término de potencia
  const fp = UNI_POT[lado.potencia.unidad] ?? 1;
  const pot = [];
  for (let i = 0; i < t.nPot; i++) {
    const kw = num(lado.potencia.contratada[i]);
    const precio = num(lado.potencia.unico ? lado.potencia.precios[0] : lado.potencia.precios[i]);
    pot.push({ etiqueta: t.pot[i], kw, precio, importe: kw * precio * fp * d });
  }
  const potBruto = pot.reduce((s, x) => s + x.importe, 0);

  // Término de energía: cada periodo de acceso cae en un grupo de precio
  const fe = UNI_EN[lado.energia.unidad] ?? 1;
  const en = [];
  for (let i = 0; i < t.nEn; i++) {
    const kwh = o.kwh ? num(o.kwh[i]) : num(cl.consumo[i]) * esc;
    const g = lado.energia.grupos[i] ?? i;
    const precio = num(lado.energia.precios[g]);
    en.push({ etiqueta: t.en[i], kwh, precio, importe: kwh * precio * fe });
  }
  const kwhTotal = en.reduce((s, x) => s + x.kwh, 0);
  const enBruto = en.reduce((s, x) => s + x.importe, 0);

  // Excedentes de autoconsumo (compensación simplificada, nunca por encima de la energía)
  const comp = Math.min(enBruto, num(cl.excedentes) * (o.escExc ?? esc) * num(lado.compensacion.precio) * fe);
  const enNeto0 = enBruto - comp;

  // Alquiler de equipos de medida y otros conceptos fijos
  // El alquiler del contador es común a las dos facturas (lo fija la distribuidora)
  const A = (lado.alquilerPropio && lado.alquilerPropio.activo) ? lado.alquilerPropio : (cl.alquiler || { importe: '', unidad: 'mes' });
  const alq = o.mensual ? num(A.importe) * ({ mes: 1, anio: 1 / 12, dia: d }[A.unidad] ?? 1) : num(A.importe) * (UNI_FIJA[A.unidad] ?? 1) * d;
  const otros = lado.otros.map((o) => ({ nombre: o.nombre || 'Otro concepto', importe: num(o.importe) * esc, tributaIEE: o.tributaIEE !== false }));

  // Servicios adicionales
  const servicios = lado.servicios.map((s) => {
    const vig = !(num(s.meses) > 0) || mes <= num(s.meses);
    let imp = 0;
    if (vig) {
      if (s.unidad === 'unico') imp = mes === 1 ? num(s.importe) : 0;
      else if (s.unidad === 'dia') imp = num(s.importe) * d;
      else if (s.unidad === 'anio') imp = o.mensual ? num(s.importe) / 12 : (num(s.importe) / 365) * d;
      else imp = o.mensual ? num(s.importe) : num(s.importe) * (d / DIAS_MES);
    }
    return { id: s.id, nombre: s.nombre || 'Servicio', bruto: imp, activo: vig, iva: s.iva !== false };
  });

  // Descuentos: cada uno se calcula sobre el importe original de lo que toca, y no puede dejar un concepto por debajo de 0
  const resto = { pot: potBruto, en: enNeto0 };
  servicios.forEach((s) => { resto['s' + s.id] = s.bruto; });
  const orig = { ...resto };
  const descuentos = [];
  const propios = lado.servicios.filter((x) => x.desc && x.desc.activo && num(x.desc.valor) > 0).map((x) => ({
    id: 'sd' + x.id, nombre: 'Descuento en ' + (x.nombre || 'servicio'), tipo: x.desc.tipo || 'pct', valor: x.desc.valor, aplica: 'servicio', servicioId: x.id, requiere: '', desde: x.desc.desde || 1, meses: x.desc.meses }));
  for (const dsc of [...lado.descuentos, ...propios]) {
    const valor = num(dsc.valor);
    const desde = Math.max(1, num(dsc.desde) || 1);
    const dur = num(dsc.meses);
    const vigente = mes >= desde && (!(dur > 0) || mes < desde + dur);
    const condOk = !dsc.requiere || serviciosPorId(lado, servicios, dsc.requiere);
    let objetivos = [];
    switch (dsc.aplica) {
      case 'potencia': objetivos = ['pot']; break;
      case 'energia': objetivos = ['en']; break;
      case 'electricidad': objetivos = ['pot', 'en']; break;
      case 'servicio': objetivos = dsc.servicioId ? ['s' + dsc.servicioId] : []; break;
      case 'servicios': objetivos = servicios.map((s) => 's' + s.id); break;
      case 'total': objetivos = ['pot', 'en', ...servicios.map((s) => 's' + s.id)]; break;
    }
    objetivos = objetivos.filter((k) => k in resto);
    let importe = 0;
    let motivo = '';
    if (!vigente) motivo = 'fuera de su periodo de vigencia';
    else if (!condOk) motivo = 'requiere un servicio que no está contratado';
    else if (!objetivos.length) motivo = 'no hay nada a lo que aplicarlo';
    else {
      const base = objetivos.reduce((s, k) => s + orig[k], 0);
      const disp = objetivos.reduce((s, k) => s + resto[k], 0);
      let bruto = 0;
      if (dsc.tipo === 'pct') bruto = base * valor / 100;
      else if (dsc.tipo === 'eur') bruto = o.mensual ? valor : valor * (d / DIAS_MES);
      else if (dsc.tipo === 'unico') bruto = mes === desde ? valor : 0;
      else if (dsc.tipo === 'eurkwh') bruto = valor * kwhTotal;
      importe = Math.max(0, Math.min(bruto, disp));
      if (disp > 0) objetivos.forEach((k) => { resto[k] -= importe * (resto[k] / disp); });
    }
    descuentos.push({ id: dsc.id, nombre: dsc.nombre || 'Descuento', aplica: dsc.aplica, importe, motivoNo: importe === 0 ? motivo : '' });
  }

  const potNeta = resto.pot;
  const enNeta = resto.en;
  servicios.forEach((s) => { s.neto = resto['s' + s.id]; });
  const servNeto = servicios.reduce((s, x) => s + x.neto, 0);
  const servBruto = servicios.reduce((s, x) => s + x.bruto, 0);
  // Cargos regulados comunes a las dos facturas (financiación del bono social, tasas...)
  for (const g of (cl.cargos || [])) {
    const v = num(g.importe);
    let imp = 0;
    if (g.tipo === 'pct') imp = v / 100 * (potNeta + enNeta);
    else imp = v * (o.mensual ? { dia: d, mes: 1, anio: 1 / 12 }[g.unidad] ?? 1 : (UNI_FIJA[g.unidad] ?? 1) * d);
    otros.push({ nombre: g.nombre || 'Cargo regulado', importe: imp, tributaIEE: g.tributaIEE !== false, comun: true });
  }
  const otrosTotal = otros.reduce((s, o) => s + o.importe, 0);
  const cargosTotal = otros.filter((x) => x.comun).reduce((s, x) => s + x.importe, 0);

  // Impuesto especial sobre la electricidad (con su mínimo por MWh) e IVA
  const baseIee = potNeta + enNeta + otros.filter((o) => o.tributaIEE).reduce((s, o) => s + o.importe, 0) + (e.fiscal.alquilerIEE ? alq : 0);
  const minIee = (kwhTotal / 1000) * (cl.uso === 'domestico' ? 0.5 : 1);
  const iee = baseIee > 0 ? Math.max(baseIee * num(e.fiscal.iee) / 100, minIee) : 0;
  const baseIva = potNeta + enNeta + otrosTotal + alq + iee + servicios.filter((s) => s.iva).reduce((s, x) => s + x.neto, 0);
  const iva = baseIva * num(e.fiscal.iva) / 100;
  const sinIva = servicios.filter((s) => !s.iva).reduce((s, x) => s + x.neto, 0);
  const total = potNeta + enNeta + otrosTotal + alq + servNeto + iee + iva;
  const descTotal = descuentos.reduce((s, x) => s + x.importe, 0);

  return {
    dias: d, kwh: kwhTotal, pot, en, potBruto, enBruto, comp, alq, otros, servicios, servBruto, servNeto,
    descuentos, descTotal, potNeta, enNeta, otrosTotal, cargosTotal, baseIee, iee, baseIva, iva, sinIva, total,
    electricidad: potNeta + enNeta + otrosTotal + alq + iee,
  };
}

function serviciosPorId(lado, servicios, id) {
  // Contratado = existe y está en vigor ese mes (un servicio gratuito también cuenta)
  const s = servicios.find((x) => x.id === id);
  return !!(s && s.activo);
}

// ---------------------------------------------------------------------------
// Calendario y perfil de consumo (para simular un año realista)
// ---------------------------------------------------------------------------
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const diasDelMes = (y, m) => new Date(y, m + 1, 0).getDate();

// Mes (0-11) al que pertenece la factura de referencia: el punto medio de sus fechas, o el que se haya elegido
export function mesReferencia(e) {
  const p = e.perfil || {};
  if (p.refMes >= 0 && p.refMes <= 11) return p.refMes;
  const c = e.cliente;
  if (c.inicio && c.fin) {
    const a = new Date(c.inicio + 'T00:00'); const b = new Date(c.fin + 'T00:00');
    return new Date((a.getTime() + b.getTime()) / 2).getMonth();
  }
  return new Date().getMonth();
}

export function calendario(e, H) {
  const p = e.perfil || {};
  let y; let m;
  if (/^\d{4}-\d{2}$/.test(p.inicio || '')) { y = +p.inicio.slice(0, 4); m = +p.inicio.slice(5, 7) - 1; } else { const h = new Date(); y = h.getFullYear(); m = h.getMonth() + 1; if (m > 11) { m = 0; y++; } }
  return Array.from({ length: H }, (_, i) => {
    const t = m + i; const yy = y + Math.floor(t / 12); const mm = t % 12;
    return { n: i + 1, y: yy, m: mm, dias: diasDelMes(yy, mm) };
  });
}

// Consumo de un mes del calendario: { kwh: [por periodo], factor, real: bool }
export function consumoMes(e, mCal, dias) {
  const cl = e.cliente; const t = TARIFAS[cl.tarifa]; const p = e.perfil || { modo: 'plano' };
  const diasRef = Math.max(1, num(cl.dias));
  const ref = Array.from({ length: t.nEn }, (_, i) => num(cl.consumo[i]));
  const refTot = ref.reduce((s, x) => s + x, 0);
  const porDia = ref.map((x) => x / diasRef);
  const v = p.modo === 'plano' ? 0 : num((p.variacion || [])[mCal]);
  const estimado = porDia.map((x) => x * dias * (1 + v / 100));
  let kwh = estimado; let real = false;
  if (p.modo === 'real') {
    const r = (p.real || [])[mCal] || {};
    const porP = (r.kwh || []).slice(0, t.nEn).map(num);
    if (p.porPeriodos && porP.some((x) => x > 0)) { kwh = porP; real = true; }
    else if (num(r.total) > 0) { kwh = ref.map((x) => (refTot > 0 ? x / refTot : 1 / t.nEn) * num(r.total)); real = true; }
  }
  const tot = kwh.reduce((s, x) => s + x, 0);
  const totRefMes = refTot / diasRef * dias;
  return { kwh, real, total: tot, escExc: totRefMes > 0 ? tot / totRefMes : 1 };
}

// Proyección mes a mes con calendario real: días de cada mes, estacionalidad y consumos reales
export function proyectar(e, lado, meses = 12) {
  const filas = [];
  let total = 0;
  for (const c of calendario(e, meses)) {
    const cm = consumoMes(e, c.m, c.dias);
    const f = facturar(e, lado, c.n, c.dias, { mensual: true, kwh: cm.kwh, escExc: cm.escExc });
    filas.push({ mes: c.n, y: c.y, m: c.m, dias: c.dias, kwh: cm.total, real: cm.real, total: f.total, desc: f.descTotal, serv: f.servNeto,
      pot: f.potNeta, ener: f.enNeta, otros: f.otrosTotal + f.alq, imp: f.iee + f.iva });
    total += f.total;
  }
  return { filas, total, medio: meses ? total / meses : 0 };
}

// Todos los compromisos (contrato de energía y cada servicio con permanencia)
export function permanencias(lado, etiqueta) {
  const out = [];
  const m = Math.round(num(lado.permanencia.meses)); const pen = num(lado.permanencia.penalizacion);
  if (m > 0 || pen > 0) out.push({ nombre: etiqueta, meses: m, pen });
  for (const s of lado.servicios) {
    if (s.perm && s.perm.activa) out.push({ nombre: s.nombre || 'Servicio', meses: Math.round(num(s.perm.meses)), pen: num(s.perm.penalizacion) });
  }
  return out;
}

// Una sola factura: el mismo periodo y consumo que la factura analizada, sin proyectar a meses del calendario
function unaFactura(e, lado) {
  const f = facturar(e, lado, 1);
  const cl = e.cliente;
  const y = cl.fin ? +cl.fin.slice(0, 4) : new Date().getFullYear();
  const fila = { mes: 1, y, m: mesReferencia(e), dias: f.dias, kwh: f.kwh, real: false, total: f.total, desc: f.descTotal, serv: f.servNeto, pot: f.potNeta, ener: f.enNeta, otros: f.otrosTotal + f.alq, imp: f.iee + f.iva };
  return { filas: [fila], total: f.total, medio: f.total };
}

export function comparar(e) {
  const sf = e.horizonte === 'f';
  const H = sf ? 1 : Math.max(1, Math.min(120, Math.round(num(e.horizonte)) || 12));
  const refA = facturar(e, e.actual, 1);
  const refP = facturar(e, e.propuesta, 1);
  const pA = sf ? unaFactura(e, e.actual) : proyectar(e, e.actual, H);
  const pP = sf ? unaFactura(e, e.propuesta) : proyectar(e, e.propuesta, H);
  const ahorro = pA.total - pP.total;
  const permA = permanencias(e.actual, 'Contrato de energía actual');
  const permPr = permanencias(e.propuesta, 'Contrato de energía propuesto');
  const penal = e.incluirPenalizacion ? permA.reduce((s, x) => s + x.pen, 0) : 0;
  const neto = ahorro - penal;
  const ahorroMes = ahorro / H;

  // Ahorro acumulado mes a mes y mes en que se recupera la penalización
  let acum = 0; let mesRetorno = null;
  const meses = pA.filas.map((f, i) => {
    const a = f.total - pP.filas[i].total; acum += a;
    if (mesRetorno === null && penal > 0 && acum >= penal) mesRetorno = i + 1;
    return { ...f, totalA: f.total, totalP: pP.filas[i].total, ahorro: a, acum, kwhP: pP.filas[i].kwh };
  });
  const retorno = penal > 0 && ahorroMes > 0 ? (mesRetorno ?? penal / ahorroMes) : null;

  const sinServ = { ...e.propuesta, servicios: [] };
  const pS = sf ? unaFactura(e, sinServ) : proyectar(e, sinServ, H);

  const permP = permPr.reduce((m, x) => Math.max(m, x.meses), 0);
  const penP = permPr.reduce((s, x) => s + x.pen, 0);
  let ahorroPerm = null;
  if (permP > 0) { const n = Math.min(permP, 120); ahorroPerm = proyectar(e, e.actual, n).total - proyectar(e, e.propuesta, n).total; }

  const real = num(e.actual.real.total);
  const difReal = real > 0 ? refA.total - real : null;
  const recon = real > 0 ? { real, calculada: refA.total, dif: refA.total - real, ok: Math.abs(refA.total - real) <= Math.max(0.05, real * 0.005) } : null;
  const suma = (k, f) => f.filas.reduce((s, x) => s + x[k], 0);
  const comp = (f) => ({ pot: suma('pot', f), ener: suma('ener', f), serv: suma('serv', f), otros: suma('otros', f), imp: suma('imp', f), desc: suma('desc', f) });

  return {
    H, soloFactura: sf, refA, refP, pA, pP, meses, ahorro, ahorroPct: pA.total > 0 ? ahorro / pA.total * 100 : 0, ahorroMes,
    penal, neto, retorno, mesRetorno, sinServ: pS, ahorroSinServ: pA.total - pS.total,
    permP, penP, ahorroPerm, permA, permPr, real, difReal, recon,
    compA: comp(pA), compP: comp(pP), kwhAnual: suma('kwh', pA),
    avisos: avisos(e, refA, refP),
  };
}

export function avisos(e, a, p) {
  const out = [];
  const cl = e.cliente;
  const t = TARIFAS[cl.tarifa];
  const kwh = cl.consumo.slice(0, t.nEn).reduce((s, v) => s + num(v), 0);
  if (!(num(cl.dias) > 0)) out.push(['err', 'Falta el número de días del periodo.']);
  if (!(kwh > 0)) out.push(['err', 'Falta el consumo en kWh del periodo.']);
  for (const [nom, lado] of [['actual', e.actual], ['propuesta', e.propuesta]]) {
    const L = nom === 'actual' ? 'Factura actual' : 'Propuesta';
    const kw = lado.potencia.contratada.slice(0, t.nPot).reduce((s, v) => s + num(v), 0);
    if (!(kw > 0)) out.push(['err', `${L}: falta la potencia contratada.`]);
    const pp = lado.potencia.precios.slice(0, lado.potencia.unico ? 1 : t.nPot).map(num);
    if (pp.every((x) => x === 0)) out.push(['err', `${L}: falta el precio de la potencia.`]);
    else {
      const u = lado.potencia.unidad;
      const mx = Math.max(...pp);
      if (u === 'dia' && mx > 1) out.push(['aviso', `${L}: el precio de potencia ${mx} €/kW·día es muy alto. ¿Es en €/kW·año o €/kW·mes?`]);
      if (u === 'anio' && mx < 3) out.push(['aviso', `${L}: el precio de potencia ${mx} €/kW·año es muy bajo. ¿Es en €/kW·día o €/kW·mes?`]);
      if (u === 'mes' && mx > 12) out.push(['aviso', `${L}: el precio de potencia ${mx} €/kW·mes es muy alto. ¿Es en €/kW·año?`]);
    }
    if (cl.tarifa === '2.0TD' && !lado.potencia.unico) {
      const p1 = num(lado.potencia.precios[0]); const p2 = num(lado.potencia.precios[1]);
      if (p1 > 0 && p2 > p1) out.push(['aviso', `${L}: el precio de potencia del P2 (${p2}) es mayor que el del P1 (${p1}). Normalmente el P1 es más caro. Revisa que no estén cambiados.`]);
    }
    {
      const pr = lado.energia.grupos.slice(0, t.nEn).map((g) => num(lado.energia.precios[g]));
      if (cl.tarifa === '2.0TD' && pr[0] > 0 && pr[2] > pr[0]) out.push(['aviso', `${L}: el precio de energía del valle (P3) es mayor que el de punta (P1). Normalmente es al revés. Revisa que no estén cambiados.`]);
    }
    const g = lado.energia.grupos.slice(0, t.nEn);
    const usados = [...new Set(g)];
    if (!usados.some((k) => num(lado.energia.precios[k]) === 0)) {
      const u = lado.energia.unidad;
      const mx = Math.max(...usados.map((k) => num(lado.energia.precios[k])));
      if (u === 'eur' && mx > 1) out.push(['aviso', `${L}: ${mx} €/kWh es muy alto. ¿Está en céntimos (c€/kWh) o €/MWh?`]);
      if (u === 'cent' && mx < 1) out.push(['aviso', `${L}: ${mx} c€/kWh es muy bajo. ¿Está en €/kWh?`]);
      if (u === 'mwh' && mx < 5) out.push(['aviso', `${L}: ${mx} €/MWh es muy bajo. ¿Está en €/kWh?`]);
    }
    for (const dsc of lado.descuentos) {
      if (dsc.requiere && !lado.servicios.find((s) => s.id === dsc.requiere)) out.push(['aviso', `${L}: el descuento "${dsc.nombre || 'sin nombre'}" depende de un servicio que ya no existe.`]);
      if (dsc.aplica === 'servicio' && !lado.servicios.find((s) => s.id === dsc.servicioId)) out.push(['aviso', `${L}: el descuento "${dsc.nombre || 'sin nombre'}" no tiene servicio elegido.`]);
    }
  }
  const pf = e.perfil || {};
  if (pf.modo === 'variacion' && (pf.variacion || []).some((v) => Math.abs(num(v)) > 90)) out.push(['aviso', 'Hay variaciones mensuales de más del 90 %: revisa que no estén al revés.']);
  if (pf.modo === 'real' && !(pf.real || []).some((r) => num(r.total) > 0 || (r.kwh || []).some((x) => num(x) > 0))) out.push(['aviso', 'Has elegido consumos reales pero no hay ninguno: se usará el consumo de la factura.']);
  if (cl.tarifa !== '2.0TD' && pf.modo === 'variacion') out.push(['info', 'En 3.0TD y 6.1TD los periodos horarios cambian con la temporada. Para más precisión, usa consumos reales por periodos.']);
  const real = num(e.actual.real.total);
  if (real > 0 && a.total > 0 && Math.abs(a.total - real) / real > 0.02) {
    out.push(['aviso', `El cálculo de la factura actual (${r2(a.total)} €) no coincide con el importe real (${r2(real)} €). Revisa precios, impuestos o conceptos que falten: la comparación depende de que la actual cuadre.`]);
  }
  return out;
}

export const nuevoId = () => Math.random().toString(36).slice(2, 8);

// Escenario para probar "¿y si...?" sin tocar los datos: consumo +/- %, servicios fuera, otro horizonte, sin penalización.
// `o.sinServicios` lleva claves "actual:ID" o "propuesta:ID".
export function escenario(e, o = {}) {
  const x = JSON.parse(JSON.stringify(e));
  const f = 1 + num(o.pct) / 100;
  const esc = (v) => (v === '' || v === null || v === undefined ? '' : String(+(num(v) * f).toFixed(4)));
  if (f !== 1) {
    x.cliente.consumo = x.cliente.consumo.map(esc);
    x.cliente.excedentes = esc(x.cliente.excedentes);
    if (x.perfil && x.perfil.real) x.perfil.real = x.perfil.real.map((r) => ({ total: esc(r.total), kwh: (r.kwh || []).map(esc) }));
  }
  const off = new Set(o.sinServicios || []);
  for (const k of ['actual', 'propuesta']) x[k].servicios = x[k].servicios.filter((s) => !off.has(k + ':' + s.id));
  if (o.H) x.horizonte = o.H;
  if (o.penalizacion === false) x.incluirPenalizacion = false;
  return x;
}
