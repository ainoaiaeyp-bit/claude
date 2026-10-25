// Antes de pintar: decide si hay efectos y si ya se vio la pantalla de carga en esta sesión.
(function () {
  var d = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { d.classList.add('no-fx'); return; }
  d.classList.add('js');
  try { if (sessionStorage.getItem('nd-intro')) d.classList.add('seen'); } catch (e) {}
  // Red de seguridad: si los efectos no arrancan, nunca dejamos la pantalla tapada.
  setTimeout(function () {
    if (!d.classList.contains('fx-ok')) { d.classList.remove('js'); d.classList.add('no-fx'); }
  }, 4000);
})();
