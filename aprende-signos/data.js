// Contenido (Lengua de Signos Española, LSE). BORRADOR: valídalo con una persona sorda signante
// o con el diccionario de la CNSE antes de publicarlo. `media` admite URL de vídeo (.mp4/.webm) o imagen.
// shape: open5 flat fist up point v three four y c o l b i rock | rot: giro de la mano en grados
// loc: sien frente ceja mejilla boca barbilla pecho hombro neutro | mv: none | arrow(p) | shake(a) | circle
(function () {
  var N = { t: "none" };
  function A() { return { t: "arrow", p: [].slice.call(arguments) }; }
  function K(a) { return { t: "shake", a: a || "x" }; }
  function S(id, word, how, shape, rot, loc, mv, two) { return { id: id, word: word, how: how, media: "", shape: shape, rot: rot, loc: loc, mv: mv || N, two: !!two }; }
  window.LESSONS = [
    { id: "saludos", title: "Saludos y cortesía", desc: "Las primeras palabras para empezar cualquier conversación.", signs: [
      S("hola", "Hola", "Mano abierta junto a la sien o la frente; se aleja hacia fuera con un pequeño gesto, como un saludo.", "flat", 20, "sien", A([0, 0], [30, -8])),
      S("adios", "Adiós", "Mano abierta con la palma hacia fuera, doblando y estirando los dedos varias veces.", "open5", 0, "neutro", K("x")),
      S("gracias", "Gracias", "Mano plana que toca la barbilla y avanza hacia delante y hacia abajo, hacia la otra persona.", "flat", -35, "barbilla", A([0, 0], [16, 26])),
      S("si", "Sí", "Puño cerrado que se inclina arriba y abajo desde la muñeca, como un asentimiento.", "fist", 0, "neutro", K("y")),
      S("no", "No", "Dedo índice extendido que se mueve de lado a lado.", "point", 0, "neutro", K("x")),
      S("bien", "Bien", "Puño con el pulgar hacia arriba.", "up", 0, "neutro"),
      S("mal", "Mal", "Puño con el pulgar hacia abajo.", "up", 180, "neutro"),
      S("porfavor", "Por favor", "Manos planas con las palmas hacia arriba, con un pequeño movimiento hacia la otra persona y expresión amable.", "flat", 0, "neutro", A([0, 0], [0, -26]), true)
    ]},
    { id: "presentarse", title: "Presentarse", desc: "Habla de ti y pide que te lo repitan.", signs: [
      S("yo", "Yo", "Dedo índice que se apunta al pecho.", "point", 0, "pecho", A([0, 0], [-6, 8])),
      S("tu", "Tú", "Dedo índice que apunta hacia la otra persona.", "point", 90, "neutro", A([0, 0], [26, 0])),
      S("sordo", "Sordo/a", "Dedo índice que toca el oído y después la boca.", "point", 0, "mejilla", A([0, 0], [-6, 18])),
      S("oyente", "Oyente", "Dedo índice que sale de la boca hacia delante, en movimiento circular pequeño.", "point", 0, "boca", A([0, 0], [20, 6])),
      S("entender", "Entender", "Dedo índice junto a la frente; la mano se abre ligeramente al «caer la ficha».", "point", 0, "frente", A([0, 0], [14, -10])),
      S("despacio", "Despacio", "Manos planas con las palmas hacia abajo que descienden lentamente.", "flat", 90, "pecho", A([0, 0], [0, 22]), true),
      S("ayuda", "Ayuda", "Una mano en puño con el pulgar arriba se apoya sobre la palma de la otra y ambas suben.", "up", 0, "pecho", A([0, 0], [0, -22]), true)
    ]},
    { id: "numeros", title: "Números del 1 al 5", desc: "Cuenta con una mano. La configuración de los dedos es lo importante.", signs: [
      S("n1", "Uno", "Solo el dedo índice extendido; los demás, cerrados.", "point", 0, "neutro"),
      S("n2", "Dos", "Índice y corazón extendidos y separados.", "v", 0, "neutro"),
      S("n3", "Tres", "Índice, corazón y anular extendidos; pulgar y meñique recogidos.", "three", 0, "neutro"),
      S("n4", "Cuatro", "Cuatro dedos extendidos (sin el pulgar), palma hacia fuera.", "four", 0, "neutro"),
      S("n5", "Cinco", "Mano abierta con los cinco dedos extendidos y separados.", "open5", 0, "neutro")
    ]},
    { id: "colores", title: "Colores básicos", desc: "Muchos colores se signan señalando algo de la cara o del entorno.", signs: [
      S("rojo", "Rojo", "Dedo índice que roza los labios y baja ligeramente.", "point", 0, "boca", A([0, 0], [0, 24])),
      S("blanco", "Blanco", "Mano con los dedos juntos que toca el pecho y se aleja hacia delante.", "flat", 0, "pecho", A([0, 0], [28, 0])),
      S("negro", "Negro", "Dedo índice que se desliza sobre la ceja.", "point", 90, "ceja", A([0, 0], [-26, 0])),
      S("azul", "Azul", "Mano abierta que se agita suavemente con la palma hacia fuera, a la altura del hombro.", "open5", 0, "hombro", K("x")),
      S("verde", "Verde", "Mano en forma de «V» que se agita lateralmente delante del cuerpo.", "v", 0, "neutro", K("x")),
      S("amarillo", "Amarillo", "Mano en «Y» (pulgar y meñique extendidos) que gira desde la muñeca.", "y", 0, "neutro", { t: "circle" })
    ]},
    { id: "familia", title: "Familia", desc: "Los signos de las personas más cercanas.", signs: [
      S("madre", "Madre", "Mano en forma de «C» que toca la mejilla y baja hacia la barbilla.", "c", 0, "mejilla", A([0, 0], [0, 26])),
      S("padre", "Padre", "Dedo índice que toca la mejilla y luego se acerca al mentón.", "point", 0, "mejilla", A([0, 0], [-10, 26])),
      S("hermano", "Hermano/a", "Dos dedos índice juntos que se tocan por los costados, indicando «parejas».", "point", 0, "neutro", N, true),
      S("bebe", "Bebé", "Los brazos se cruzan como si se acunara a un bebé y se balancean suavemente.", "flat", 90, "pecho", K("x"), true),
      S("abuelo", "Abuelo/a", "Mano en forma de «C» que toca la barbilla y baja con un movimiento de alargamiento (barba).", "c", 0, "barbilla", A([0, 0], [0, 28]))
    ]},
    { id: "emociones", title: "Emociones", desc: "Cuerpo y cara cuentan tanto como las manos.", signs: [
      S("feliz", "Feliz", "Mano plana que sube en círculos sobre el pecho, con sonrisa.", "flat", 0, "pecho", { t: "circle" }),
      S("triste", "Triste", "Mano abierta delante de la cara que baja despacio, con gesto de pena.", "open5", 0, "frente", A([0, 0], [0, 40])),
      S("enfadado", "Enfadado/a", "Mano en forma de garra delante de la cara, que se tensa, con gesto serio.", "c", 0, "frente", K("y")),
      S("cansado", "Cansado/a", "Manos planas sobre el pecho que caen hacia abajo, con los hombros hundidos.", "flat", 0, "pecho", A([0, 0], [0, 20]), true),
      S("querer", "Querer", "Mano en garra que se cierra y se acerca al pecho.", "c", 0, "neutro", A([0, 0], [-24, 8]))
    ]},
    { id: "preguntas", title: "Preguntas", desc: "En signos, las cejas hacen la mitad de la pregunta.", signs: [
      S("que", "¿Qué?", "Dedo índice que se agita de lado a lado, con cejas fruncidas y la cabeza ligeramente inclinada.", "point", 0, "neutro", K("x")),
      S("quien", "¿Quién?", "Dedo índice que gira delante de la boca, con cejas fruncidas.", "point", 0, "boca", { t: "circle" }),
      S("donde", "¿Dónde?", "Mano abierta con palma hacia arriba que se mueve en pequeños círculos.", "open5", 0, "neutro", K("x")),
      S("cuando", "¿Cuándo?", "Dedo índice que gira sobre el otro índice, como una aguja de reloj.", "point", 0, "neutro", { t: "circle" }, true),
      S("porque", "¿Por qué?", "Dedo índice que toca la frente y avanza hacia delante, con cejas fruncidas.", "point", 0, "frente", A([0, 0], [28, -6]))
    ]},
    { id: "comida", title: "Comida y bebida", desc: "Signos de uso diario en la mesa y en el bar.", signs: [
      S("comer", "Comer", "Dedos juntos que se acercan a la boca varias veces.", "o", 0, "boca", K("y")),
      S("beber", "Beber", "Mano en «C» que se lleva a la boca y se inclina, como un vaso.", "c", 0, "boca", A([0, 0], [4, -10])),
      S("agua", "Agua", "Dedo índice que roza la barbilla y baja por el cuello.", "point", 0, "barbilla", A([0, 0], [0, 22])),
      S("leche", "Leche", "Mano que se cierra y se abre en puño, como si ordeñara.", "fist", 0, "neutro", K("y")),
      S("hambre", "Hambre", "Mano en «C» que baja por el pecho, desde la garganta al estómago.", "c", 0, "barbilla", A([0, 0], [0, 50])),
      S("sed", "Sed", "Dedo índice que baja despacio por el cuello, con gesto de sequedad.", "point", 0, "barbilla", A([0, 0], [0, 28]))
    ]},
    { id: "tiempo", title: "Tiempo", desc: "Hoy, mañana, ayer: el tiempo se coloca en una línea delante o detrás de ti.", signs: [
      S("hoy", "Hoy", "Manos con las palmas hacia arriba que bajan un poco, «aquí y ahora».", "flat", 0, "neutro", A([0, 0], [0, 14]), true),
      S("manana", "Mañana", "Mano con el pulgar extendido que se mueve hacia delante.", "l", 90, "mejilla", A([0, 0], [30, 0])),
      S("ayer", "Ayer", "Mano con el pulgar extendido que se mueve hacia atrás, por encima del hombro.", "l", -90, "mejilla", A([0, 0], [-30, 0])),
      S("ahora", "Ahora", "Manos en «B» con las palmas hacia abajo que bajan con un golpe seco.", "b", 0, "neutro", A([0, 0], [0, 12]), true),
      S("despues", "Después", "Mano plana que da una vuelta hacia delante, como pasando una página.", "flat", 0, "neutro", A([0, 0], [26, 6]))
    ]},
    { id: "acciones", title: "Acciones", desc: "Verbos básicos para construir frases.", signs: [
      S("ir", "Ir", "Dedo índice que se aleja del cuerpo.", "point", 0, "pecho", A([0, 0], [30, 0])),
      S("venir", "Venir", "Dedo índice que se acerca al cuerpo.", "point", 0, "neutro", A([0, 0], [-30, 0])),
      S("dar", "Dar", "Mano en «O» que sale del cuerpo hacia la otra persona y se abre.", "o", 0, "pecho", A([0, 0], [30, 4])),
      S("esperar", "Esperar", "Mano en garra con los dedos que se mueven, delante del cuerpo.", "four", 0, "neutro", K("y")),
      S("saber", "Saber", "Dedos juntos que golpean suavemente la frente.", "flat", 0, "frente", K("y"))
    ]}
  ];
})();
