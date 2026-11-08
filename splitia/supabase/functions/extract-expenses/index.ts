// Edge Function: extract-expenses
// Lee fotos de tickets o capturas de extractos bancarios con Claude (visión)
// y devuelve gastos estructurados. Requiere sesión iniciada.
//
// Secretos necesarios:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Opcional:             supabase secrets set ANTHROPIC_MODEL=claude-opus-5-5
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const CATEGORIES = ['alimentacion', 'hogar', 'servicios', 'transporte', 'ocio', 'salud', 'otros'];

// Salida estructurada (los modelos actuales no admiten tool_choice forzado).
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['expenses'],
  properties: {
    expenses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['concept', 'amount', 'date', 'category', 'kind', 'is_refund', 'confidence', 'items'],
        properties: {
          concept: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          kind: { type: 'string', enum: ['expense', 'income', 'transfer'] },
          is_refund: { type: 'boolean' },
          confidence: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'price'],
              properties: { name: { type: 'string' }, price: { type: 'number' } },
            },
          },
        },
      },
    },
  },
};

const system = (mode: string, today: string) =>
  mode === 'statement'
    ? `Eres un experto leyendo extractos bancarios españoles a partir de capturas de pantalla. Hoy es ${today}.
Extrae CADA movimiento visible, uno por línea.
- Formato numérico español (1.234,56 = 1234.56). "amount" siempre positivo.
- Cargos, pagos con tarjeta, recibos y comisiones: kind "expense". Nóminas, ingresos y abonos: "income". Traspasos propios y Bizum entre personas: "transfer".
- "date" en YYYY-MM-DD. Si no trae año, usa el más probable (nunca una fecha futura). Cadena vacía si no es legible.
- "concept": comercio limpio (p. ej. "COMPRA TARJ. 5540 MERCADONA VALENCIA" -> "Mercadona"), máximo 80 caracteres.
- "items" siempre vacío. "confidence" de 0 a 1.
- Ignora saldos, totales, cabeceras y publicidad. No inventes movimientos.`
    : `Eres un experto leyendo tickets de compra españoles. Hoy es ${today}.
La imagen puede contener uno o varios tickets: devuelve un gasto por ticket.
- "concept": nombre del establecimiento. "amount": TOTAL final pagado (con IVA), positivo.
- "date" en YYYY-MM-DD; cadena vacía si no es legible. Formato numérico español (1.234,56 = 1234.56).
- "items": cada artículo con su precio si se leen bien; vacío si no.
- Si es un ticket de devolución, is_refund = true. kind = "expense".
- "confidence" de 0 a 1. Si la imagen no es un ticket, devuelve una lista vacía.`;

async function analyze(client: Anthropic, model: string, base64: string, mode: string) {
  const today = new Date().toISOString().slice(0, 10);
  const res = await client.messages.create({
    model,
    max_tokens: 8000,
    system: system(mode, today),
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: mode === 'statement' ? 'Extrae todos los movimientos de este extracto.' : 'Lee este ticket.' },
        ],
      },
    ],
  } as never);
  const msg = res as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
  if (msg.stop_reason === 'refusal') throw new Error('La IA no pudo procesar esta imagen.');
  const text = msg.content.find((b) => b.type === 'text')?.text ?? '{}';
  try {
    return (JSON.parse(text).expenses ?? []) as unknown[];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: 'No autenticado' }, 401);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'Falta el secreto ANTHROPIC_API_KEY en Supabase' }, 500);
    const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5';

    const { images, mode } = await req.json();
    if (!Array.isArray(images) || images.length === 0 || images.length > 6) return json({ error: 'Envía entre 1 y 6 imágenes' }, 400);
    if (mode !== 'receipt' && mode !== 'statement') return json({ error: 'mode inválido' }, 400);

    const client = new Anthropic({ apiKey });
    const results = await Promise.all(images.map((b64: string) => analyze(client, model, b64, mode)));
    return json({ expenses: results.flat() });
  } catch (e) {
    console.error(e);
    const status = (e as { status?: number })?.status;
    if (status === 429) return json({ error: 'Demasiadas peticiones a la IA, prueba en un minuto.' }, 429);
    return json({ error: e instanceof Error ? e.message : 'Error' }, 500);
  }
});
