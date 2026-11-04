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

-- ============ Imágenes (Storage) ============
-- Las imágenes de los diseños se guardan aquí en vez de dentro del JSON del diseño.
-- El bucket es público para LEER por URL (las URL llevan la carpeta del usuario y un hash: no son adivinables),
-- pero solo cada usuario puede subir, cambiar o borrar dentro de su propia carpeta (<uid>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-images', 'design-images', true, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "design_images_insert_own" on storage.objects;
create policy "design_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'design-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "design_images_update_own" on storage.objects;
create policy "design_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'design-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'design-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- SELECT solo del propio usuario (necesario para "upsert"); así nadie puede LISTAR las imágenes de otros.
drop policy if exists "design_images_select_own" on storage.objects;
create policy "design_images_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'design-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "design_images_delete_own" on storage.objects;
create policy "design_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'design-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ Organización de diseños (carpetas y etiquetas) ============
alter table public.designs add column if not exists folder text;
alter table public.designs add column if not exists tags text[] not null default '{}';
create index if not exists designs_owner_folder_idx on public.designs (owner, folder);

-- ============ Compartir con personas concretas ============
create table if not exists public.design_members (
  design_id  uuid not null references public.designs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('viewer','editor')),
  created_at timestamptz not null default now(),
  primary key (design_id, user_id)
);
create index if not exists design_members_user_idx on public.design_members (user_id);
alter table public.design_members enable row level security;

-- Rol del usuario actual sobre un diseño: 'owner', 'editor', 'viewer' o null.
-- SECURITY DEFINER para evitar recursión entre las políticas de designs y design_members.
create or replace function public.design_role(p_design uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when d.owner = auth.uid() then 'owner'
    else (select m.role from public.design_members m where m.design_id = d.id and m.user_id = auth.uid())
  end
  from public.designs d where d.id = p_design
$$;
grant execute on function public.design_role(uuid) to authenticated;

drop policy if exists "members_owner_all" on public.design_members;
create policy "members_owner_all" on public.design_members
  for all to authenticated
  using (public.design_role(design_id) = 'owner')
  with check (public.design_role(design_id) = 'owner');

drop policy if exists "members_self_select" on public.design_members;
create policy "members_self_select" on public.design_members
  for select to authenticated
  using (user_id = auth.uid());

-- Los miembros ven el diseño; los editores pueden modificarlo.
drop policy if exists "designs_member_select" on public.designs;
create policy "designs_member_select" on public.designs
  for select to authenticated
  using (public.design_role(id) is not null);

drop policy if exists "designs_editor_update" on public.designs;
create policy "designs_editor_update" on public.designs
  for update to authenticated
  using (public.design_role(id) in ('owner','editor'))
  with check (public.design_role(id) in ('owner','editor'));

-- Un editor NO puede cambiar propietario, visibilidad pública, carpeta ni etiquetas.
create or replace function public.designs_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and old.owner <> auth.uid() then
    new.owner := old.owner;
    new.is_public := old.is_public;
    new.folder := old.folder;
    new.tags := old.tags;
  end if;
  return new;
end $$;
drop trigger if exists designs_guard on public.designs;
create trigger designs_guard before update on public.designs
  for each row execute function public.designs_guard();

-- Versiones: los miembros las ven; propietario y editores pueden crearlas.
drop policy if exists "versions_member_select" on public.design_versions;
create policy "versions_member_select" on public.design_versions
  for select to authenticated
  using (public.design_role(design_id) is not null);

drop policy if exists "versions_editor_insert" on public.design_versions;
create policy "versions_editor_insert" on public.design_versions
  for insert to authenticated
  with check (public.design_role(design_id) in ('owner','editor'));

-- Invitar por correo (solo el propietario). La persona debe tener ya una cuenta.
-- Ojo: esto permite a un propietario comprobar si un correo está registrado.
create or replace function public.share_design(p_design uuid, p_email text, p_role text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid;
begin
  if public.design_role(p_design) is distinct from 'owner' then
    raise exception 'Solo el propietario puede compartir este diseño';
  end if;
  if p_role not in ('viewer','editor') then
    raise exception 'Permiso no válido';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'No existe ninguna cuenta con ese correo. Pídele que se registre primero';
  end if;
  if v_uid = auth.uid() then
    raise exception 'Ese correo es el tuyo';
  end if;
  insert into public.design_members (design_id, user_id, email, role)
  values (p_design, v_uid, lower(trim(p_email)), p_role)
  on conflict (design_id, user_id) do update set role = excluded.role;
end $$;
grant execute on function public.share_design(uuid, text, text) to authenticated;

-- ============ Comentarios ============
create table if not exists public.design_comments (
  id           uuid primary key default gen_random_uuid(),
  design_id    uuid not null references public.designs(id) on delete cascade,
  parent       uuid references public.design_comments(id) on delete cascade,
  author       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_email text,
  page         int  not null default 0,
  x            real not null default 0,
  y            real not null default 0,
  body         text not null check (char_length(body) between 1 and 2000),
  resolved     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists design_comments_design_idx on public.design_comments (design_id, created_at);
alter table public.design_comments enable row level security;

drop policy if exists "comments_select" on public.design_comments;
create policy "comments_select" on public.design_comments
  for select to authenticated
  using (public.design_role(design_id) is not null);

drop policy if exists "comments_insert" on public.design_comments;
create policy "comments_insert" on public.design_comments
  for insert to authenticated
  with check (public.design_role(design_id) is not null and author = auth.uid());

drop policy if exists "comments_update" on public.design_comments;
create policy "comments_update" on public.design_comments
  for update to authenticated
  using (author = auth.uid() or public.design_role(design_id) in ('owner','editor'))
  with check (author = auth.uid() or public.design_role(design_id) in ('owner','editor'));

drop policy if exists "comments_delete" on public.design_comments;
create policy "comments_delete" on public.design_comments
  for delete to authenticated
  using (author = auth.uid() or public.design_role(design_id) = 'owner');
