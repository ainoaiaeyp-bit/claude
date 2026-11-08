-- Mejoras propias de SplitIA sobre el esquema heredado de "Gastos hogar".

-- 1) Adjuntos: la política heredada comparaba con SPLIT_PART(file_url,'expense-attachments/',2),
--    pero la app guarda la ruta sin prefijo, así que nadie podía ver los adjuntos.
DROP POLICY IF EXISTS "Members can view attachments" ON storage.objects;
CREATE POLICY "Members can view attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'expense-attachments'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.expense_attachments ea
    JOIN public.expenses e ON e.id = ea.expense_id
    WHERE (storage.objects.name = ea.file_url
           OR storage.objects.name = SPLIT_PART(ea.file_url, 'expense-attachments/', 2))
      AND public.is_group_member(e.group_id)
  )
);

-- 2) Comentarios en cada gasto (como en Splitwise).
CREATE TABLE IF NOT EXISTS public.expense_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 1000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_comments_expense ON public.expense_comments(expense_id);
ALTER TABLE public.expense_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense comments" ON public.expense_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.is_group_member(e.group_id)));
CREATE POLICY "Members can add expense comments" ON public.expense_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.is_group_member(e.group_id)));
CREATE POLICY "Authors can delete own comments" ON public.expense_comments FOR DELETE USING (auth.uid() = user_id);

-- 3) Índices para listados rápidos.
CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON public.expenses(group_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_adjustments_group ON public.balance_adjustments(group_id);
CREATE INDEX IF NOT EXISTS idx_splits_expense ON public.expense_splits(expense_id);
