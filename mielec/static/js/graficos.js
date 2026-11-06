import { n } from './util.js';

const W = 340;

// Barras por hora; `linea` = precio del usuario; `ahora` = hora actual a resaltar
export function barrasHoras(horas, { linea = null, ahora = -1 } = {}) {
  const vals = horas.map((x) => x.v);
  const max = Math.max(...vals, linea || 0) * 1.12;
  const min = Math.min(...vals);
  const H = 150, base = 128, top = 12;
  const alto = (v) => Math.max(3, (v / max) * (base - top));
  const orden = [...vals].sort((a, b) => a - b);
  const t1 = orden[Math.floor(orden.length / 3)], t2 = orden[Math.floor((orden.length * 2) / 3)];
  const bw = W / horas.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Precio por horas"><defs><linearGradient id="gLo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fe08c"/><stop offset="1" stop-color="#25b05a"/></linearGradient><linearGradient id="gMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84d"/><stop offset="1" stop-color="#f5a400"/></linearGradient><linearGradient id="gHi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset="1" stop-color="#ec4d3d"/></linearGradient></defs>`;
  horas.forEach((x, i) => {
    const h = alto(x.v);
    const cl = x.v <= t1 ? 'lo' : x.v <= t2 ? 'mid' : 'hi';
    s += `<rect style="--i:${i}" class="b ${cl}${x.h === ahora ? ' now' : ''}" x="${(i * bw + bw * 0.14).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(bw * 0.72).toFixed(1)}" height="${h.toFixed(1)}" rx="${(bw * 0.2).toFixed(1)}"/>`;
  });
  if (linea) {
    const y = base - alto(linea);
    s += `<line class="mio" x1="0" x2="${W}" y1="${y}" y2="${y}"/><text class="et" x="${W - 2}" y="${Math.max(10, y - 4)}" text-anchor="end">tu precio ${n(linea, 3)}</text>`;
  }
  [0, 6, 12, 18, 23].forEach((h) => {
    const i = horas.findIndex((x) => x.h === h);
    if (i >= 0) s += `<text class="ej" x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${h}h</text>`;
  });
  return s + '</svg>';
}

// Línea de medias diarias con la línea del precio del usuario; puntos verdes = por debajo
export function lineaDias(dias, valor, { linea = null } = {}) {
  if (dias.length < 2) return '<p class="vacio">Aún no hay suficientes días.</p>';
  const H = 170, l = 8, r = 8, t = 16, b = 26;
  const vs = dias.map(valor);
  const max = Math.max(...vs, linea || 0), min = Math.min(...vs, linea || Infinity);
  const pad = (max - min) * 0.18 || 0.01;
  const y = (v) => t + (1 - (v - (min - pad)) / (max - min + pad * 2)) * (H - t - b);
  const x = (i) => l + (i / (dias.length - 1)) * (W - l - r);
  const pts = vs.map((v, i) => [x(i), y(v)]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="Precio medio por día">`;
  s += `<path class="area" d="${path} L${pts[pts.length - 1][0]} ${H - b} L${pts[0][0]} ${H - b}Z"/><path class="ln" d="${path}"/>`;
  if (linea) {
    const yy = y(linea);
    s += `<line class="mio" x1="0" x2="${W}" y1="${yy}" y2="${yy}"/><text class="et" x="${W - 2}" y="${yy - 5}" text-anchor="end">tu precio ${n(linea, 3)}</text>`;
  }
  pts.forEach((p, i) => {
    const bajo = linea != null && vs[i] < linea;
    s += `<circle class="pt${bajo ? ' bajo' : ''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 5 : 3.5}"/>`;
  });
  const paso = dias.length > 10 ? 3 : 2;
  dias.forEach((d, i) => {
    if ((dias.length - 1 - i) % paso === 0) s += `<text class="ej" x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${+d.fecha.slice(8)}/${+d.fecha.slice(5, 7)}</text>`;
  });
  return s + '</svg>';
}

// Barra apilada horizontal con leyenda
export function apilada(partes) {
  const tot = partes.reduce((s, p) => s + Math.max(0, p.v), 0) || 1;
  let s = '<div class="apil">';
  partes.filter((p) => p.v > 0).forEach((p) => { s += `<i style="width:${(p.v / tot * 100).toFixed(2)}%;background:${p.c}"></i>`; });
  s += '</div><div class="leyenda">';
  partes.filter((p) => p.v > 0).forEach((p) => { s += `<span><b style="background:${p.c}"></b>${p.n} ${n(p.v / tot * 100, 0)} %</span>`; });
  return s + '</div>';
}

// Barras agrupadas hoy / oferta por mes (máx. 12 meses)
export function barrasMeses(meses, colores = { a: '#b9bcc4', p: '#f5a400' }) {
  const m = meses.slice(0, 12);
  const H = 170, base = 144, top = 10;
  const max = Math.max(...m.map((x) => Math.max(x.totalA, x.totalP))) * 1.08 || 1;
  const bw = W / m.length;
  const NM = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  let s = `<svg viewBox="0 0 ${W} ${H}" class="gr">`;
  m.forEach((x, i) => {
    const ha = (x.totalA / max) * (base - top), hp = (x.totalP / max) * (base - top);
    const x0 = i * bw + bw * 0.1, w = bw * 0.38;
    s += `<rect x="${x0.toFixed(1)}" y="${(base - ha).toFixed(1)}" width="${w.toFixed(1)}" height="${ha.toFixed(1)}" rx="3" fill="${colores.a}"/>`;
    s += `<rect x="${(x0 + w + 1).toFixed(1)}" y="${(base - hp).toFixed(1)}" width="${w.toFixed(1)}" height="${hp.toFixed(1)}" rx="3" fill="${colores.p}"/>`;
    s += `<text class="ej" x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${NM[x.m]}</text>`;
  });
  return s + '</svg>';
}
