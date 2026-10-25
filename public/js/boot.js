// Se ejecuta antes de pintar: activa los estados iniciales de animación y recuerda si ya se vio la intro.
(function () {
  var d = document.documentElement;
  if ('IntersectionObserver' in window) d.classList.add('js');
  try {
    if (sessionStorage.getItem('seen')) d.classList.add('seen');
    else sessionStorage.setItem('seen', '1');
  } catch (e) {}
})();
