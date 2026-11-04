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

-- ============ Mis plantillas ============
create table if not exists public.user_templates (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  width      int  not null,
  height     int  not null,
  data       jsonb not null,
  thumb      text,
  created_at timestamptz not null default now()
);
create index if not exists user_templates_owner_idx on public.user_templates (owner, created_at desc);
alter table public.user_templates enable row level security;

drop policy if exists "user_templates_owner_all" on public.user_templates;
create policy "user_templates_owner_all" on public.user_templates
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- ============ Notificaciones y menciones ============
-- Las crean únicamente triggers de la base de datos (el navegador no puede insertar ni falsificar avisos).
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in ('shared','comment','reply','mention')),
  design_id    uuid references public.designs(id) on delete cascade,
  design_name  text,
  comment_id   uuid references public.design_comments(id) on delete cascade,
  from_email   text,
  body         text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Solo se puede cambiar el campo "read"; nadie puede insertar desde el navegador.
revoke insert, update on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;

-- Personas con acceso a un diseño (para sugerir menciones con @).
create or replace function public.design_participants(p_design uuid)
returns table (user_id uuid, email text, role text)
language sql stable security definer set search_path = public, auth as $$
  select d.owner, u.email::text, 'owner'::text
    from public.designs d join auth.users u on u.id = d.owner
   where d.id = p_design and public.design_role(p_design) is not null
  union all
  select m.user_id, m.email, m.role
    from public.design_members m
   where m.design_id = p_design and public.design_role(p_design) is not null
$$;
grant execute on function public.design_participants(uuid) to authenticated;

-- Aviso al compartir un diseño con alguien.
create or replace function public.notify_member_added()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare v_from text; v_name text;
begin
  select email into v_from from auth.users where id = auth.uid();
  select name into v_name from public.designs where id = new.design_id;
  if new.user_id is distinct from auth.uid() then
    insert into public.notifications (user_id, type, design_id, design_name, from_email, body)
    values (new.user_id, 'shared', new.design_id, v_name, v_from,
            case new.role when 'editor' then 'Puedes editar' else 'Solo ver y comentar' end);
  end if;
  return new;
end $$;
drop trigger if exists design_members_notify on public.design_members;
create trigger design_members_notify after insert on public.design_members
  for each row execute function public.notify_member_added();

-- Aviso por comentarios nuevos, respuestas y menciones (@usuario = parte del correo antes de la @).
create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare v_name text; v_snip text; v_from text; r record; v_handles text[]; v_type text;
begin
  select name into v_name from public.designs where id = new.design_id;
  v_snip := left(new.body, 140);
  v_from := coalesce(new.author_email, (select email from auth.users where id = new.author));
  select coalesce(array_agg(lower(m[1])), '{}') into v_handles
    from regexp_matches(new.body, '@([A-Za-z0-9._-]+)', 'g') as m;
  for r in
    select p.user_id, p.email from (
      select d.owner as user_id, u.email::text as email
        from public.designs d join auth.users u on u.id = d.owner where d.id = new.design_id
      union
      select m.user_id, m.email from public.design_members m where m.design_id = new.design_id
    ) p
    where p.user_id <> new.author
  loop
    v_type := null;
    if lower(split_part(r.email, '@', 1)) = any (v_handles) then
      v_type := 'mention';
    elsif new.parent is null then
      v_type := 'comment';
    elsif exists (select 1 from public.design_comments c
                   where (c.id = new.parent or c.parent = new.parent) and c.author = r.user_id) then
      v_type := 'reply';
    end if;
    if v_type is not null then
      insert into public.notifications (user_id, type, design_id, design_name, comment_id, from_email, body)
      values (r.user_id, v_type, new.design_id, v_name, new.id, v_from, v_snip);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists design_comments_notify on public.design_comments;
create trigger design_comments_notify after insert on public.design_comments
  for each row execute function public.notify_comment();
