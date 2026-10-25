// Antes de pintar: activa los estados iniciales de animación. Si motion.js no llega a arrancar,
// se retiran a los 2,5 s para que el contenido nunca quede oculto.
(function () {
  var d = document.documentElement;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  d.classList.add('js');
  setTimeout(function () { if (!d.classList.contains('motion-ok')) d.classList.remove('js'); }, 2500);
})();
