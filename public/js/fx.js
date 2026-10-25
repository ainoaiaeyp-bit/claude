/* Efectos: pantalla de carga, scroll suave (Lenis), animaciones ligadas al scroll (GSAP + ScrollTrigger),
   cambio de tono entre secciones, tarjetas apiladas, galería horizontal anclada, cursor y botones magnéticos. */
(() => {
  const root = document.documentElement, body = document.body;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const meta = $('meta[name="theme-color"]');

  /* tono de fondo por sección */
  const setTone = (t) => {
    body.classList.toggle('tone-dark', t === 'dark');
    if (meta) meta.content = t === 'dark' ? '#120e0c' : '#e9dfd4';
  };

  /* menú a pantalla completa */
  const burger = $('#burger'), panel = $('#menu-panel');
  const menu = (open) => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    panel.setAttribute('aria-hidden', !open);
    $('#menu-label').textContent = open ? 'Cerrar' : 'Menú';
    if (window.lenis) open ? window.lenis.stop() : window.lenis.start();
  };
  burger.addEventListener('click', () => menu(!body.classList.contains('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') menu(false); });

  const hasGsap = window.gsap && window.ScrollTrigger && window.Lenis;
  if (reduce || !hasGsap) {
    root.classList.add('no-fx'); root.classList.remove('js');
    window.goTo = (sel) => document.querySelector(sel)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    document.addEventListener('click', (e) => { if (e.target.closest('#menu a')) menu(false); });
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setTone(e.target.dataset.tone)), { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-tone]').forEach((s) => io.observe(s));
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('fx-ok');

  /* scroll suave */
  const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  window.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.goTo = (sel) => lenis.scrollTo(sel, { offset: -30, duration: 1.6 });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    const wasOpen = body.classList.contains('menu-open');
    menu(false);
    setTimeout(() => lenis.scrollTo(t, { offset: a.getAttribute('href') === '#top' ? 0 : -30, duration: 1.8 }), wasOpen ? 450 : 0);
  });

  /* utilidades */
  const split = (el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w) => `<span class="w" aria-hidden="true"><span class="wi">${w}</span></span>`).join(' ');
    return $$('.wi', el);
  };

  /* portada */
  const heroWords = split($('#hero-title'));
  gsap.set(heroWords, { yPercent: 115 });
  gsap.set('[data-hero]', { autoAlpha: 0, y: 30 });
  gsap.set('.hero-cols', { autoAlpha: 0, yPercent: 8 });
  const intro = () => {
    gsap.timeline()
      .to(heroWords, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.07 })
      .to('.hero-cols', { autoAlpha: 1, yPercent: 0, duration: 2, ease: 'expo.out' }, 0.1)
      .to('[data-hero]', { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09 }, 0.35);
  };

  /* pantalla de carga */
  const loader = $('#loader');
  if (loader && getComputedStyle(loader).display !== 'none') {
    lenis.stop();
    const n = { v: 0 };
    gsap.timeline({ onComplete: () => { loader.remove(); lenis.start(); try { sessionStorage.setItem('nd-intro', '1'); } catch (e) {} } })
      .from('.loader .ln span', { yPercent: 110, duration: 1.1, ease: 'expo.out' })
      .to(n, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { $('#count').textContent = Math.round(n.v); } }, 0)
      .to('#bar', { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to('.loader .ln span', { yPercent: -110, duration: 0.8, ease: 'expo.in' }, '+=0.1')
      .to('.loader .row', { autoAlpha: 0, duration: 0.4 }, '<')
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'expo.inOut' }, '-=0.2')
      .add(intro, '-=0.6');
  } else {
    loader?.remove();
    intro();
  }

  /* galería horizontal */
  const track = $('#gallery'), gal = $('#portfolio');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    gal.classList.remove('static');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const n = track.children.length;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: gal, pin: '#gal-pin', start: 'top top', end: () => `+=${dist()}`, scrub: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set('#gal-bar', { scaleX: self.progress });
          $('#gal-count').textContent = `${String(Math.min(n, Math.floor(self.progress * (n - 1)) + 1)).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
        },
      },
    });
  });
  mm.add('(max-width: 900px)', () => { gal.classList.add('static'); });

  /* cambio de tono */
  $$('[data-tone]').forEach((s) => ScrollTrigger.create({
    trigger: s, start: 'top 55%', end: 'bottom 55%',
    onToggle: (self) => self.isActive && setTone(s.dataset.tone),
  }));

  /* titulares por palabras */
  $$('[data-split]').forEach((el) => {
    const w = split(el);
    gsap.from(w, { yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('[data-fade]').forEach((el) => gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));

  /* imágenes: revelado y parallax interior */
  $$('[data-reveal-img]').forEach((el) => {
    gsap.from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    gsap.from($('img', el), { scale: 1.35, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('[data-parallax]').forEach((img) => gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  /* manifiesto palabra a palabra */
  const philo = $('#philo');
  if (philo) {
    philo.innerHTML = philo.textContent.trim().split(/\s+/).map((w) => `<span class="wd">${w}</span>`).join(' ');
    gsap.to($$('.wd', philo), { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: philo, start: 'top 80%', end: 'bottom 50%', scrub: true } });
  }

  /* cinta que reacciona a la velocidad del scroll */
  const belt = $('#belt');
  if (belt) {
    belt.innerHTML += belt.innerHTML;
    let x = 0, dir = -1;
    const skew = gsap.quickTo(belt, 'skewX', { duration: 0.5, ease: 'power3' });
    gsap.ticker.add(() => {
      const v = lenis.velocity || 0;
      if (v) dir = v > 0 ? -1 : 1;
      x += (0.6 + Math.min(Math.abs(v) * 0.25, 14)) * dir;
      const half = belt.scrollWidth / 2;
      if (x <= -half) x += half; if (x > 0) x -= half;
      gsap.set(belt, { x });
      skew(Math.max(-8, Math.min(8, -v * 0.35)));
    });
  }

  /* tarjetas apiladas */
  const cards = $$('.card');
  cards.forEach((c, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(c, { scale: 0.93 + i * 0.012, filter: 'brightness(0.72)', ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 15%', scrub: true } });
  });

  /* proceso: línea que avanza */
  gsap.to('#steps-fill', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#steps', start: 'top 80%', end: 'bottom 55%', scrub: true } });

  /* contadores */
  $$('[data-count]').forEach((el) => {
    const o = { v: 0 }, to = Number(el.dataset.count);
    gsap.to(o, { v: to, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => { el.textContent = Math.round(o.v); } });
  });

  /* cursor y botones magnéticos */
  if (fine) {
    root.classList.add('has-cursor');
    const cur = $('#cursor');
    const dot = $('.dot', cur);
    const mx = gsap.quickTo(cur, 'x', { duration: 0.18, ease: 'power3' }), my = gsap.quickTo(cur, 'y', { duration: 0.18, ease: 'power3' });
    addEventListener('pointermove', (e) => { mx(e.clientX); my(e.clientY); });
    document.addEventListener('pointerover', (e) => {
      const hot = e.target.closest('a,button,summary,label,.opt,.slot,.cal button');
      gsap.to(dot, { scale: hot ? 5 : 1, duration: 0.5, ease: 'expo.out' });
    });
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35); yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* recalcular cuando cambia el contenido (tarifas, pasos de reserva, imágenes) */
  let t;
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 250); }).observe($('main'));
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
})();
