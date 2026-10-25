/* Genera las páginas de posicionamiento (una por tratamiento) y el JSON-LD de la portada.
   Uso: node scripts/build-seo.mjs   (reescribe public/*.html de las páginas listadas y el bloque LD de index.html) */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pub = (f) => path.join(root, 'public', f);
const NAME = 'Noelia Duque', CITY = 'Alcantarilla', REGION = 'Murcia';
const ADDRESS = { '@type': 'PostalAddress', streetAddress: 'C. Joaquín Martínez López, 3', postalCode: '30820', addressLocality: 'Alcantarilla', addressRegion: 'Región de Murcia', addressCountry: 'ES' };
const BIZ = { '@type': ['BeautySalon', 'LocalBusiness'], '@id': '%SITE%/#negocio', name: `${NAME} · Brow & Make Up`, url: '%SITE%/', image: '%SITE%/img/work/clienta-sonrisa.webp', telephone: '+34606102400', email: 'noeliaduquebrowandmakeup@gmail.com', address: ADDRESS, areaServed: ['Alcantarilla', 'Murcia', 'Molina de Segura', 'Alhama de Murcia', 'Librilla'], sameAs: ['https://www.instagram.com/noeliaduque_brows/'] };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

const PAGES = [
  {
    slug: 'microblading-alcantarilla-murcia', img: 'ceja-macro-1', alt: 'Detalle de una ceja trabajada con microblading pelo a pelo',
    title: 'Microblading en Alcantarilla (Murcia) · Cejas pelo a pelo', desc: 'Microblading en Alcantarilla, Murcia: trazos finos pelo a pelo para rellenar, ordenar y definir tus cejas. Consulta de diseño y retoque incluido en el proceso. Reserva online.',
    h1: 'Microblading en Alcantarilla, Murcia', lead: 'Trazos finos dibujados pelo a pelo para rellenar huecos, ordenar la forma y definir la ceja con un resultado natural.', service: 'Microblading', related: ['powder-brows-murcia', 'cejas-hiperrealismo-murcia'],
    sections: [
      ['Qué es el microblading', ['El microblading es una técnica de micropigmentación en la que se dibujan, uno a uno, trazos muy finos en la capa superficial de la piel que imitan el vello natural de la ceja. Se realiza con una herramienta manual y pigmentos específicos para este uso.', 'Se utiliza para rellenar zonas con poco pelo, corregir asimetrías o recuperar una ceja que se ha ido despoblando con los años, manteniendo un aspecto natural.']],
      ['Para quién suele ser una buena opción', ['Para quien tiene cejas con huecos, poco vello, una forma irregular o simplemente quiere ahorrar tiempo cada mañana. En la consulta valoramos tu piel y tus proporciones: en pieles muy grasas o con poros marcados, otras técnicas como el powder brows pueden dar un resultado más duradero y uniforme.']],
      ['Cómo es la cita', ['Empezamos hablando de lo que buscas. Después estudio tu rostro y dibujo la forma con lápiz para que la veas antes de empezar: no pasamos a la piel hasta que el diseño te convence.', 'El tratamiento se realiza con material de un solo uso y te explico paso a paso los cuidados posteriores. Tras la cicatrización, hacemos un retoque para afinar y consolidar el resultado.']],
      ['Cicatrización, retoque y duración', ['Durante las primeras semanas la ceja cicatriza y el color puede verse más intenso y luego aclararse; es normal. Por eso se programa un retoque una vez cicatrizada la piel.', 'La duración del resultado varía de una persona a otra según el tipo de piel, el estilo de vida, la exposición al sol y los cuidados. Te daré una referencia orientativa en la consulta.']],
      ['Cuándo no es recomendable', ['En embarazo o lactancia, con ciertas condiciones de la piel o de salud y con algunos tratamientos puede no ser recomendable. Cuéntamelo todo en la consulta y te digo con sinceridad si es el momento adecuado.']],
    ],
    faq: [['¿Duele el microblading?', 'La sensibilidad varía mucho de una persona a otra. Trabajo con cuidado y con productos pensados para tu comodidad; la mayoría de clientas lo describe como una molestia llevadera.'], ['¿Cuánto tiempo tarda en cicatrizar?', 'La cicatrización inicial lleva unos días y la piel termina de asentarse en unas semanas. El retoque se programa cuando la piel ya ha cicatrizado.'], ['¿Cuál es la diferencia con el powder brows?', 'El microblading dibuja trazos pelo a pelo; el powder brows crea un sombreado suave con efecto maquillaje. En la consulta te recomiendo el que mejor encaja con tu piel y tu estilo.'], ['¿Dónde se realiza?', 'En el estudio de Alcantarilla (Murcia), dentro de Peluquería Fina Carpe, C. Joaquín Martínez López, 3.']],
  },
  {
    slug: 'powder-brows-murcia', img: 'ceja-perfil', alt: 'Cejas con powder brows, sombreado suave tipo maquillaje',
    title: 'Powder brows en Murcia y Alcantarilla · Cejas sombreadas', desc: 'Powder brows en Alcantarilla (Murcia): sombreado suave con efecto maquillaje para cejas con más densidad y definición, sin aspecto dibujado. Reserva tu cita.',
    h1: 'Powder brows en Alcantarilla, Murcia', lead: 'Un sombreado suave y difuminado, con efecto maquillaje en polvo, que da densidad y definición a la ceja sin aspecto dibujado.', service: 'Powder brows (sombreado)', related: ['microblading-alcantarilla-murcia', 'cejas-hiperrealismo-murcia'],
    sections: [
      ['Qué son las powder brows', ['Las powder brows son una técnica de micropigmentación que crea un sombreado suave y uniforme, parecido a una ceja maquillada con sombra en polvo. En lugar de trazos individuales, se trabaja la zona con puntos finos que se difuminan.', 'El resultado es una ceja con más densidad y definición, con un acabado delicado que suele resultar muy favorecedor.']],
      ['Para quién suele ser una buena opción', ['Es una opción habitual en pieles mixtas o grasas, donde los trazos finos pueden difuminarse con el tiempo, y para quien prefiere un efecto de maquillaje a uno de pelo a pelo. También funciona bien si quieres más relleno y una forma bien marcada.']],
      ['Cómo es la cita', ['Hablamos de lo que buscas, estudio tus proporciones y dibujo el diseño con lápiz para que lo apruebes antes de empezar. El tratamiento se realiza con material de un solo uso y te explico los cuidados para las siguientes semanas.', 'Tras la cicatrización hacemos un retoque para igualar y consolidar el color.']],
      ['Cicatrización y duración', ['En los días siguientes el color puede verse más intenso y después se suaviza. La duración depende de tu tipo de piel, de la exposición al sol y de los cuidados; en la consulta te doy una referencia orientativa.']],
      ['Cuándo no es recomendable', ['En embarazo o lactancia, con determinadas condiciones de la piel o de salud y con algunos tratamientos puede no ser aconsejable. Lo valoramos juntas antes de reservar.']],
    ],
    faq: [['¿Se nota el efecto sombreado?', 'El resultado es suave y de aspecto natural, parecido a un maquillaje bien difuminado. Decidimos la intensidad juntas durante el diseño.'], ['¿Es mejor que el microblading?', 'No es mejor ni peor: depende de tu piel y de lo que quieras. El microblading da efecto pelo a pelo y el powder brows, efecto sombreado. Te aconsejo en la consulta.'], ['¿Necesito retoque?', 'Sí, tras la cicatrización se hace un retoque para afinar y consolidar el resultado.'], ['¿Dónde está el estudio?', 'En Alcantarilla (Murcia), dentro de Peluquería Fina Carpe, C. Joaquín Martínez López, 3.']],
  },
  {
    slug: 'cejas-hiperrealismo-murcia', img: 'clienta-cejas', alt: 'Cejas con técnica de hiperrealismo combinando trazo y sombreado',
    title: 'Cejas hiperrealismo en Murcia y Alcantarilla · Noelia Duque', desc: 'Hiperrealismo en cejas en Alcantarilla (Murcia): técnicas combinadas por capas para una ceja que no se distingue del vello real. Consulta y diseño personalizados.',
    h1: 'Cejas hiperrealismo en Alcantarilla, Murcia', lead: 'Técnicas combinadas por capas para conseguir una ceja que apenas se distingue del vello real, con densidad y profundidad a medida.', service: 'Hiperrealismo', related: ['microblading-alcantarilla-murcia', 'powder-brows-murcia'],
    sections: [
      ['Qué es el hiperrealismo', ['El hiperrealismo en cejas combina varias técnicas de micropigmentación trabajadas por capas: trazos finos que recrean el vello y sombreado suave para dar densidad y profundidad. El objetivo es una ceja que parezca tuya, con variación natural de dirección, grosor y color.']],
      ['Para quién suele ser una buena opción', ['Para quien busca el resultado más natural posible, tiene zonas con poco vello o desea recuperar una ceja con volumen y movimiento. Es un trabajo más minucioso y requiere un diseño muy personalizado, que decidimos en la consulta.']],
      ['Cómo es la cita', ['Estudio tu rostro, tu piel y tus proporciones; dibujo la forma con lápiz y trabajamos el diseño hasta que te convence. Después se realiza el tratamiento con material de un solo uso y recibes las pautas de cuidado.', 'Tras la cicatrización, un retoque afina y consolida el conjunto.']],
      ['Cicatrización y duración', ['Como en toda micropigmentación, el color evoluciona durante la cicatrización y la duración depende de la piel, el sol y los cuidados. Te daré una referencia orientativa en la consulta.']],
      ['Cuándo no es recomendable', ['En embarazo o lactancia, con ciertas condiciones de la piel o de salud y con algunos tratamientos puede no ser aconsejable. Lo hablamos con franqueza antes de reservar.']],
    ],
    faq: [['¿Qué diferencia hay con el microblading?', 'El microblading se centra en el trazo pelo a pelo; el hiperrealismo combina trazo y sombreado por capas para lograr más densidad y profundidad.'], ['¿Cuántas sesiones necesita?', 'Se trabaja en una sesión principal y un retoque tras la cicatrización. En la consulta valoramos si tu caso necesita algo más.'], ['¿Sirve para cejas con muy poco vello?', 'Suele ser una buena opción para recuperar densidad, pero lo valoramos en la consulta según tu piel y tu vello.'], ['¿Dónde puedo reservar?', 'Online desde esta web o por teléfono. El estudio está en Alcantarilla (Murcia), en Peluquería Fina Carpe.']],
  },
  {
    slug: 'micropigmentacion-labios-murcia', img: 'labios', alt: 'Labios con micropigmentación de contorno y color',
    title: 'Micropigmentación de labios en Murcia y Alcantarilla', desc: 'Micropigmentación de labios en Alcantarilla (Murcia): define el contorno y aporta color con un acabado suave y natural. Consulta personalizada y reserva online.',
    h1: 'Micropigmentación de labios en Alcantarilla, Murcia', lead: 'Define el contorno y aporta color a los labios con un acabado suave y natural, pensado para tu tono de piel.', service: 'Micropigmentación de labios', related: ['microblading-alcantarilla-murcia', 'powder-brows-murcia'],
    sections: [
      ['Qué es la micropigmentación de labios', ['Es una técnica que deposita pigmento en la capa superficial de la piel del labio para definir el contorno, corregir pequeñas asimetrías y aportar color. Según lo que busques, el efecto puede ir de un tono muy natural a uno más intenso.']],
      ['Para quién suele ser una buena opción', ['Para quien quiere unos labios más definidos o con más color sin retocarse a diario, o para equilibrar un contorno poco marcado. Elegimos el tono en la consulta según tu piel y el resultado que te guste.']],
      ['Cómo es la cita', ['Hablamos de lo que buscas, elegimos el tono y dibujamos el contorno para que lo apruebes antes de empezar. El tratamiento se hace con material de un solo uso y te explico los cuidados posteriores, que son especialmente importantes en esta zona.']],
      ['Cicatrización y duración', ['Durante la cicatrización el color cambia y después se asienta. La duración depende de la piel, del cuidado y de la exposición al sol. Se recomienda un retoque tras la cicatrización.']],
      ['Cuándo no es recomendable', ['Si has tenido herpes labial, estás embarazada o en lactancia, o tienes alguna condición de salud o piel que lo desaconseje, debemos valorarlo antes. Cuéntamelo en la consulta.']],
    ],
    faq: [['¿Queda un color natural?', 'Elegimos el tono contigo para que se adapte a tu piel y al acabado que prefieras, desde muy natural hasta más intenso.'], ['¿Tengo que tener algún cuidado especial?', 'Sí, te explico las pautas de cuidado tras el tratamiento, que ayudan a una buena cicatrización y a conservar el color.'], ['¿Hay contraindicaciones?', 'En algunos casos, como antecedentes de herpes labial o embarazo, hay que tomar precauciones. Lo valoramos antes de empezar.'], ['¿Dónde se realiza?', 'En el estudio de Alcantarilla (Murcia), dentro de Peluquería Fina Carpe.']],
  },
  {
    slug: 'diseno-de-cejas-alcantarilla', img: 'ceja-ojos-cerrados', alt: 'Diseño de cejas con hilo en Alcantarilla',
    title: 'Diseño de cejas con hilo y henna en Alcantarilla (Murcia)', desc: 'Diseño de cejas con hilo, henna y depilación en Alcantarilla, Murcia. Una forma a medida de tu rostro, sin pigmento permanente. Reserva tu cita online.',
    h1: 'Diseño de cejas en Alcantarilla, Murcia', lead: 'Cejas a medida de tu rostro, con hilo y henna, sin pigmento permanente: una forma limpia y definida que puedes mantener a tu ritmo.', service: 'Diseño de cejas con hilo', related: ['microblading-alcantarilla-murcia', 'powder-brows-murcia'],
    sections: [
      ['Diseño de cejas con hilo', ['La depilación con hilo permite perfilar la ceja con mucha precisión, vello a vello, respetando la forma natural y limpiando el contorno. Es una opción rápida y adecuada para mantener la ceja entre tratamientos.']],
      ['Henna de cejas', ['La henna tiñe el vello y deja un efecto de relleno suave sobre la piel durante un tiempo, sin pigmento permanente. Es una buena forma de probar un diseño antes de decidirte por una micropigmentación.']],
      ['Cuándo elegir esto o una micropigmentación', ['Si tu ceja tiene buena densidad y solo quieres una forma cuidada, el diseño con hilo y la henna pueden ser suficientes. Si buscas rellenar zonas sin vello de forma duradera, en la consulta te explico las opciones de microblading, powder brows o hiperrealismo.']],
      ['Cómo es la cita', ['Estudiamos tus proporciones, marcamos la forma con lápiz y trabajamos el diseño con hilo; si quieres henna, se aplica después. Te doy consejos para mantener el resultado en casa.']],
    ],
    faq: [['¿Cada cuánto se repite el diseño?', 'Depende del crecimiento de tu vello; lo habitual es mantenerlo cada pocas semanas. Te oriento en la cita.'], ['¿La henna es permanente?', 'No, es un tinte temporal que se desvanece con el tiempo.'], ['¿Puedo combinarlo con micropigmentación?', 'Sí. Muchas clientas mantienen el contorno con hilo entre retoques de micropigmentación.'], ['¿Dónde está el estudio?', 'En Alcantarilla (Murcia), dentro de Peluquería Fina Carpe.']],
  },
];

