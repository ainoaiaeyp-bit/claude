(function () {
  "use strict";
  var LESSONS = window.LESSONS, app = document.getElementById("app");
  var KEY = "signa.v2", PASS = 0.7;

  // ---------- Estado (localStorage puede fallar) ----------
  var state = load();
  function load() {
    var d = { xp: 0, streak: 0, last: "", done: {}, best: {}, box: {} };
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) for (var k in d) if (s[k] !== undefined) d[k] = s[k]; } catch (e) {}
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} header(); }
  function day(off) { return new Date(Date.now() - (off || 0) * 864e5).toISOString().slice(0, 10); }
  function addXp(n) {
    if (state.last !== day()) { state.streak = state.last === day(1) ? state.streak + 1 : 1; state.last = day(); }
    state.xp += n; save();
  }
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
  function grade(id, ok) { var b = state.box[id] || 0; state.box[id] = ok ? Math.min(b + 1, 3) : Math.max(b - 1, 0); }
  function pending() { var p = ALL.filter(function (s) { return (state.box[s.id] || 0) < 3; }); return p.length ? p : ALL; }

  // ---------- Dibujo: mano, escena y trayectoria ----------
  var SH = {
    open5: { f: [1, 1, 1, 1], t: "out", s: 1 }, flat: { f: [1, 1, 1, 1], t: "tuck" }, fist: { f: [0, 0, 0, 0], t: "tuck" },
    up: { f: [0, 0, 0, 0], t: "up" }, point: { f: [1, 0, 0, 0], t: "tuck" }, v: { f: [1, 1, 0, 0], t: "tuck", s: 1 },
    three: { f: [1, 1, 1, 0], t: "tuck", s: 1 }, four: { f: [1, 1, 1, 1], t: "tuck", s: 1 }, y: { f: [0, 0, 0, 1], t: "out" }, c: { c: 1 }
  };
  var FX = [30, 39, 48, 57], FL = [38, 42, 38, 30], FA = [-9, -3, 3, 9];
  // Mano en un sistema de 100x130, centrada en (49,78).
  function handShape(name) {
    var h = SH[name] || SH.flat, o = "";
    if (h.c) {
      return '<path class="cstroke" d="M66 36C22 36 22 112 66 112" stroke="var(--skin-line)" stroke-width="20"/>' +
             '<path class="cstroke" d="M66 36C22 36 22 112 66 112" stroke="var(--skin)" stroke-width="16"/>' +
             '<rect class="skin" x="58" y="30" width="22" height="12" rx="6"/><rect class="skin" x="58" y="106" width="22" height="12" rx="6"/>';
    }
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
  function hand(name, tx, ty, scale, rot, cls) {
    return '<g class="hand ' + (cls || "") + '" transform="translate(' + tx + " " + ty + ") rotate(" + (rot || 0) + ") scale(" + scale + ') translate(-49 -78)">' + handShape(name) + "</g>";
  }
  var LOC = { sien: [128, 44], frente: [100, 30], ceja: [114, 48], mejilla: [124, 74], boca: [100, 82], barbilla: [100, 102], pecho: [100, 152], hombro: [152, 132], neutro: [138, 178] };
  var LOCNAME = { sien: "Sien", frente: "Frente", ceja: "Ceja", mejilla: "Mejilla", boca: "Boca", barbilla: "Barbilla", pecho: "Pecho", hombro: "Hombro", neutro: "Delante del cuerpo" };
  var MVNAME = { arrow: "Movimiento recto", shake: "Se agita", circle: "Gira", none: "Sin movimiento" };

  function sceneSVG(s, opt) {
    opt = opt || {};
    var a = LOC[s.loc] || LOC.neutro, sc = 0.6, rot = s.rot || 0, mv = s.mv || { t: "none" };
    var o = '<svg viewBox="0 0 200 250" role="img" aria-label="' + (opt.label ? esc(opt.label) : "Ilustración de un signo") + '"><defs><marker id="ah' + (opt.id || "") + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="mvhead"/></marker></defs>';
    o += '<path class="sk-body" d="M22 250C22 158 56 122 100 120C144 122 178 158 178 250Z"/><rect class="sk-body" x="89" y="94" width="22" height="30" rx="8"/>';
    o += '<ellipse class="sk-face" cx="100" cy="62" rx="32" ry="38"/><circle class="sk-face" cx="68" cy="64" r="6"/><circle class="sk-face" cx="132" cy="64" r="6"/>';
    o += '<circle class="sk-eye" cx="88" cy="58" r="2.8"/><circle class="sk-eye" cx="112" cy="58" r="2.8"/><path class="sk-line" d="M84 49q4-3 8 0M108 49q4-3 8 0M93 80q7 5 14 0"/>';
    var pts = [], endX = a[0], endY = a[1], arrow = "";
    var m = "marker-end=\"url(#ah" + (opt.id || "") + ")\"";
    if (mv.t === "arrow") {
      pts = mv.p.map(function (p) { return [a[0] + p[0] * 1.7, a[1] + p[1] * 1.7]; });
      endX = pts[pts.length - 1][0]; endY = pts[pts.length - 1][1];
      arrow = '<polyline class="mv mv-anim" points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '" ' + m + "/>";
    } else if (mv.t === "shake") {
      var d = mv.a === "y" ? [0, 26] : [26, 0];
      arrow = '<line class="mv mv-anim" x1="' + (a[0] - d[0]) + '" y1="' + (a[1] - d[1]) + '" x2="' + (a[0] + d[0]) + '" y2="' + (a[1] + d[1]) + '" marker-end="url(#ah' + (opt.id || "") + ')" marker-start="url(#ah' + (opt.id || "") + ')"/>';
    } else if (mv.t === "circle") {
      arrow = '<path class="mv mv-anim" d="M' + (a[0] + 26) + " " + a[1] + "A26 26 0 1 1 " + a[0] + " " + (a[1] - 26) + '" ' + m + "/>";
    }
    o += arrow;
    if (mv.t === "arrow") o += hand(s.shape, endX, endY, sc, rot, "ghost");
    o += hand(s.shape, a[0], a[1], sc, rot);
    if (s.two) {
      var ax = 200 - a[0];
      o += hand(s.shape, ax, a[1], sc, -rot).replace('class="hand "', 'class="hand " style="transform-box:fill-box"').replace("<g class", '<g data-m="1" class');
    }
    return o + "</svg>";
  }
  function stage(s, opt) { return '<div class="stage">' + sceneSVG(s, opt) + "</div>"; }
  function closeup(s) {
    var two = s.two, vb = two ? "0 0 150 130" : "0 0 100 130";
    var g = '<g transform="rotate(' + (s.rot || 0) + ' 49 78)">' + handShape(s.shape) + "</g>";
    var g2 = two ? '<g transform="translate(150 0) scale(-1 1)"><g class="hand" transform="rotate(' + (s.rot || 0) + ' 49 78)">' + handShape(s.shape) + "</g></g>" : "";
    return '<div class="closeup"><svg class="hand" viewBox="' + vb + '" role="img" aria-label="Forma de la mano">' + g + g2 + "</svg></div>";
  }
  function mediaHtml(s) {
    if (!s.media) return "";
    if (/\.(mp4|webm)$/i.test(s.media)) return '<video class="media" src="' + esc(s.media) + '" controls loop muted playsinline></video>';
    return '<img class="media" src="' + esc(s.media) + '" alt="Signo de ' + esc(s.word) + '">';
  }
  function chips(s) { return '<div class="chips"><span class="chip">' + LOCNAME[s.loc] + '</span><span class="chip">' + MVNAME[(s.mv || {}).t || "none"] + "</span>" + (s.two ? '<span class="chip">Dos manos</span>' : "") + "</div>"; }

  // ---------- Navegación en memoria (sin hash) ----------
  var cur = { v: "home" };
  function go(v, a) { cur = { v: v, a: a }; route(); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go]"); if (!t) return;
    go(t.dataset.go, t.dataset.arg);
  });
  function render(html, nav) {
    app.innerHTML = html;
    [].forEach.call(document.querySelectorAll("[data-nav]"), function (b) { b.classList.toggle("on", b.dataset.nav === nav); });
    window.scrollTo(0, 0);
  }

  // ---------- Vistas ----------
  function home() {
    var next = LESSONS.filter(function (l) { return !state.done[l.id]; })[0] || LESSONS[0];
    var demo = next.signs[0];
    var h = '<section class="hero"><div><h1>Aprende lengua de signos viendo cómo se hace</h1><p class="lead">Cada signo se dibuja con su forma de mano, el lugar del cuerpo y la trayectoria. Estudia una lección, repasa con tarjetas y supera el test.</p>' +
      '<div class="row"><button class="btn" data-go="lesson" data-arg="' + next.id + '">' + (state.xp ? "Continuar: " : "Empezar: ") + esc(next.title) + '</button><button class="btn ghost" data-go="practica">Practicar</button></div></div>' + stage(demo, { label: "Signo de " + demo.word }) + "</section>";
    h += "<h2>Lecciones</h2><div class=\"grid\">";
    LESSONS.forEach(function (l) {
      var p = pct(l), done = state.done[l.id];
      h += '<button class="lcard" data-go="lesson" data-arg="' + l.id + '">' + stage(l.signs[1] || l.signs[0]) + "<h3>" + esc(l.title) + "</h3><p>" + esc(l.desc) + '</p><div class="row" style="justify-content:space-between"><span class="badge' + (done ? " done" : "") + '">' + (done ? "Completada" : l.signs.length + " signos") + '</span><span class="muted">' + p + '%</span></div><div class="bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div></button>';
    });
    render(h + "</div>", "home");
  }

  function lesson(id, idx) {
    var l = lessonById(id); if (!l) return home();
    idx = idx || 0;
    var s = l.signs[idx];
    var h = '<button class="back" data-go="home">← Lecciones</button><h1>' + esc(l.title) + '</h1><p class="lead">' + esc(l.desc) + "</p>";
    h += '<section class="viewer" aria-live="polite">' + stage(s, { label: "Signo de " + s.word }) + '<div class="vside"><p class="muted">Signo ' + (idx + 1) + " de " + l.signs.length + '</p><p class="word">' + esc(s.word) + "</p>" + chips(s) + closeup(s) + "<p>" + esc(s.how) + "</p>" + mediaHtml(s) +
      '<div class="nav2"><button class="btn ghost" id="pv"' + (idx ? "" : " disabled") + '>Anterior</button><button class="btn" id="nx"' + (idx < l.signs.length - 1 ? "" : " disabled") + ">Siguiente</button></div></div></section>";
    h += '<div class="thumbs">' + l.signs.map(function (x, i) { return '<button class="thumb' + (i === idx ? " on" : "") + '" data-i="' + i + '">' + stage(x) + esc(x.word) + "</button>"; }).join("") + "</div>";
    h += '<div class="row" style="margin-top:20px"><button class="btn" data-go="test" data-arg="' + id + '">Hacer el test</button><button class="btn ghost" data-go="cards" data-arg="' + id + '">Tarjetas de repaso</button></div>';
    render(h, "home");
    var pv = document.getElementById("pv"), nx = document.getElementById("nx");
    pv.onclick = function () { lesson(id, idx - 1); }; nx.onclick = function () { lesson(id, idx + 1); };
    [].forEach.call(document.querySelectorAll(".thumb"), function (b) { b.onclick = function () { lesson(id, +b.dataset.i); }; });
  }

  function cards(pool, back, backArg, title) {
    var deck = shuffle(pool).slice(0, 12), i = 0, shown = false;
    function draw() {
      if (i >= deck.length) {
        addXp(5);
        return render('<div class="result"><div class="big">¡Listo!</div><p class="lead" style="margin:8px auto 18px">Has repasado ' + deck.length + ' signos. +5 puntos</p><button class="btn" data-go="' + back + '" data-arg="' + (backArg || "") + '">Volver</button></div>', "practica");
      }
      var s = deck[i];
      var h = '<button class="back" data-go="' + back + '" data-arg="' + (backArg || "") + '">← Salir</button><h1>' + esc(title) + '</h1><p class="muted">Tarjeta ' + (i + 1) + " de " + deck.length + "</p>";
      h += '<div class="flash">' + stage(s) + (shown ? '<div class="w">' + esc(s.word) + "</div>" + chips(s) + "<div>" + esc(s.how) + "</div>" + mediaHtml(s)
          : '<div class="hint">¿Qué signo es? Piénsalo y pulsa para ver la respuesta.</div>') + "</div>";
      h += '<div class="row" style="margin-top:14px">' + (shown ? '<button class="btn ghost" id="no">Otra vez</button><button class="btn" id="yes">Lo sabía</button>' : '<button class="btn" id="show">Mostrar respuesta</button>') + "</div>";
      render(h, "practica");
      if (shown) {
        document.getElementById("yes").onclick = function () { grade(s.id, true); save(); i++; shown = false; draw(); };
        document.getElementById("no").onclick = function () { grade(s.id, false); save(); i++; shown = false; draw(); };
      } else document.getElementById("show").onclick = function () { shown = true; draw(); };
    }
    draw();
  }

  function quiz(pool, lessonId, back, backArg, title) {
    var qs = shuffle(pool).slice(0, 8), i = 0, ok = 0;
    function draw() {
      if (i >= qs.length) return end();
      var s = qs[i], visual = Math.random() < 0.4;
      var opts = shuffle([s].concat(shuffle(ALL.filter(function (x) { return x.id !== s.id; })).slice(0, 3)));
      var h = '<button class="back" data-go="' + back + '" data-arg="' + (backArg || "") + '">← Salir</button><p class="muted">' + esc(title) + " · Pregunta " + (i + 1) + " de " + qs.length + "</p>";
      h += '<div class="q">' + (visual ? "<b>¿Cuál es el signo de «" + esc(s.word) + "»?</b>" : stage(s) + "<b>¿Qué significa este signo?</b>") + "</div>";
      h += '<div class="opts' + (visual ? " vis" : "") + '">' + opts.map(function (o) { return '<button class="opt" data-id="' + o.id + '">' + (visual ? stage(o) : esc(o.word)) + "</button>"; }).join("") + '</div><div class="fb" id="fb" role="status"></div><div id="nx"></div>';
      render(h, "practica");
      [].forEach.call(document.querySelectorAll(".opt"), function (b) {
        b.onclick = function () {
          var right = b.dataset.id === s.id;
          [].forEach.call(document.querySelectorAll(".opt"), function (x) { x.disabled = true; if (x.dataset.id === s.id) x.classList.add("ok"); });
          if (!right) b.classList.add("bad"); else ok++;
          grade(s.id, right); save();
          var fb = document.getElementById("fb"); fb.className = "fb " + (right ? "ok" : "bad"); fb.textContent = right ? "¡Correcto!" : "Era: " + s.word + ". " + s.how;
          document.getElementById("nx").innerHTML = '<button class="btn" id="go">' + (i + 1 < qs.length ? "Siguiente" : "Ver resultado") + "</button>";
          var go = document.getElementById("go"); go.focus(); go.onclick = function () { i++; draw(); };
        };
      });
    }
    function end() {
      var p = ok / qs.length, passed = p >= PASS, gain = ok * 10;
      if (lessonId) { state.best[lessonId] = Math.max(state.best[lessonId] || 0, Math.round(p * 100)); if (passed) { if (!state.done[lessonId]) gain += 30; state.done[lessonId] = true; } }
      addXp(gain);
      render('<div class="result"><div class="big">' + ok + " / " + qs.length + '</div><p class="lead" style="margin:8px auto 18px">' + (passed ? "¡Muy bien! " : "Casi. Necesitas un " + PASS * 100 + "% para completar la lección. ") + "+" + gain + ' puntos</p><div class="row" style="justify-content:center"><button class="btn" data-go="' + back + '" data-arg="' + (backArg || "") + '">Continuar</button><button class="btn ghost" id="again">Repetir</button></div></div>', "practica");
      document.getElementById("again").onclick = function () { quiz(pool, lessonId, back, backArg, title); };
    }
    draw();
  }

  function practica() {
    render('<h1>Practicar</h1><p class="lead">Repasa los signos que menos dominas. Hay ' + pending().length + " pendientes de afianzar.</p>" +
      '<div class="grid"><button class="lcard" data-go="cards" data-arg="repaso"><h3>Tarjetas de repaso</h3><p>12 signos, empezando por los que más fallas.</p></button><button class="lcard" data-go="test" data-arg="todo"><h3>Test mixto</h3><p>8 preguntas de todas las lecciones, con opciones en texto e imagen.</p></button></div>', "practica");
  }

  function diccionario() {
    function list(q) {
      q = q.trim().toLowerCase();
      var r = ALL.filter(function (s) { return !q || (s.word + " " + s.how).toLowerCase().indexOf(q) >= 0; });
      return r.map(function (s) { return '<div class="dentry">' + stage(s) + "<div><h3>" + esc(s.word) + "</h3>" + chips(s) + "<p>" + esc(s.how) + "</p></div></div>"; }).join("") || '<p class="muted">No hay signos que coincidan.</p>';
    }
    render('<h1>Diccionario</h1><input type="search" id="q" placeholder="Buscar por palabra o descripción" aria-label="Buscar un signo"><div class="dict" id="res">' + list("") + "</div>", "diccionario");
    document.getElementById("q").oninput = function (e) { document.getElementById("res").innerHTML = list(e.target.value); };
  }

  function route() {
    var a = cur.a, l;
    switch (cur.v) {
      case "lesson": return lesson(a);
      case "cards":
        if (a === "repaso") return cards(pending(), "practica", "", "Repaso");
        l = lessonById(a); return l ? cards(l.signs, "lesson", l.id, l.title) : home();
      case "test":
        if (a === "todo") return quiz(ALL, null, "practica", "", "Test mixto");
        l = lessonById(a); return l ? quiz(l.signs, l.id, "lesson", l.id, l.title) : home();
      case "practica": return practica();
      case "diccionario": return diccionario();
      default: return home();
    }
  }
  header(); route();
})();
