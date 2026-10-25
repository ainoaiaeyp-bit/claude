import { DEFAULT_TEMPLATES } from './crm.js';

export const DEFAULT_HOURS = {
  0: [], 1: [[600, 840], [960, 1200]], 2: [[600, 840], [960, 1200]], 3: [[600, 840], [960, 1200]],
  4: [[600, 840], [960, 1200]], 5: [[600, 840], [960, 1200]], 6: [[540, 840]]
};

export const DEFAULT_SETTINGS = {
  businessName: 'Noelia Duque · Brow & Make Up',
  tagline: 'Brow artist en Alcantarilla, Murcia. Microblading, micropigmentación, maquillaje y estética.',
  city: 'Alcantarilla, Murcia',
  address: 'C. Joaquín Martínez López, 3, 30820 Alcantarilla, Murcia (en Peluquería Fina Carpe)',
  phone: '606 10 24 00', whatsapp: '34606102400', email: 'noeliaduquebrowandmakeup@gmail.com',
  instagram: 'https://www.instagram.com/noeliaduque_brows/', notificationEmail: 'noeliaduquebrowandmakeup@gmail.com',
  siteUrl: '',
  hours: DEFAULT_HOURS, slotStep: 30, buffer: 15, minNoticeHours: 24, maxDaysAhead: 120, cancelHours: 24, autoConfirm: false, bookingsOpen: true, referralOn: true, referralRewardCents: 1000, voucherMinCents: 2000, voucherValidMonths: 12,
  voucherPaymentInfo: 'Paga por Bizum o transferencia indicando tu nombre y activaremos el bono en cuanto lo recibamos.', shopPaymentInfo: 'Reserva tus productos y los recoges y pagas en el estudio en tu próxima cita.', bookingsClosedMessage: 'Ahora mismo no estoy aceptando reservas online. Escríbeme por WhatsApp o déjame tus datos y te contesto en cuanto pueda.',
  depositInfo: '', homeFeeInfo: 'Desplazamiento a domicilio con suplemento según zona.',
  templates: DEFAULT_TEMPLATES,
  // contabilidad
  legalName: '', nif: '', fiscalAddress: '', pricesIncludeVat: true, defaultVat: 21, irpfFractionRate: 20,
  gestoria: { name: '', email: '', cc: '', note: '' },
  quarterlyAutoSend: false,
  // CFO
  targetNetMonthlyCents: 0, autonomoFeeMonthlyCents: 0, fixedExtraMonthlyCents: 0, workDaysNote: '',
  // automatizaciones
  automations: {
    confirmation: { on: true, subject: 'Tu cita en {estudio}', body: 'Hola {nombre},\n\nTe confirmo tu cita de {servicio} el {fecha} a las {hora} en {direccion}.\n\nPuedes consultarla o cancelarla aquí: {enlace}\n\nUn abrazo,\nNoelia' },
    reminder: { on: true, hoursBefore: 24, subject: 'Mañana tienes cita en {estudio}', body: 'Hola {nombre},\n\nTe recuerdo tu cita de mañana, {fecha} a las {hora}, para {servicio}.\n\nSi no puedes venir, avísame con tiempo desde {enlace} y la movemos.\n\nNoelia' },
    review: { on: false, daysAfter: 2, subject: '¿Qué tal tu experiencia?', body: 'Hola {nombre},\n\nGracias por venir a {estudio}. Si el resultado te ha gustado, ¿me dejas una reseña? Me ayuda muchísimo.\n\nUn abrazo,\nNoelia' },
    proposal: { on: true, subject: 'Te propongo otra hora para tu cita', body: 'Hola {nombre},\n\nGracias por pedir cita para {servicio}. No me viene bien el {fecha_anterior} a las {hora_anterior}, pero te propongo el {fecha} a las {hora}.\n\n{mensaje}\n\nPuedes aceptarla o decirme que no te viene bien aquí: {enlace}\n\nUn abrazo,\nNoelia' },
    rejection: { on: true, subject: 'Sobre tu solicitud de cita', body: 'Hola {nombre},\n\nGracias por escribirme. Lamentablemente no puedo atender tu solicitud de {servicio} el {fecha} a las {hora}.\n\n{mensaje}\n\nSi quieres, puedes elegir otro día en {web}.\n\nUn abrazo,\nNoelia' },
    voucher: { on: true, subject: '{comprador} te regala un bono de {importe} en {estudio}', body: 'Hola {nombre},\n\n{comprador} te ha regalado un bono de {importe} para disfrutar en {estudio}.\n\n{mensaje}\n\nTu código es {codigo}. Puedes verlo aquí: {enlace}\nCaduca el {caduca}. Para usarlo, reserva tu cita en {web} y dile el código a Noelia al llegar.\n\nUn abrazo,\nNoelia' },
    voucher_order: { on: true, subject: 'Tu bono regalo de {estudio}', body: 'Hola {nombre},\n\nGracias por tu pedido: bono de {importe} (código {codigo}).\n\n{pago}\n\nCuando lo recibamos, lo activamos y se lo enviamos a quien quieras. Puedes ver el bono aquí: {enlace}\n\nUn abrazo,\nNoelia' },
    referral_reward: { on: true, subject: 'Tienes un regalo de {estudio}', body: 'Hola {nombre},\n\n{mensaje}\n\nTe regalamos un bono de {importe} para tu próxima cita. Código: {codigo}\nPuedes verlo aquí: {enlace}\nCaduca el {caduca}.\n\nGracias,\nNoelia' },
    referral_invite: { on: false, daysAfter: 7, subject: 'Comparte tu regalo con una amiga', body: 'Hola {nombre},\n\nSi tienes una amiga que quiera cuidarse las cejas, comparte tu enlace: {enlace_amiga}\nLas dos recibiréis un bono de {importe_regalo} cuando termine su primera cita.\n\nGracias por recomendarme,\nNoelia' },
    retoque: { on: true, subject: 'Es momento de tu retoque', body: 'Hola {nombre},\n\nYa ha pasado el tiempo ideal para afinar tu tratamiento. Reserva tu retoque cuando quieras en {web}.\n\nNoelia' },
    birthday: { on: false, subject: '¡Feliz cumpleaños, {nombre}!', body: 'Hola {nombre},\n\n¡Feliz cumpleaños! Te deseamos un día precioso.\n\nNoelia · {estudio}' },
    reactivation: { on: false, subject: 'Te echamos de menos', body: 'Hola {nombre},\n\nHace tiempo que no nos vemos. Cuando quieras, reserva en {web}.\n\nNoelia' },
  },
};

