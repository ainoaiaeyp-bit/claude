import { supabase } from './supabase';
import type { DetectedExpense, ExpenseCategory } from './types';
import { CATEGORIES } from './categories';

export type ImportMode = 'receipt' | 'statement';

/** Reduce la foto (móvil = 4-12 MB) a ~1600px JPEG para subirla rápido y barato. */
export async function prepareImage(file: File, maxSide = 1800): Promise<string> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error(`No se pudo abrir "${file.name}"`);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

const isCategory = (c: unknown): c is ExpenseCategory => typeof c === 'string' && c in CATEGORIES;
const isoDate = (d: unknown) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);

interface Raw {
  concept?: string; store?: string; amount?: number | string; date?: string | null;
  category?: string; kind?: string; is_refund?: boolean; confidence?: number;
  items?: { name?: string; price?: number | string }[];
}

function normalize(raw: Raw, source: number): DetectedExpense | null {
  const amount = Math.abs(Number(String(raw.amount ?? 0).replace(',', '.')));
  const concept = String(raw.concept ?? raw.store ?? '').trim().slice(0, 200);
  if (!amount || !concept) return null;
  return {
    concept,
    amount: Math.round(amount * 100) / 100,
    date: isoDate(raw.date),
    category: isCategory(raw.category) ? raw.category : 'otros',
    kind: raw.kind === 'income' || raw.kind === 'transfer' ? raw.kind : 'expense',
    is_refund: !!raw.is_refund,
    items: (raw.items ?? [])
      .map((i) => ({ name: String(i.name ?? '').trim(), price: Number(i.price) || 0 }))
      .filter((i) => i.name),
    confidence: Math.min(1, Math.max(0, Number(raw.confidence ?? 0.8))),
    source,
  };
}

async function callOne(base64: string, mode: ImportMode): Promise<Raw[]> {
  const { data, error } = await supabase.functions.invoke('extract-expenses', { body: { images: [base64], mode } });
  if (error) {
    // El cuerpo del error de la función trae el motivo (p. ej. falta ANTHROPIC_API_KEY).
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message ?? 'Error al analizar la imagen');
  }
  return (data?.expenses ?? []) as Raw[];
}

export interface ExtractResult { expenses: DetectedExpense[]; failed: { index: number; message: string }[] }

/** Analiza varias imágenes (2 en paralelo) y reporta el progreso. */
export async function extractFromImages(
  files: File[],
  mode: ImportMode,
  onProgress: (done: number, total: number) => void,
): Promise<ExtractResult> {
  const results: DetectedExpense[][] = files.map(() => []);
  const failed: ExtractResult['failed'] = [];
  let done = 0;
  let next = 0;

  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      try {
        const b64 = await prepareImage(files[i]);
        const raws = await callOne(b64, mode);
        results[i] = raws.map((r) => normalize(r, i)).filter((x): x is DetectedExpense => !!x);
      } catch (e) {
        failed.push({ index: i, message: e instanceof Error ? e.message : 'Error' });
      }
      onProgress(++done, files.length);
    }
  };
  await Promise.all([worker(), worker()]);
  return { expenses: results.flat(), failed };
}
