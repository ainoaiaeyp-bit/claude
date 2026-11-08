import type { ExpenseCategory, SplitType } from './types';
import { Utensils, Home, Zap, Car, Clapperboard, HeartPulse, Tag } from 'lucide-react';

export const CATEGORIES: Record<ExpenseCategory, { label: string; color: string; icon: typeof Tag }> = {
  alimentacion: { label: 'Alimentación', color: '#34c759', icon: Utensils },
  hogar: { label: 'Hogar', color: '#ff9f0a', icon: Home },
  servicios: { label: 'Servicios', color: '#0a84ff', icon: Zap },
  transporte: { label: 'Transporte', color: '#bf5af2', icon: Car },
  ocio: { label: 'Ocio', color: '#ff375f', icon: Clapperboard },
  salud: { label: 'Salud', color: '#ff453a', icon: HeartPulse },
  otros: { label: 'Otros', color: '#8e8e93', icon: Tag },
};

export const SPLIT_LABELS: Record<SplitType, string> = {
  split_equal: 'A partes iguales',
  payer_full: 'Lo pago yo completo',
  other_full: 'Lo paga la otra persona',
  custom: 'Personalizada',
};