export const EXPENSE_CATEGORIES = [
  { id: 'alquiler', label: 'Alquiler del local', kind: 'fijo' },
  { id: 'suministros', label: 'Suministros (luz, agua, internet)', kind: 'fijo' },
  { id: 'software', label: 'Software y suscripciones', kind: 'fijo' },
  { id: 'seguros', label: 'Seguros', kind: 'fijo' },
  { id: 'asesoria', label: 'Asesoría y gestoría', kind: 'fijo' },
  { id: 'marketing', label: 'Marketing y publicidad', kind: 'fijo' },
  { id: 'formacion', label: 'Formación', kind: 'fijo' },
  { id: 'equipamiento', label: 'Equipamiento y mobiliario', kind: 'fijo' },
  { id: 'pigmentos', label: 'Pigmentos y agujas', kind: 'variable' },
  { id: 'material', label: 'Material y desechables', kind: 'variable' },
  { id: 'productos', label: 'Productos de venta y cosmética', kind: 'variable' },
  { id: 'comisiones', label: 'Comisiones de cobro', kind: 'variable' },
  { id: 'otros', label: 'Otros gastos', kind: 'fijo' },
];

export const SEED_SERVICES = [
  ['Microblading pelo a pelo', 'Micropigmentación', 'Trazo fino, dibujado pelo a pelo, que recrea el vello natural. Diseño a medida según la arquitectura de tu rostro.', 120, 25000, 0, 0, 2800],
  ['Powder brows (sombreado)', 'Micropigmentación', 'Sombreado suave y difuminado, de efecto maquillado. Recomendado para pieles mixtas o grasas y para quien busca una ceja definida.', 120, 25000, 0, 0, 2800],
  ['Hiperrealismo', 'Micropigmentación', 'Técnicas combinadas y aplicadas por capas para una ceja indistinguible del vello real.', 120, 28000, 0, 0, 3200],
  ['Retoque de cejas', 'Micropigmentación', 'Sesión de afinado tras la cicatrización para ajustar y consolidar el tono y el diseño.', 60, 6000, 0, 0, 1200],
  ['Micropigmentación de labios', 'Micropigmentación', 'Define el contorno y aporta color y volumen visual a los labios con un acabado suave y natural.', 120, 25000, 1, 0, 3000],
  ['Consulta de diseño de cejas', 'Micropigmentación', 'Una conversación privada para estudiar tus proporciones, probar la forma sobre tu rostro y decidir la técnica con calma.', 20, 0, 0, 0, 0],
  ['Diseño de cejas con hilo', 'Cejas', 'Perfilado de precisión con hilo para definir la forma ideal de tu ceja, con máxima limpieza.', 30, 1200, 0, 0, 100],
  ['Henna de cejas', 'Cejas', 'Tinte natural que rellena y define la ceja, sin agujas y con duración de varias semanas.', 45, 2000, 0, 0, 250],
  ['Depilación con hilo (facial)', 'Depilación', 'Técnica milenaria de gran precisión para las zonas delicadas del rostro.', 20, 1000, 1, 0, 50],
  ['Depilación con cera', 'Depilación', 'Piel suave durante más tiempo. Consulta las zonas disponibles.', 30, 1500, 1, 0, 200],
  ['Higiene facial profunda', 'Facial', 'Ritual de limpieza profunda que purifica y revitaliza la piel, adaptado a ti.', 60, 5000, 0, 0, 600],
  ['Peeling con ácidos', 'Facial', 'Renovación profunda de la piel con ácidos, tras estudiar tu tipo de piel.', 60, 6000, 0, 0, 900],
  ['Maquillaje social', 'Maquillaje', 'Un acabado elegante y duradero para cenas, celebraciones y ocasiones especiales.', 60, 4500, 0, 1, 500],
  ['Maquillaje de novia', 'Maquillaje', 'Tu look de boda, diseñado a medida y pensado para resistir emociones, fotografías y largas horas.', 90, 14000, 1, 1, 900],
  ['Maderoterapia', 'Corporal', 'Sesión corporal con instrumentos de madera para tonificar y revitalizar.', 60, 5000, 0, 0, 300],
];

export function seedData() {
  return {
    products: [['Kit de cuidados post-micropigmentación', 'Crema cicatrizante y limpiador suave para las primeras semanas de tu tratamiento.', 2800], ['Protector solar facial SPF50', 'Protege el pigmento del sol y alarga la duración del resultado.', 1900], ['Hidratante de labios reparador', 'Para el cuidado diario tras la micropigmentación de labios.', 1400]].map((x, i) => ({ id: i + 1, name: x[0], description: x[1], price_cents: x[2], vat_rate: 21, stock: null, active: true, external_url: '', sort: i, created_at: new Date().toISOString() })),
    settings: {},
    services: SEED_SERVICES.map((s, i) => ({
      id: i + 1, name: s[0], category: s[1], description: s[2], duration_min: s[3], price_cents: s[4], price_from: !!s[5], allow_home: !!s[6],
      material_cost_cents: s[7], vat_rate: 21, active: true, sort: i,
    })),
  };
}