const labelOf = Object.fromEntries(PAGES.map((p) => [p.slug, p.h1.replace(/ en Alcantarilla, Murcia$/, '').replace(/^Cejas /, 'Cejas ')]));

const css = `.lp-nav{display:flex;justify-content:space-between;align-items:center;padding:1.2rem max(16px,3vw);border-bottom:1px solid var(--line)}.lp-nav a{text-decoration:none}.lp-nav .brand{font:400 1.5rem var(--display)}
.lp{max-width:1120px;margin:0 auto;padding:clamp(2rem,6vw,5rem) max(16px,3vw)}.lp-hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(1.5rem,4vw,4rem);align-items:center}
.lp h1{font:400 clamp(2.4rem,5vw,4.6rem)/1.02 var(--display);margin:.6rem 0 1.2rem;letter-spacing:-.01em}.lp .lead{font-size:1.2rem;margin-bottom:1.6rem}.lp .ph{aspect-ratio:4/5}
.crumbs{font:500 .74rem var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.crumbs a{color:inherit}
.lp-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:clamp(1.5rem,5vw,5rem);padding-top:clamp(2.5rem,6vw,5rem);border-top:1px solid var(--line);margin-top:clamp(2.5rem,6vw,5rem)}
.lp-body h2{font:400 clamp(1.5rem,2.4vw,2.2rem)/1.1 var(--display);margin:0 0 .8rem}.lp-body section{padding-bottom:2rem}.lp-body p{color:var(--muted);max-width:60ch}.lp-body aside{position:sticky;top:2rem;align-self:start}
.lp-cta{margin-top:1rem;display:grid;gap:.7rem}.lp-rel{display:grid;gap:.4rem;margin-top:1.6rem}.lp-rel a{color:var(--ink)}
.lp-faq details{border-bottom:1px solid var(--line);padding:1rem 0}.lp-faq summary{cursor:pointer;font:400 1.35rem var(--display)}.lp-faq p{margin:.6rem 0 0}
.lp-foot{border-top:1px solid var(--line);padding:2rem max(16px,3vw);color:var(--muted);font-size:.92rem;display:flex;gap:1.5rem;flex-wrap:wrap;justify-content:space-between}.lp-foot a{color:inherit}
@media(max-width:860px){.lp-hero,.lp-body{grid-template-columns:1fr}.lp-body aside{position:static;order:-1}}`;

