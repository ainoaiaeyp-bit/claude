// Genera los gastos recurrentes del día. Programar con pg_cron o un cron del VPS
// (ver README). Usa la service role: no hace falta sesión de usuario, pero exige
// la cabecera x-cron-secret igual al secreto CRON_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const { data: list, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('day_of_month', today.getDate())
    .eq('is_active', true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const out = { processed: 0, skipped: 0, errors: 0 };
  for (const r of list ?? []) {
    if (r.last_generated_at && new Date(r.last_generated_at) >= startOfMonth) { out.skipped++; continue; }
    const { error: e1 } = await supabase.from('expenses').insert({
      group_id: r.group_id, concept: r.concept, observations: r.observations, category: r.category,
      custom_category_id: r.custom_category_id, amount: r.amount, paid_by: r.paid_by,
      split_type: r.split_type, split_with: r.split_with, expense_date: today.toISOString().slice(0, 10),
    });
    if (e1) { console.error(e1); out.errors++; continue; }
    await supabase.from('recurring_expenses').update({ last_generated_at: new Date().toISOString() }).eq('id', r.id);
    out.processed++;
  }
  return new Response(JSON.stringify({ success: true, ...out }), { headers: { 'Content-Type': 'application/json' } });
});
