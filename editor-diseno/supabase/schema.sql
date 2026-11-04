-- Lienzo · esquema de Supabase
-- Pégalo en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo varias veces.

-- ============ Diseños ============
create table if not exists public.designs (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default 'Sin título',
  width       int  not null,
  height      int  not null,
  data        jsonb not null,
  thumb       text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists designs_owner_updated_idx on public.designs (owner, updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists designs_set_updated_at on public.designs;
create trigger designs_set_updated_at
  before update on public.designs
  for each row execute function public.set_updated_at();

alter table public.designs enable row level security;

drop policy if exists "designs_owner_all" on public.designs;
create policy "designs_owner_all" on public.designs
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- Cualquiera (con el enlace) puede LEER los diseños marcados como públicos.
drop policy if exists "designs_public_read" on public.designs;
create policy "designs_public_read" on public.designs
  for select to anon, authenticated
  using (is_public);

-- ============ Historial de versiones ============
create table if not exists public.design_versions (
  id         bigint generated always as identity primary key,
  design_id  uuid not null references public.designs(id) on delete cascade,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists design_versions_design_idx on public.design_versions (design_id, created_at desc);

alter table public.design_versions enable row level security;

drop policy if exists "versions_owner_all" on public.design_versions;
create policy "versions_owner_all" on public.design_versions
  for all to authenticated
  using (exists (select 1 from public.designs d where d.id = design_id and d.owner = auth.uid()))
  with check (exists (select 1 from public.designs d where d.id = design_id and d.owner = auth.uid()));