const page = (p) => {
  const url = `%SITE%/${p.slug}`;
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const svcLd = { '@context': 'https://schema.org', '@type': 'Service', name: p.service, serviceType: p.service, description: p.desc, provider: { '@id': '%SITE%/#negocio' }, areaServed: ['Alcantarilla', 'Murcia'], url };
  const crumbLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: '%SITE%/' }, { '@type': 'ListItem', position: 2, name: p.h1, item: url }] };
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title><meta name="description" content="${esc(p.desc)}">
<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:locale" content="es_ES"><meta property="og:site_name" content="${NAME}"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="%SITE%/img/work/${p.img}.webp">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#e9dfd4">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css"><style>${css}</style>
${ld(BIZ_WITH_CTX)}${ld(svcLd)}${ld(faqLd)}${ld(crumbLd)}
</head><body>
<header class="lp-nav"><a class="brand" href="/">${NAME}</a><a class="btn" href="/?servicio=${encodeURIComponent(p.service)}#reservar">Reservar cita</a></header>
<main class="lp">
  <p class="crumbs"><a href="/">Inicio</a> · ${esc(p.service)}</p>
  <div class="lp-hero"><div><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p><p><a class="btn" href="/#reservar">Reservar cita</a></p></div>
    <figure class="ph" style="margin:0"><img src="/img/work/${p.img}.webp" alt="${esc(p.alt)}" width="780" height="975" fetchpriority="high" decoding="async"></figure></div>
  <div class="lp-body"><aside><h2>Estudio en Alcantarilla</h2><p>C. Joaquín Martínez López, 3<br>30820 Alcantarilla, Murcia<br>En Peluquería Fina Carpe</p><div class="lp-cta"><a class="btn" href="/#reservar">Reservar cita online</a><a class="btn btn-ghost" href="tel:+34606102400">Llamar · 606 10 24 00</a></div>
      <div class="lp-rel"><span class="crumbs">Otros tratamientos</span>${p.related.map((r) => `<a href="/${r}">${esc(labelOf[r])}</a>`).join('')}<a href="/diseno-de-cejas-alcantarilla">Diseño de cejas</a><a href="/micropigmentacion-labios-murcia">Micropigmentación de labios</a></div></aside>
    <div>${p.sections.map(([h, ps]) => `<section><h2>${esc(h)}</h2>${ps.map((t) => `<p>${esc(t)}</p>`).join('')}</section>`).join('')}
      <section class="lp-faq"><h2>Preguntas frecuentes</h2>${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
      <p>Los resultados varían de una persona a otra. En la consulta valoramos tu caso y te explicamos opciones, cuidados y expectativas con honestidad.</p></div></div>
</main>
<footer class="lp-foot"><span>© ${NAME} · Brow &amp; Make Up · Alcantarilla, Murcia</span><span><a href="/">Inicio</a> · <a href="/privacidad">Privacidad</a> · <a href="https://www.instagram.com/noeliaduque_brows/" rel="noopener">Instagram</a></span></footer>
</body></html>
`;
};
const BIZ_WITH_CTX = { '@context': 'https://schema.org', ...BIZ };

for (const p of PAGES) fs.writeFileSync(pub(`${p.slug}.html`), page(p));

/* portada: LD estático con el negocio y las preguntas frecuentes visibles */
let idx = fs.readFileSync(pub('index.html'), 'utf8');
const faq = [...idx.matchAll(/<details><summary>(.*?)<\/summary><p[^>]*>(.*?)<\/p><\/details>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')]);
const home = [BIZ_WITH_CTX, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
idx = idx.replace(/<script type="application\/ld\+json" id="ld">[\s\S]*?<\/script>/, `<script type="application/ld+json" id="ld">${JSON.stringify(home)}</script>`);
fs.writeFileSync(pub('index.html'), idx);
console.log(`${PAGES.length} páginas escritas y portada actualizada (${faq.length} preguntas en el LD).`);
