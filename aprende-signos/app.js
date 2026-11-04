(function () {
  "use strict";
  var LESSONS = window.LESSONS;
  var app = document.getElementById("app");
  var KEY = "signa.v1";
  var PASS = 0.7;

  // ---------- Estado persistente (localStorage puede fallar) ----------
  var state = load();
  function load() {
    var d = { xp: 0, streak: 0, last: "", done: {}, best: {}, box: {} };
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) for (var k in d) if (s[k] !== undefined) d[k] = s[k]; } catch (e) {}
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} header(); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function touchStreak() {
    var t = today();
    if (state.last === t) return;
    var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    state.streak = state.last === y ? state.streak + 1 : 1;
    state.last = t;
  }
  function addXp(n) { touchStreak(); state.xp += n; save(); }
  function header() {
    var t = today(), y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    document.getElementById("streak").textContent = (state.last === t || state.last === y) ? state.streak : 0;
    document.getElementById("xp").textContent = state.xp;
  }

  // ---------- Utilidades ----------
  var ALL = [];
  LESSONS.forEach(function (l) { l.signs.forEach(function (s) { s.lesson = l.id; ALL.push(s); }); });
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lessonById(id) { return LESSONS.filter(function (l) { return l.id === id; })[0]; }
  function pct(l) { var n = l.signs.filter(function (s) { return state.box[s.id] >= 2; }).length; return Math.round(100 * n / l.signs.length); }
  function mediaHtml(s) {
    if (!s.media) return "";
    if (/\.(mp4|webm)$/i.test(s.media)) return '<video class="media" src="' + esc(s.media) + '" controls loop muted playsinline></video>';
    return '<img class="media" src="' + esc(s.media) + '" alt="Signo de ' + esc(s.word) + '">';
  }
  function setNav(n) { [].forEach.call(document.querySelectorAll("[data-nav]"), function (a) { a.classList.toggle("on", a.dataset.nav === n); }); }
  function render(html, nav) { app.innerHTML = html; setNav(nav); window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  function grade(id, ok) { var b = state.box[id] || 0; state.box[id] = ok ? Math.min(b + 1, 3) : Math.max(b - 1, 0); }

  // ---------- Vistas ----------
  function home() {
    var h = "<h1>Aprende lengua de signos</h1><p class=\"lead\">Completa lecciones, repasa con tarjetas y consigue una racha diaria.</p><div class=\"grid\">";
    LESSONS.forEach(function (l) {
      var p = pct(l), done = state.done[l.id];
      h += '<a class="card lesson" href="#/leccion/' + l.id + '"><div class="ico" aria-hidden="true">' + l.icon + "</div><h3>" + esc(l.title) + "</h3><p>" + esc(l.desc) + "</p>" +
        '<div class="row" style="justify-content:space-between"><span class="badge' + (done ? " done" : "") + '">' + (done ? "Completada" : l.signs.length + " signos") + "</span><span class=\"muted\">" + p + '%</span></div><div class="bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div></a>';
    });
    render(h + "</div>", "home");
  }

  function lesson(id) {
    var l = lessonById(id); if (!l) return home();
    var h = '<p><a href="#/">← Lecciones</a></p><h1>' + l.icon + " " + esc(l.title) + '</h1><p class="lead">' + esc(l.desc) + '</p><div class="row"><a class="btn" href="#/test/' + id + '">Hacer el test</a><a class="btn ghost" href="#/tarjetas/' + id + '">Tarjetas</a></div><h2>Signos</h2><div class="grid" style="grid-template-columns:1fr">';
    l.signs.forEach(function (s) {
      h += '<article class="card sign"><div class="em" aria-hidden="true">' + s.emoji + "</div><div><h3>" + esc(s.word) + "</h3><p>" + esc(s.how) + "</p>" + mediaHtml(s) + "</div></article>";
    });
    render(h + "</div>", "home");
  }

  function cards(pool, backHref, title) {
    var deck = shuffle(pool), i = 0, shown = false;
    function draw() {
      if (i >= deck.length) {
        addXp(5);
        return render('<div class="card result"><div class="big">🎉</div><h1>¡Repaso terminado!</h1><p class="lead">+5 ⭐</p><div class="row" style="justify-content:center"><a class="btn" href="' + backHref + '">Volver</a></div></div>', "practica");
      }
      var s = deck[i];
      render('<p><a href="' + backHref + '">← Salir</a></p><h1>' + esc(title) + '</h1><p class="muted">Tarjeta ' + (i + 1) + " de " + deck.length + '</p>' +
        '<button class="flash" id="f" aria-live="polite">' +
        (shown ? '<div class="em">' + s.emoji + '</div><div class="w">' + esc(s.word) + '</div><div class="h">' + esc(s.how) + "</div>" + mediaHtml(s)
               : '<div class="em">' + s.emoji + '</div><div class="h muted">¿Qué signo es? Intenta recordarlo y toca para ver la respuesta.</div><div class="w">' + esc(s.word) + "</div>") +
        "</button>" +
        (shown ? '<div class="row" style="margin-top:14px"><button class="btn ghost" id="no">Otra vez</button><button class="btn" id="yes">Lo sabía</button></div>' : ""), "practica");
      document.getElementById("f").onclick = function () { if (!shown) { shown = true; draw(); } };
      if (shown) {
        document.getElementById("yes").onclick = function () { grade(s.id, true); save(); i++; shown = false; draw(); };
        document.getElementById("no").onclick = function () { grade(s.id, false); save(); i++; shown = false; draw(); };
      }
    }
    draw();
  }

  function quiz(pool, lessonId, backHref, title) {
    var n = Math.min(8, Math.max(pool.length, 1));
    var qs = shuffle(pool).slice(0, n), i = 0, ok = 0;
    function draw() {
      if (i >= qs.length) return end();
      var s = qs[i], mode = Math.random() < 0.5 ? "w" : "h"; // w: ver descripción→palabra; h: ver palabra→descripción
      var others = shuffle(ALL.filter(function (x) { return x.id !== s.id; })).slice(0, 3);
      var opts = shuffle([s].concat(others));
      var h = '<p><a href="' + backHref + '">← Salir</a></p><p class="muted">' + esc(title) + " · Pregunta " + (i + 1) + " de " + qs.length + '</p><div class="card q">';
      h += mode === "w" ? '<span class="em" aria-hidden="true">' + s.emoji + "</span>" + esc(s.how) + "<br><b>¿Qué significa este signo?</b>"
                        : "<b>¿Cuál es el signo de «" + esc(s.word) + "»?</b>";
      h += '</div><div class="opts">';
      opts.forEach(function (o, k) { h += '<button class="opt" data-id="' + o.id + '">' + esc(mode === "w" ? o.word : o.how) + "</button>"; });
      h += '</div><div class="fb" id="fb" role="status"></div><div id="nx"></div>';
      render(h, "practica");
      [].forEach.call(document.querySelectorAll(".opt"), function (b) {
        b.onclick = function () {
          var right = b.dataset.id === s.id;
          [].forEach.call(document.querySelectorAll(".opt"), function (x) { x.disabled = true; if (x.dataset.id === s.id) x.classList.add("ok"); });
          if (!right) b.classList.add("bad"); else ok++;
          grade(s.id, right); save();
          var fb = document.getElementById("fb"); fb.className = "fb " + (right ? "ok" : "bad");
          fb.textContent = right ? "¡Correcto!" : "Era: " + s.word;
          var nx = document.getElementById("nx"); nx.innerHTML = '<button class="btn" id="go">' + (i + 1 < qs.length ? "Siguiente" : "Ver resultado") + "</button>";
          var go = document.getElementById("go"); go.focus(); go.onclick = function () { i++; draw(); };
        };
      });
    }
    function end() {
      var p = ok / qs.length, passed = p >= PASS, gain = ok * 10;
      if (lessonId) { state.best[lessonId] = Math.max(state.best[lessonId] || 0, Math.round(p * 100)); if (passed) { if (!state.done[lessonId]) gain += 30; state.done[lessonId] = true; } }
      addXp(gain);
      render('<div class="card result"><div class="big">' + (passed ? "🏆" : "💪") + "</div><h1>" + ok + " / " + qs.length + "</h1><p class=\"lead\">" +
        (passed ? "¡Muy bien! " : "Casi. Necesitas un " + PASS * 100 + "% para completar. ") + "+" + gain + ' ⭐</p><div class="row" style="justify-content:center"><a class="btn" href="' + backHref + '">Continuar</a><a class="btn ghost" href="' + location.hash + '" id="again">Repetir</a></div></div>', "practica");
      document.getElementById("again").onclick = function (e) { e.preventDefault(); quiz(pool, lessonId, backHref, title); };
    }
    draw();
  }

  function practica() {
    var due = ALL.filter(function (s) { return (state.box[s.id] || 0) < 3; });
    render('<h1>Practicar</h1><p class="lead">Repasa los signos que menos dominas.</p><div class="grid">' +
      '<a class="card" href="#/tarjetas/repaso"><h3>🃏 Tarjetas de repaso</h3><p class="muted">' + due.length + " signos pendientes de afianzar.</p></a>" +
      '<a class="card" href="#/test/todo"><h3>📝 Test mixto</h3><p class="muted">8 preguntas de todas las lecciones.</p></a></div>', "practica");
  }

  function diccionario() {
    function list(q) {
      q = q.trim().toLowerCase();
      return ALL.filter(function (s) { return !q || (s.word + " " + s.how).toLowerCase().indexOf(q) >= 0; }).map(function (s) {
        return '<article class="card sign"><div class="em" aria-hidden="true">' + s.emoji + "</div><div><h3>" + esc(s.word) + "</h3><p>" + esc(s.how) + "</p>" + mediaHtml(s) + "</div></article>";
      }).join("") || '<p class="muted">Sin resultados.</p>';
    }
    render('<h1>Diccionario</h1><input type="search" id="q" placeholder="Buscar un signo…" aria-label="Buscar un signo"><div class="grid" id="res" style="grid-template-columns:1fr">' + list("") + "</div>", "diccionario");
    document.getElementById("q").oninput = function (e) { document.getElementById("res").innerHTML = list(e.target.value); };
  }

  // ---------- Router ----------
  function route() {
    var p = location.hash.replace(/^#\/?/, "").split("/");
    switch (p[0]) {
      case "leccion": return lesson(p[1]);
      case "tarjetas":
        if (p[1] === "repaso") { var pend = ALL.filter(function (s) { return (state.box[s.id] || 0) < 3; }); return cards((pend.length ? pend : ALL).slice(0, 12), "#/practica", "Repaso"); }
        var l = lessonById(p[1]); return l ? cards(l.signs, "#/leccion/" + l.id, l.title) : home();
      case "test":
        if (p[1] === "todo") return quiz(ALL, null, "#/practica", "Test mixto");
        var t = lessonById(p[1]); return t ? quiz(t.signs, t.id, "#/leccion/" + t.id, t.title) : home();
      case "practica": return practica();
      case "diccionario": return diccionario();
      default: return home();
    }
  }
  window.addEventListener("hashchange", route);
  header(); route();
})();
