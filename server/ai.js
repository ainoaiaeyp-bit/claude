/* Lectura automática de facturas con Claude (opcional). Requiere ANTHROPIC_API_KEY y `npm install @anthropic-ai/sdk`.
   Sin ellas, las facturas se suben igualmente y se completan a mano. */
const SCHEMA = {
  type: 'object',
  properties: {
    supplier: { type: 'string', description: 'Razón social o nombre del emisor de la factura' },
    supplier_nif: { type: 'string', description: 'NIF/CIF/NIE del emisor, sin espacios; cadena vacía si no aparece' },
    number: { type: 'string', description: 'Número de factura; cadena vacía si no aparece' },
    date: { type: 'string', description: 'Fecha de la factura en formato YYYY-MM-DD' },
    concept: { type: 'string', description: 'Descripción breve de lo comprado, en español, máximo 80 caracteres' },
    base_eur: { type: 'number', description: 'Base imponible en euros' },
    vat_rate: { type: 'number', description: 'Tipo de IVA en porcentaje (21, 10, 4 o 0)' },
    vat_eur: { type: 'number', description: 'Cuota de IVA en euros' },
    irpf_eur: { type: 'number', description: 'Retención de IRPF en euros; 0 si no hay' },
    total_eur: { type: 'number', description: 'Total de la factura en euros' },
    category: { type: 'string', enum: ['alquiler', 'suministros', 'software', 'seguros', 'asesoria', 'marketing', 'formacion', 'equipamiento', 'pigmentos', 'material', 'productos', 'comisiones', 'otros'] },
  },
  required: ['supplier', 'supplier_nif', 'number', 'date', 'concept', 'base_eur', 'vat_rate', 'vat_eur', 'irpf_eur', 'total_eur', 'category'],
  additionalProperties: false,
};

const PROMPT = 'Extrae los datos de esta factura recibida por un estudio de estética y micropigmentación en España. Usa exactamente lo que figura en el documento; no inventes datos. Categorías: pigmentos (pigmentos, agujas, cartuchos), material (desechables, guantes, higiene), productos (cosmética para vender), alquiler, suministros (luz, agua, internet, teléfono), software, seguros, asesoria, marketing, formacion, equipamiento (mobiliario, máquinas), comisiones (TPV, pasarela de pago), otros.';

export async function createInvoiceExtractor() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  let Anthropic;
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')); }
  catch { console.warn('[facturas] Falta @anthropic-ai/sdk: ejecuta "npm install @anthropic-ai/sdk" para leer facturas con IA.'); return null; }
  const client = new Anthropic();
  const model = process.env.INVOICE_MODEL || 'claude-opus-5-5';
  return async function extract(bytes, mime) {
    const data = Buffer.from(bytes).toString('base64');
    let block;
    if (mime === 'application/pdf') block = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
    else if (mime.startsWith('image/')) block = { type: 'image', source: { type: 'base64', media_type: mime, data } };
    else block = { type: 'text', text: Buffer.from(bytes).toString('utf8').slice(0, 60000) };
    const res = await client.messages.create({
      model, max_tokens: 8000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: [block, { type: 'text', text: PROMPT }] }],
    });
    if (res.stop_reason === 'refusal') throw new Error('El modelo no pudo leer este documento');
    const t = res.content.find((b) => b.type === 'text');
    if (!t) throw new Error('Respuesta vacía');
    const x = JSON.parse(t.text);
    const c = (v) => Math.round((Number(v) || 0) * 100);
    return { supplier: x.supplier, supplier_nif: x.supplier_nif, number: x.number, date: x.date, concept: x.concept, base_cents: c(x.base_eur), vat_rate: x.vat_rate, vat_cents: c(x.vat_eur), irpf_cents: c(x.irpf_eur), total_cents: c(x.total_eur), category: x.category };
  };
}
