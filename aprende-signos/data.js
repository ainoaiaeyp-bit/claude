// Contenido de las lecciones (Lengua de Signos Española, LSE).
// IMPORTANTE: las descripciones son un borrador inicial. Deben validarse con una
// persona sorda signante / el diccionario oficial de la CNSE antes de publicarse.
// Para añadir vídeo o imagen a un signo, rellena el campo `media` (URL .mp4/.webm/.gif/.png).
window.LESSONS = [
  {
    id: "saludos", title: "Saludos y cortesía", icon: "👋",
    desc: "Las primeras palabras para empezar cualquier conversación.",
    signs: [
      { id: "hola", word: "Hola", emoji: "👋", how: "Mano abierta junto a la sien o la frente; se aleja hacia fuera con un pequeño gesto, como un saludo.", media: "", shape: "flat", rot: 20, loc: "sien", mv: {"t": "arrow", "p": [[0, 0], [30, -8]]} },
      { id: "adios", word: "Adiós", emoji: "🤚", how: "Mano abierta con la palma hacia fuera, doblando y estirando los dedos varias veces.", media: "", shape: "open5", rot: 0, loc: "neutro", mv: {"t": "shake", "a": "x"} },
      { id: "gracias", word: "Gracias", emoji: "🙏", how: "Mano plana que toca la barbilla y avanza hacia delante y hacia abajo, hacia la otra persona.", media: "", shape: "flat", rot: -35, loc: "barbilla", mv: {"t": "arrow", "p": [[0, 0], [16, 26]]} },
      { id: "si", word: "Sí", emoji: "✊", how: "Puño cerrado que se inclina arriba y abajo desde la muñeca, como un asentimiento.", media: "", shape: "fist", rot: 0, loc: "neutro", mv: {"t": "shake", "a": "y"} },
      { id: "no", word: "No", emoji: "☝️", how: "Dedo índice extendido que se mueve de lado a lado.", media: "", shape: "point", rot: 0, loc: "neutro", mv: {"t": "shake", "a": "x"} },
      { id: "bien", word: "Bien", emoji: "👍", how: "Puño con el pulgar hacia arriba.", media: "", shape: "up", rot: 0, loc: "neutro", mv: {"t": "none"} },
      { id: "mal", word: "Mal", emoji: "👎", how: "Puño con el pulgar hacia abajo.", media: "", shape: "up", rot: 180, loc: "neutro", mv: {"t": "none"} },
      { id: "porfavor", word: "Por favor", emoji: "🤲", how: "Manos planas con las palmas hacia arriba, con un pequeño movimiento hacia la otra persona, con expresión amable.", media: "", shape: "flat", rot: 0, loc: "neutro", mv: {"t": "arrow", "p": [[0, 0], [0, -26]]}, two: true }
    ]
  },
  {
    id: "numeros", title: "Números del 1 al 5", icon: "🔢",
    desc: "Cuenta con una mano. La configuración de los dedos es lo importante.",
    signs: [
      { id: "n1", word: "Uno", emoji: "☝️", how: "Solo el dedo índice extendido; los demás, cerrados.", media: "", shape: "point", rot: 0, loc: "neutro", mv: {"t": "none"} },
      { id: "n2", word: "Dos", emoji: "✌️", how: "Índice y corazón extendidos y separados.", media: "", shape: "v", rot: 0, loc: "neutro", mv: {"t": "none"} },
      { id: "n3", word: "Tres", emoji: "🤟", how: "Índice, corazón y anular extendidos; pulgar y meñique recogidos.", media: "", shape: "three", rot: 0, loc: "neutro", mv: {"t": "none"} },
      { id: "n4", word: "Cuatro", emoji: "🖖", how: "Cuatro dedos extendidos (sin el pulgar), palma hacia fuera.", media: "", shape: "four", rot: 0, loc: "neutro", mv: {"t": "none"} },
      { id: "n5", word: "Cinco", emoji: "🖐️", how: "Mano abierta con los cinco dedos extendidos y separados.", media: "", shape: "open5", rot: 0, loc: "neutro", mv: {"t": "none"} }
    ]
  },
  {
    id: "colores", title: "Colores básicos", icon: "🎨",
    desc: "Muchos colores se signan señalando algo de la cara o del entorno.",
    signs: [
      { id: "rojo", word: "Rojo", emoji: "🔴", how: "Dedo índice que roza los labios y baja ligeramente.", media: "", shape: "point", rot: 0, loc: "boca", mv: {"t": "arrow", "p": [[0, 0], [0, 24]]} },
      { id: "blanco", word: "Blanco", emoji: "⚪", how: "Mano con los dedos juntos que toca el pecho y se aleja hacia delante.", media: "", shape: "flat", rot: 0, loc: "pecho", mv: {"t": "arrow", "p": [[0, 0], [28, 0]]} },
      { id: "negro", word: "Negro", emoji: "⚫", how: "Dedo índice que se desliza sobre la ceja.", media: "", shape: "point", rot: 90, loc: "ceja", mv: {"t": "arrow", "p": [[0, 0], [-26, 0]]} },
      { id: "azul", word: "Azul", emoji: "🔵", how: "Mano abierta que se agita suavemente con la palma hacia fuera, a la altura del hombro.", media: "", shape: "open5", rot: 0, loc: "hombro", mv: {"t": "shake", "a": "x"} },
      { id: "verde", word: "Verde", emoji: "🟢", how: "Mano en forma de 'V' que se agita lateralmente delante del cuerpo.", media: "", shape: "v", rot: 0, loc: "neutro", mv: {"t": "shake", "a": "x"} },
      { id: "amarillo", word: "Amarillo", emoji: "🟡", how: "Mano en 'Y' (pulgar y meñique extendidos) que gira desde la muñeca.", media: "", shape: "y", rot: 0, loc: "neutro", mv: {"t": "circle"} }
    ]
  },
  {
    id: "familia", title: "Familia", icon: "👨‍👩‍👧",
    desc: "Los signos de las personas más cercanas.",
    signs: [
      { id: "madre", word: "Madre", emoji: "👩", how: "Mano en forma de 'C' o con los dedos juntos que toca la mejilla y baja hacia la barbilla.", media: "", shape: "c", rot: 0, loc: "mejilla", mv: {"t": "arrow", "p": [[0, 0], [0, 26]]} },
      { id: "padre", word: "Padre", emoji: "👨", how: "Dedo índice que toca la mejilla y luego se acerca al mentón.", media: "", shape: "point", rot: 0, loc: "mejilla", mv: {"t": "arrow", "p": [[0, 0], [-10, 26]]} },
      { id: "hermano", word: "Hermano/a", emoji: "🧑‍🤝‍🧑", how: "Dos dedos índice juntos que se tocan por los costados, indicando 'parejas'.", media: "", shape: "point", rot: 0, loc: "neutro", mv: {"t": "none"}, two: true },
      { id: "bebe", word: "Bebé", emoji: "👶", how: "Los brazos se cruzan como si se acunara a un bebé y se balancean suavemente.", media: "", shape: "flat", rot: 90, loc: "pecho", mv: {"t": "shake", "a": "x"}, two: true },
      { id: "abuelo", word: "Abuelo/a", emoji: "👴", how: "Mano en forma de 'C' que toca la barbilla y baja con un movimiento de alargamiento (barba).", media: "", shape: "c", rot: 0, loc: "barbilla", mv: {"t": "arrow", "p": [[0, 0], [0, 28]]} }
    ]
  }
];
