(function () {
  "use strict";
  var LESSONS = window.LESSONS, app = document.getElementById("app");
  var KEY = "signa.v3", PASS = 0.7, GOAL = 40, DAYS = [0, 1, 3, 7], MS = 864e5;
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Estado (localStorage puede fallar) ----------
  var state = load();
  function load() {
    var d = { xp: 0, streak: 0, last: "", done: {}, best: {}, box: {}, due: {}, hist: {}, theme: "auto", slow: false, games: 0 };
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) for (var k in d) if (s[k] !== undefined) d[k] = s[k]; } catch (e) {}
    return d;
  }
  function day(off) { return new Date(Date.now() - (off || 0) * MS).toISOString().slice(0, 10); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} header(); }
  function addXp(n) {
    if (state.last !== day()) { state.streak = state.last === day(1) ? state.streak + 1 : 1; state.last = day(); }
    state.xp += n; state.hist[day()] = (state.hist[day()] || 0) + n; save();
  }
  function applyTheme() { var r = document.documentElement; if (state.theme === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", state.theme); }
  function header() {
    document.getElementById("streak").textContent = (state.last === day() || state.last === day(1)) ? state.streak : 0;
    document.getElementById("xp").textContent = state.xp;
  }

  // ---------- Utilidades ----------
  var ALL = [];
  LESSONS.forEach(function (l) { l.signs.forEach(function (s) { s.lesson = l.id; ALL.push(s); }); });
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lessonById(id) { return LESSONS.filter(function (l) { return l.id === id; })[0]; }
  function mastered(s) { return (state.box[s.id] || 0) >= 2; }
  function pct(l) { return Math.round(100 * l.signs.filter(mastered).length / l.signs.length); }
  function grade(id, ok) {
    var b = state.box[id] || 0; b = ok ? Math.min(b + 1, 3) : Math.max(b - 1, 0);
    state.box[id] = b; state.due[id] = Date.now() + DAYS[b] * MS;
  }
  function dueNow(s) { return state.due[s.id] === undefined || state.due[s.id] <= Date.now(); }
  function pending() { var p = ALL.filter(dueNow); return p; }
  function level() { return Math.floor(state.xp / 100) + 1; }
  function today() { return state.hist[day()] || 0; }

  // ---------- Dibujo: mano, escena y trayectoria ----------
  var SH = {
    open5: { f: [1, 1, 1, 1], t: "out", s: 1 }, flat: { f: [1, 1, 1, 1], t: "tuck" }, b: { f: [1, 1, 1, 1], t: "out" },
    fist: { f: [0, 0, 0, 0], t: "tuck" }, up: { f: [0, 0, 0, 0], t: "up" }, point: { f: [1, 0, 0, 0], t: "tuck" },
    v: { f: [1, 1, 0, 0], t: "tuck", s: 1 }, three: { f: [1, 1, 1, 0], t: "tuck", s: 1 }, four: { f: [1, 1, 1, 1], t: "tuck", s: 1 },
    y: { f: [0, 0, 0, 1], t: "out" }, l: { f: [1, 0, 0, 0], t: "out" }, i: { f: [0, 0, 0, 1], t: "tuck" }, rock: { f: [1, 0, 0, 1], t: "tuck" },
    c: { c: 1 }, o: { o: 1 }
  };
  var FX = [30, 39, 48, 57], FL = [38, 42, 38, 30], FA = [-9, -3, 3, 9];
  function handShape(name) {
    var h = SH[name] || SH.flat, o = "";
    if (h.c) return '<path class="cstroke" d="M66 36C22 36 22 112 66 112" stroke="var(--skin-line)" stroke-width="20"/><path class="cstroke" d="M66 36C22 36 22 112 66 112" stroke="var(--skin)" stroke-width="16"/><rect class="skin" x="58" y="30" width="22" height="12" rx="6"/><rect class="skin" x="58" y="106" width="22" height="12" rx="6"/>';
    if (h.o) return '<rect class="skin" x="29" y="74" width="40" height="38" rx="13"/><circle class="cstroke" cx="49" cy="58" r="20" stroke="var(--skin-line)" stroke-width="19"/><circle class="cstroke" cx="49" cy="58" r="20" stroke="var(--skin)" stroke-width="15"/>';
    o += '<rect class="skin" x="29" y="60" width="40" height="46" rx="13"/>';
    h.f.forEach(function (e, i) {
      var x = FX[i];
      if (e) o += '<rect class="skin" x="' + x + '" y="' + (64 - FL[i]) + '" width="8.6" height="' + (FL[i] + 8) + '" rx="4.3"' + (h.s ? ' transform="rotate(' + FA[i] + " " + (x + 4.3) + ' 66)"' : "") + "/>";
      else o += '<rect class="skin" x="' + x + '" y="54" width="8.6" height="24" rx="4.3"/>';
    });
    if (h.t === "out") o += '<rect class="skin" x="11" y="70" width="9.5" height="34" rx="4.7" transform="rotate(-32 26 100)"/>';
    else if (h.t === "up") o += '<rect class="skin" x="19" y="34" width="10.5" height="52" rx="5.2"/>';
    else o += '<rect class="skin" x="33" y="84" width="30" height="10.5" rx="5.2"/>';
    return o;
  }
  function htf(x, y, sc, rot) { return "translate(" + x + " " + y + ") rotate(" + rot + ") scale(" + sc + ") translate(-49 -78)"; }
  function handG(name, x, y, sc, rot, extra) { return '<g class="hand ' + (extra || "") + '" transform="' + htf(x, y, sc, rot) + '"' + (extra === "mh" || extra === "mh mir" ? "" : "") + ">" + handShape(name) + "</g>"; }
  var LOC = { sien: [128, 44], frente: [100, 30], ceja: [114, 48], mejilla: [124, 74], boca: [100, 82], barbilla: [100, 102], pecho: [100, 152], hombro: [152, 132], neutro: [138, 178] };
  var LOCNAME = { sien: "Sien", frente: "Frente", ceja: "Ceja", mejilla: "Mejilla", boca: "Boca", barbilla: "Barbilla", pecho: "Pecho", hombro: "Hombro", neutro: "Delante del cuerpo" };
  var MVNAME = { arrow: "Movimiento recto", shake: "Se agita", circle: "Gira", none: "Sin movimiento" };
  var SC = 0.6, uid = 0;

  function sceneSVG(s, opt) {
    opt = opt || {}; var id = "m" + (++uid);
    var a = LOC[s.loc] || LOC.neutro, rot = s.rot || 0, mv = s.mv || { t: "none" }, o = "", arrow = "", end = null, sx = a[0], sy = a[1];
    var m = 'marker-end="url(#' + id + ')"';
    var pts = [];
    if (mv.t === "arrow") {
      pts = mv.p.map(function (p) { return [a[0] + p[0] * 1.7, a[1] + p[1] * 1.7]; });
      end = pts[pts.length - 1];
      arrow = '<polyline class="mv' + (opt.anim ? "" : " mv-anim") + '" points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '" ' + m + "/>";
    } else if (mv.t === "shake") {
      var d = mv.a === "y" ? [0, 26] : [26, 0];
      arrow = '<line class="mv' + (opt.anim ? "" : " mv-anim") + '" x1="' + (a[0] - d[0]) + '" y1="' + (a[1] - d[1]) + '" x2="' + (a[0] + d[0]) + '" y2="' + (a[1] + d[1]) + '" marker-end="url(#' + id + ')" marker-start="url(#' + id + ')"/>';
    } else if (mv.t === "circle") {
      sx = a[0] + 26;
      arrow = '<path class="mv' + (opt.anim ? "" : " mv-anim") + '" d="M' + (a[0] + 26) + " " + a[1] + "A26 26 0 1 1 " + a[0] + " " + (a[1] - 26) + '" ' + m + "/>";
    }
    o += '<svg viewBox="0 -26 200 276" role="img" aria-label="' + esc(opt.label || "Ilustración de un signo") + '"' + (opt.anim && !REDUCED ? ' data-anim="1" data-mv=\'' + JSON.stringify({ t: mv.t, a: mv.a, p: pts, ax: a[0], ay: a[1], rot: rot, sc: SC }) + "'" : "") + '><defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="mvhead"/></marker></defs>';
    o += '<path class="sk-body" d="M22 250C22 158 56 122 100 120C144 122 178 158 178 250Z"/><rect class="sk-body" x="89" y="94" width="22" height="30" rx="8"/>';
    o += '<ellipse class="sk-face" cx="100" cy="62" rx="32" ry="38"/><circle class="sk-face" cx="68" cy="64" r="6"/><circle class="sk-face" cx="132" cy="64" r="6"/>';
    o += '<circle class="sk-eye" cx="88" cy="58" r="2.8"/><circle class="sk-eye" cx="112" cy="58" r="2.8"/><path class="sk-line" d="M84 49q4-3 8 0M108 49q4-3 8 0M93 80q7 5 14 0"/>';
    o += arrow;
    if (end) o += handG(s.shape, end[0], end[1], SC, rot, "hghost");
    o += '<g data-h="0">' + handG(s.shape, sx, sy, SC, rot) + "</g>";
    if (s.two) o += '<g data-h="1">' + handG(s.shape, 200 - sx, sy, SC, -rot) + "</g>";
    return o + "</svg>";
  }
  function stage(s, opt) { return '<div class="stage">' + sceneSVG(s, opt) + "</div>"; }
  function closeup(s) {
    var vb = s.two ? "0 0 150 130" : "0 0 100 130", g = '<g class="hand" transform="rotate(' + (s.rot || 0) + ' 49 78)">' + handShape(s.shape) + "</g>";
    if (s.two) g += '<g transform="translate(150 0) scale(-1 1)"><g class="hand" transform="rotate(' + (s.rot || 0) + ' 49 78)">' + handShape(s.shape) + "</g></g>";
    return '<div class="closeup"><svg viewBox="' + vb + '" role="img" aria-label="Forma de la mano">' + g + "</svg></div>";
  }
  function mediaHtml(s) {
    if (!s.media) return "";
    if (/\.(mp4|webm)$/i.test(s.media)) return '<video class="media" src="' + esc(s.media) + '" controls loop muted playsinline></video>';
    return '<img class="media" src="' + esc(s.media) + '" alt="Signo de ' + esc(s.word) + '">';
  }
  function chips(s) { return '<div class="chips"><span class="chip">' + LOCNAME[s.loc] + '</span><span class="chip">' + MVNAME[(s.mv || {}).t || "none"] + "</span>" + (s.two ? '<span class="chip">Dos manos</span>' : "") + "</div>"; }

  // ---------- Animación de la mano ----------
  var anims = [], raf = 0;
  function setupAnims() {
    anims = anims.filter(function (x) { return document.body.contains(x.svg); });
    [].forEach.call(app.querySelectorAll("svg[data-anim]"), function (svg) {
      if (anims.some(function (x) { return x.svg === svg; })) return;
      anims.push({ svg: svg, mv: JSON.parse(svg.dataset.mv), t0: performance.now(), hs: svg.querySelectorAll("[data-h]") });
    });
    if (anims.length && !raf) raf = requestAnimationFrame(tick);
  }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function tick(now) {
    raf = 0;
    anims = anims.filter(function (x) { return document.body.contains(x.svg); });
    anims.forEach(function (an) {
      var mv = an.mv, cycle = state.slow ? 5200 : 2600, u = ((now - an.t0) % cycle) / cycle, p = Math.min(1, Math.max(0, (u - 0.2) / 0.55)), x = mv.ax, y = mv.ay;
      if (mv.t === "arrow") {
        var P = mv.p, L = [], tot = 0, i;
        for (i = 1; i < P.length; i++) { var l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(l); tot += l; }
        var d = ease(p) * tot; x = P[0][0]; y = P[0][1];
        for (i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { var f = L[i] ? Math.min(1, d / L[i]) : 1; x = P[i][0] + (P[i + 1][0] - P[i][0]) * f; y = P[i][1] + (P[i + 1][1] - P[i][1]) * f; break; } d -= L[i]; }
      } else if (mv.t === "shake") {
        var q = (u - 0.1) / 0.8, w = q > 0 && q < 1 ? Math.sin(q * Math.PI * 6) * 26 : 0;
        if (mv.a === "y") y += w; else x += w;
      } else if (mv.t === "circle") {
        var th = ease(p) * 1.5 * Math.PI; x = mv.ax + 26 * Math.cos(th); y = mv.ay + 26 * Math.sin(th);
      }
      [].forEach.call(an.hs, function (h) {
        var two = h.dataset.h === "1";
        h.firstChild.setAttribute("transform", htf(two ? 200 - x : x, y, mv.sc, two ? -mv.rot : mv.rot));
      });
    });
    if (anims.length) raf = requestAnimationFrame(tick);
  }

  // ---------- Navegación en memoria ----------
  var cur = { v: "home" };
  function go(v, a) { cur = { v: v, a: a }; route(); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go]"); if (t) go(t.dataset.go, t.dataset.arg);
  });
  document.getElementById("theme").onclick = function () {
    state.theme = { auto: "dark", dark: "light", light: "auto" }[state.theme] || "auto"; applyTheme(); save();
    this.title = "Tema: " + { auto: "automático", dark: "oscuro", light: "claro" }[state.theme];
  };
  function render(html, nav) {
    app.innerHTML = html;
    [].forEach.call(document.querySelectorAll("[data-nav]"), function (b) { b.classList.toggle("on", b.dataset.nav === nav); });
    window.scrollTo(0, 0); setupAnims();
  }
  var keyFn = null;
  document.addEventListener("keydown", function (e) { if (keyFn && !/INPUT|TEXTAREA/.test(e.target.tagName)) keyFn(e); });
  function back(v, a) { return '<button class="back" data-go="' + v + '" data-arg="' + (a || "") + '">← Salir</button>'; }
  function speedBtn() { return '<button class="btn ghost sm" id="slow" aria-pressed="' + state.slow + '">' + (state.slow ? "Velocidad: lenta" : "Velocidad: normal") + "</button>"; }
  function bindSpeed() { var b = document.getElementById("slow"); if (b) b.onclick = function () { state.slow = !state.slow; save(); b.setAttribute("aria-pressed", state.slow); b.textContent = state.slow ? "Velocidad: lenta" : "Velocidad: normal"; }; }

  // ---------- Vistas ----------
  function goalRing(v, size) {
    var r = 26, c = 2 * Math.PI * r, f = Math.min(1, v / GOAL);
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" role="img" aria-label="Meta diaria: ' + v + " de " + GOAL + ' puntos"><circle cx="32" cy="32" r="' + r + '" class="rg-bg"/><circle cx="32" cy="32" r="' + r + '" class="rg-fg" stroke-dasharray="' + (c * f) + " " + c + '" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" class="rg-t">' + Math.min(v, GOAL) + "</text></svg>";
  }
  function home() {
    var next = LESSONS.filter(function (l) { return !state.done[l.id]; })[0] || LESSONS[0], demo = next.signs[0], due = pending().length;
    var h = '<section class="hero"><div><p class="eyebrow">Lengua de Signos Española</p><h1>Aprende signos viendo cómo se hacen</h1><p class="lead">Cada signo se anima con su forma de mano, su lugar en el cuerpo y su trayectoria. Estudia, repasa justo cuando toca y supera el test.</p>' +
      '<div class="row"><button class="btn" data-go="lesson" data-arg="' + next.id + '">' + (state.xp ? "Continuar: " : "Empezar: ") + esc(next.title) + '</button><button class="btn ghost" data-go="practica">Practicar</button></div></div>' + stage(demo, { anim: 1, label: "Signo de " + demo.word }) + "</section>";
    h += '<section class="daily"><div class="dcard">' + goalRing(today(), 64) + '<div><b>Meta de hoy</b><br><span class="muted">' + (today() >= GOAL ? "¡Cumplida!" : "Te faltan " + (GOAL - today()) + " puntos") + '</span></div></div><button class="dcard" data-go="cards" data-arg="repaso"><span class="num">' + due + '</span><div><b>Para repasar hoy</b><br><span class="muted">' + (due ? "Empieza el repaso" : "Todo al día") + '</span></div></button><div class="dcard"><span class="num">' + level() + '</span><div><b>Nivel</b><br><span class="muted">' + (100 - state.xp % 100) + " puntos para el siguiente</span></div></div></section>";
    h += "<h2>Lecciones</h2><div class=\"grid\">";
    LESSONS.forEach(function (l, i) {
      var p = pct(l), done = state.done[l.id];
      h += '<button class="lcard" data-go="lesson" data-arg="' + l.id + '">' + stage(l.signs[1] || l.signs[0]) + "<h3>" + esc(l.title) + "</h3><p>" + esc(l.desc) + '</p><div class="row between"><span class="badge' + (done ? " done" : "") + '">' + (done ? "Completada" : l.signs.length + " signos") + '</span><span class="muted">' + p + '%</span></div><div class="bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div></button>';
    });
    render(h + "</div>", "home");
  }

  function lesson(id, idx) {
    var l = lessonById(id); if (!l) return home();
    idx = idx || 0; var s = l.signs[idx];
    var h = '<button class="back" data-go="home">← Lecciones</button><h1>' + esc(l.title) + '</h1><p class="lead">' + esc(l.desc) + "</p>";
    h += '<section class="viewer">' + stage(s, { anim: 1, label: "Signo de " + s.word }) + '<div class="vside"><p class="muted">Signo ' + (idx + 1) + " de " + l.signs.length + '</p><p class="word">' + esc(s.word) + "</p>" + chips(s) + closeup(s) + "<p>" + esc(s.how) + "</p>" + mediaHtml(s) +
      '<div class="row">' + speedBtn() + '</div><div class="nav2"><button class="btn ghost" id="pv"' + (idx ? "" : " disabled") + '>Anterior</button><button class="btn" id="nx"' + (idx < l.signs.length - 1 ? "" : " disabled") + ">Siguiente</button></div></div></section>";
    h += '<div class="thumbs">' + l.signs.map(function (x, i) { return '<button class="thumb' + (i === idx ? " on" : "") + '" data-i="' + i + '">' + stage(x) + esc(x.word) + "</button>"; }).join("") + "</div>";
    h += '<div class="row" style="margin-top:20px"><button class="btn" data-go="test" data-arg="' + id + '">Hacer el test</button><button class="btn ghost" data-go="cards" data-arg="' + id + '">Tarjetas de repaso</button><button class="btn ghost" data-go="parejas" data-arg="' + id + '">Parejas</button></div>';
    render(h, "home");
    var pv = document.getElementById("pv"), nx = document.getElementById("nx");
    pv.onclick = function () { lesson(id, idx - 1); }; nx.onclick = function () { lesson(id, idx + 1); }; bindSpeed();
    [].forEach.call(document.querySelectorAll(".thumb"), function (b) { b.onclick = function () { lesson(id, +b.dataset.i); }; });
    keyFn = function (e) { if (e.key === "ArrowLeft" && idx) lesson(id, idx - 1); if (e.key === "ArrowRight" && idx < l.signs.length - 1) lesson(id, idx + 1); };
  }

  function cards(pool, bk, bkArg, title) {
    var deck = shuffle(pool).slice(0, 12), i = 0, shown = false;
    function draw() {
      if (!deck.length) return render('<div class="result"><div class="big">Todo al día</div><p class="lead" style="margin:8px auto 18px">No hay signos pendientes. Vuelve mañana o haz un test.</p><button class="btn" data-go="' + bk + '" data-arg="' + (bkArg || "") + '">Volver</button></div>', "practica");
      if (i >= deck.length) { addXp(5 + deck.length); return render('<div class="result"><div class="big">¡Listo!</div><p class="lead" style="margin:8px auto 18px">Has repasado ' + deck.length + " signos. +" + (5 + deck.length) + ' puntos</p><button class="btn" data-go="' + bk + '" data-arg="' + (bkArg || "") + '">Volver</button></div>', "practica"); }
      var s = deck[i];
      var h = back(bk, bkArg) + "<h1>" + esc(title) + '</h1><p class="muted">Tarjeta ' + (i + 1) + " de " + deck.length + '</p><div class="bar" style="margin-bottom:12px"><i style="width:' + (100 * i / deck.length) + '%"></i></div>';
      h += '<div class="flash">' + stage(s, { anim: 1 }) + (shown ? '<div class="w">' + esc(s.word) + "</div>" + chips(s) + "<div>" + esc(s.how) + "</div>" + mediaHtml(s) : '<div class="hint">¿Qué signo es? Piénsalo y pulsa para ver la respuesta.</div>') + "</div>";
      h += '<div class="row" style="margin-top:14px">' + (shown ? '<button class="btn ghost" id="no">Otra vez (1)</button><button class="btn" id="yes">Lo sabía (2)</button>' : '<button class="btn" id="show">Mostrar respuesta (Espacio)</button>') + speedBtn() + "</div>";
      render(h, "practica"); bindSpeed();
      if (shown) {
        var rate = function (ok) { grade(s.id, ok); save(); i++; shown = false; draw(); };
        document.getElementById("yes").onclick = function () { rate(true); }; document.getElementById("no").onclick = function () { rate(false); };
        keyFn = function (e) { if (e.key === "1") rate(false); if (e.key === "2" || e.key === "Enter") rate(true); };
      } else {
        var sh = function () { shown = true; draw(); };
        document.getElementById("show").onclick = sh;
        keyFn = function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); sh(); } };
      }
    }
    draw();
  }

  function quiz(pool, lessonId, bk, bkArg, title) {
    var qs = shuffle(pool).slice(0, 8), i = 0, ok = 0;
    function distract(s) {
      var same = shuffle(ALL.filter(function (x) { return x.id !== s.id && x.lesson === s.lesson; })).slice(0, 2);
      var rest = shuffle(ALL.filter(function (x) { return x.id !== s.id && same.indexOf(x) < 0; }));
      return same.concat(rest).slice(0, 3);
    }
    function draw() {
      if (i >= qs.length) return end();
      var s = qs[i], kind = ["see", "pick", "read"][Math.floor(Math.random() * 3)], opts = shuffle([s].concat(distract(s)));
      var h = back(bk, bkArg) + '<p class="muted">' + esc(title) + " · Pregunta " + (i + 1) + " de " + qs.length + "</p>";
      h += '<div class="q">' + (kind === "see" ? stage(s, { anim: 1 }) + "<b>¿Qué significa este signo?</b>" : kind === "pick" ? "<b>¿Cuál es el signo de «" + esc(s.word) + "»?</b>" : "<b>¿Qué signo se describe así?</b><span>" + esc(s.how) + "</span>") + "</div>";
      h += '<div class="opts' + (kind === "pick" ? " vis" : "") + '">' + opts.map(function (o) { return '<button class="opt" data-id="' + o.id + '">' + (kind === "pick" ? stage(o, { anim: 1 }) : esc(o.word)) + "</button>"; }).join("") + '</div><div class="fb" id="fb" role="status"></div><div id="nx"></div>';
      render(h, "practica"); keyFn = null;
      [].forEach.call(document.querySelectorAll(".opt"), function (b) {
        b.onclick = function () {
          var right = b.dataset.id === s.id;
          [].forEach.call(document.querySelectorAll(".opt"), function (x) { x.disabled = true; if (x.dataset.id === s.id) x.classList.add("ok"); });
          if (!right) b.classList.add("bad"); else ok++;
          grade(s.id, right); save();
          var fb = document.getElementById("fb"); fb.className = "fb " + (right ? "ok" : "bad"); fb.textContent = right ? "¡Correcto!" : "Era: " + s.word + ". " + s.how;
          document.getElementById("nx").innerHTML = '<button class="btn" id="go">' + (i + 1 < qs.length ? "Siguiente" : "Ver resultado") + "</button>";
          var go2 = document.getElementById("go"); go2.focus(); go2.onclick = function () { i++; draw(); };
        };
      });
    }
    function end() {
      var p = ok / qs.length, passed = p >= PASS, gain = ok * 10, first = false;
      if (lessonId) { state.best[lessonId] = Math.max(state.best[lessonId] || 0, Math.round(p * 100)); if (passed) { if (!state.done[lessonId]) { gain += 30; first = true; } state.done[lessonId] = true; } }
      addXp(gain);
      render('<div class="result"><div class="big">' + ok + " / " + qs.length + '</div><p class="lead" style="margin:8px auto 18px">' + (passed ? (first ? "¡Lección completada! " : "¡Muy bien! ") : "Casi. Necesitas un " + PASS * 100 + "% para completar la lección. ") + "+" + gain + ' puntos</p><div class="row" style="justify-content:center"><button class="btn" data-go="' + bk + '" data-arg="' + (bkArg || "") + '">Continuar</button><button class="btn ghost" id="again">Repetir</button></div></div>', "practica");
      document.getElementById("again").onclick = function () { quiz(pool, lessonId, bk, bkArg, title); };
    }
    draw();
  }

  function parejas(pool, bk, bkArg, title) {
    var set = shuffle(pool).slice(0, 6), tiles = [];
    set.forEach(function (s) { tiles.push({ s: s, k: "w" }); tiles.push({ s: s, k: "i" }); });
    tiles = shuffle(tiles);
    var open = [], found = {}, moves = 0, lock = false;
    function draw() {
      var h = back(bk, bkArg) + "<h1>Parejas</h1><p class=\"lead\">Une cada ilustración con su palabra. Movimientos: <b>" + moves + "</b></p><div class=\"memo\">";
      tiles.forEach(function (t, n) {
        var vis = found[t.s.id] || open.indexOf(n) >= 0;
        h += '<button class="tile' + (vis ? " up" : "") + (found[t.s.id] ? " found" : "") + '" data-n="' + n + '" aria-label="' + (vis ? (t.k === "w" ? t.s.word : "Ilustración") : "Carta oculta") + '">' + (vis ? (t.k === "w" ? "<span>" + esc(t.s.word) + "</span>" : stage(t.s)) : '<span class="q2">?</span>') + "</button>";
      });
      render(h + "</div>", "practica"); keyFn = null;
      [].forEach.call(document.querySelectorAll(".tile"), function (b) { b.onclick = function () { flip(+b.dataset.n); }; });
      if (Object.keys(found).length === set.length) {
        var gain = Math.max(10, 30 - moves); addXp(gain); state.games++; save();
        app.insertAdjacentHTML("beforeend", '<div class="result" style="margin-top:16px"><div class="big">¡Todas!</div><p class="lead" style="margin:8px auto 18px">' + moves + " movimientos. +" + gain + ' puntos</p><div class="row" style="justify-content:center"><button class="btn" data-go="' + bk + '" data-arg="' + (bkArg || "") + '">Continuar</button><button class="btn ghost" id="again">Jugar otra vez</button></div></div>');
        document.getElementById("again").onclick = function () { parejas(pool, bk, bkArg, title); };
      }
    }
    function flip(n) {
      if (lock || open.indexOf(n) >= 0 || found[tiles[n].s.id]) return;
      open.push(n); draw();
      if (open.length === 2) {
        moves++; var a = tiles[open[0]], b = tiles[open[1]];
        if (a.s.id === b.s.id && a.k !== b.k) { found[a.s.id] = 1; open = []; grade(a.s.id, true); save(); setTimeout(draw, 300); }
        else { lock = true; setTimeout(function () { open = []; lock = false; draw(); }, 900); }
      }
    }
    draw();
  }

  function practica() {
    var due = pending().length;
    render('<h1>Practicar</h1><p class="lead">Hoy toca repasar ' + due + " signos. El repaso espaciado te los vuelve a mostrar justo antes de que se olviden.</p>" +
      '<div class="grid"><button class="lcard" data-go="cards" data-arg="repaso"><h3>Tarjetas de repaso</h3><p>12 signos pendientes. Lo que fallas vuelve antes.</p></button><button class="lcard" data-go="test" data-arg="todo"><h3>Test mixto</h3><p>8 preguntas de todas las lecciones: ver, describir y elegir la ilustración.</p></button><button class="lcard" data-go="parejas" data-arg="todo"><h3>Parejas</h3><p>Juego de memoria: une ilustración y palabra.</p></button></div>', "practica");
  }

  var BADGES = [
    ["Primer paso", "Completa una lección", function () { return Object.keys(state.done).length >= 1; }],
    ["Constante", "Racha de 3 días", function () { return state.streak >= 3; }],
    ["Centenar", "Consigue 100 puntos", function () { return state.xp >= 100; }],
    ["Perfecto", "Un test con 100 %", function () { return Object.keys(state.best).some(function (k) { return state.best[k] === 100; }); }],
    ["Medio camino", "Completa 5 lecciones", function () { return Object.keys(state.done).length >= 5; }],
    ["Memoria", "Gana una partida de parejas", function () { return state.games >= 1; }],
    ["Conocedor", "Domina 20 signos", function () { return ALL.filter(mastered).length >= 20; }],
    ["Todo el curso", "Completa las 10 lecciones", function () { return Object.keys(state.done).length >= LESSONS.length; }]
  ];
  function progreso() {
    var m = ALL.filter(mastered).length, h = "<h1>Tu progreso</h1>";
    h += '<section class="daily"><div class="dcard">' + goalRing(today(), 64) + '<div><b>Meta de hoy</b><br><span class="muted">' + GOAL + ' puntos al día</span></div></div><div class="dcard"><span class="num">' + level() + '</span><div><b>Nivel</b><br><span class="muted">' + state.xp + " puntos en total</span></div></div><div class=\"dcard\"><span class=\"num\">" + m + '</span><div><b>Signos dominados</b><br><span class="muted">de ' + ALL.length + "</span></div></div></section>";
    var bars = "", mx = GOAL;
    for (var d = 6; d >= 0; d--) { var v = state.hist[day(d)] || 0; mx = Math.max(mx, v); }
    for (d = 6; d >= 0; d--) { v = state.hist[day(d)] || 0; var dn = new Date(Date.now() - d * MS).toLocaleDateString("es", { weekday: "short" }); bars += '<div class="col"><i style="height:' + Math.round(100 * v / mx) + '%"></i><span>' + dn + '</span><b>' + v + "</b></div>"; }
    h += '<h2>Últimos 7 días</h2><div class="week" role="img" aria-label="Puntos de los últimos 7 días">' + bars + "</div>";
    h += "<h2>Logros</h2><div class=\"badges\">" + BADGES.map(function (b) { var ok = b[2](); return '<div class="bdg' + (ok ? " got" : "") + '"><b>' + b[0] + "</b><span>" + b[1] + "</span><em>" + (ok ? "Conseguido" : "Pendiente") + "</em></div>"; }).join("") + "</div>";
    h += "<h2>Por lección</h2><div class=\"list\">" + LESSONS.map(function (l) { return '<button class="lrow" data-go="lesson" data-arg="' + l.id + '"><span>' + esc(l.title) + '</span><span class="bar"><i style="width:' + pct(l) + '%"></i></span><span class="muted">' + (state.best[l.id] !== undefined ? "mejor " + state.best[l.id] + " %" : pct(l) + " %") + "</span></button>"; }).join("") + "</div>";
    h += '<h2>Ajustes</h2><div class="row">' + speedBtn() + '<button class="btn ghost sm" id="reset">Borrar progreso</button></div><div id="rs"></div>';
    render(h, "progreso"); bindSpeed();
    document.getElementById("reset").onclick = function () {
      document.getElementById("rs").innerHTML = '<p class="fb bad">Se borrarán puntos, rachas y logros. ¿Seguro?</p><div class="row"><button class="btn sm" id="yes">Sí, borrar</button><button class="btn ghost sm" id="no">Cancelar</button></div>';
      document.getElementById("no").onclick = function () { document.getElementById("rs").innerHTML = ""; };
      document.getElementById("yes").onclick = function () { var t = state.theme; state = { xp: 0, streak: 0, last: "", done: {}, best: {}, box: {}, due: {}, hist: {}, theme: t, slow: false, games: 0 }; save(); progreso(); };
    };
  }

  function diccionario(filter, q) {
    filter = filter || "todas"; q = q || "";
    function list() {
      var t = q.trim().toLowerCase();
      var r = ALL.filter(function (s) { return (filter === "todas" || s.lesson === filter) && (!t || (s.word + " " + s.how).toLowerCase().indexOf(t) >= 0); });
      return r.map(function (s) { return '<div class="dentry">' + stage(s) + "<div><h3>" + esc(s.word) + "</h3>" + chips(s) + "<p>" + esc(s.how) + "</p></div></div>"; }).join("") || '<p class="muted">No hay signos que coincidan.</p>';
    }
    var h = '<h1>Diccionario</h1><input type="search" id="q" value="' + esc(q) + '" placeholder="Buscar por palabra o descripción" aria-label="Buscar un signo"><div class="filters">' +
      [["todas", "Todas"]].concat(LESSONS.map(function (l) { return [l.id, l.title]; })).map(function (f) { return '<button class="fchip' + (f[0] === filter ? " on" : "") + '" data-f="' + f[0] + '">' + esc(f[1]) + "</button>"; }).join("") + '</div><div class="dict" id="res">' + list() + "</div>";
    render(h, "diccionario");
    document.getElementById("q").oninput = function (e) { q = e.target.value; document.getElementById("res").innerHTML = list(); };
    [].forEach.call(document.querySelectorAll(".fchip"), function (b) { b.onclick = function () { diccionario(b.dataset.f, document.getElementById("q").value); }; });
  }

  function route() {
    var a = cur.a, l; keyFn = null;
    switch (cur.v) {
      case "lesson": return lesson(a);
      case "cards": if (a === "repaso") return cards(pending(), "practica", "", "Repaso"); l = lessonById(a); return l ? cards(l.signs, "lesson", l.id, l.title) : home();
      case "test": if (a === "todo") return quiz(ALL, null, "practica", "", "Test mixto"); l = lessonById(a); return l ? quiz(l.signs, l.id, "lesson", l.id, l.title) : home();
      case "parejas": if (a === "todo") return parejas(ALL, "practica", "", "Parejas"); l = lessonById(a); return l ? parejas(l.signs, "lesson", l.id, l.title) : home();
      case "practica": return practica();
      case "progreso": return progreso();
      case "diccionario": return diccionario();
      default: return home();
    }
  }
  applyTheme(); header(); route();
})();
