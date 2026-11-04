\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

-- ---------- utilidades ----------
drop schema if exists test cascade;
create schema test;
create table test.results (n serial, name text, ok boolean);
grant usage on schema test to public;
grant all on test.results to public;
grant usage, select on sequence test.results_n_seq to public;

create function test.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), false);
  reset role;
  if u is null then set role anon; else set role authenticated; end if;
end $$;
grant execute on function test.as_user(uuid) to public;

create function test.chk(p_name text, p_ok boolean) returns void language plpgsql as $$
begin insert into test.results(name, ok) values (p_name, coalesce(p_ok, false)); end $$;
grant execute on function test.chk(text, boolean) to public;

-- ---------- datos base (como superusuario) ----------
truncate auth.users cascade;
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'ana@test.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'bea@test.com'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'carlos@test.com'),
  ('99999999-9999-4999-8999-999999999999', 'zoe@test.com');
insert into public.designs (id, owner, name, width, height, data, is_public)
values ('dddddddd-dddd-4ddd-8ddd-ddddddddddd9', '99999999-9999-4999-8999-999999999999', 'Público de Zoe', 10, 10, '{}', true);

-- 1) la dueña crea un diseño
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
insert into public.designs (id, name, width, height, data) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1', 'Cartel', 1080, 1080, '{"v":1}');
select test.chk('dueña: owner se rellena con auth.uid()', (select owner from public.designs where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1')='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select test.chk('dueña ve su diseño y el público ajeno (como en la app: se filtra por owner=eq.)', (select count(*) from public.designs)=2);
select test.chk('filtrando por owner solo ve el suyo', (select count(*) from public.designs where owner=auth.uid())=1);

-- 2) anónimo y extraña
select test.as_user(null);
select test.chk('anónimo ve solo diseños públicos', (select count(*) from public.designs)=1 and (select name from public.designs)='Público de Zoe');
do $$ begin
  begin insert into public.designs (owner,name,width,height,data) values ('99999999-9999-4999-8999-999999999999','x',1,1,'{}'); perform test.chk('anónimo NO puede insertar diseños', false);
  exception when others then perform test.chk('anónimo NO puede insertar diseños', true); end;
end $$;
select test.as_user('99999999-9999-4999-8999-999999999999');
select test.chk('extraña no ve el diseño privado de Ana', (select count(*) from public.designs where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1')=0);

-- 3) compartir (solo la dueña)
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','Bea@Test.com','editor');
select public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','carlos@test.com','viewer');
select test.chk('compartir crea 2 miembros', (select count(*) from public.design_members)=2);
do $$ begin begin perform public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','nadie@test.com','editor'); perform test.chk('correo inexistente → error',false);
  exception when others then perform test.chk('correo inexistente → error', sqlerrm like 'No existe ninguna cuenta%'); end; end $$;
do $$ begin begin perform public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','ana@test.com','editor'); perform test.chk('invitarse a sí misma → error',false);
  exception when others then perform test.chk('invitarse a sí misma → error', sqlerrm like '%es el tuyo'); end; end $$;
do $$ begin begin perform public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','bea@test.com','admin'); perform test.chk('rol inválido → error',false);
  exception when others then perform test.chk('rol inválido → error', sqlerrm='Permiso no válido'); end; end $$;
select public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','bea@test.com','viewer');
select test.chk('volver a invitar cambia el rol (upsert)', (select role from public.design_members where email='bea@test.com')='viewer');
select public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','bea@test.com','editor');
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
do $$ begin begin perform public.share_design('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','zoe@test.com','editor'); perform test.chk('un editor NO puede compartir',false);
  exception when others then perform test.chk('un editor NO puede compartir', sqlerrm like 'Solo el propietario%'); end; end $$;

-- 4) roles
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
select test.chk('design_role dueña=owner', public.design_role('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1')='owner');
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
select test.chk('design_role Bea=editor', public.design_role('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1')='editor');
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
select test.chk('design_role Carlos=viewer', public.design_role('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1')='viewer');
select test.as_user('99999999-9999-4999-8999-999999999999');
select test.chk('design_role extraña=null', public.design_role('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1') is null);

-- 5) el editor modifica, pero no puede tocar propietario/visibilidad/carpeta/etiquetas
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
select test.chk('editor ve el diseño', (select count(*) from public.designs where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1')=1);
with u as (update public.designs set name='Editado por Bea', data='{"v":2}', is_public=true, owner='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', folder='hack', tags='{x}' where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1' returning 1)
select test.chk('editor puede actualizar (1 fila)', (select count(*) from u)=1);
reset role;
select test.chk('…el nombre y los datos sí cambian', (select name='Editado por Bea' and data='{"v":2}'::jsonb from public.designs where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'));
select test.chk('…pero owner, is_public, folder y tags NO', (select owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and is_public=false and folder is null and tags='{}' from public.designs where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'));
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
with d as (delete from public.designs where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1' returning 1) select test.chk('editor NO puede borrar el diseño', (select count(*) from d)=0);

-- 6) el lector solo lee
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
select test.chk('lector ve el diseño', (select count(*) from public.designs where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1')=1);
with u as (update public.designs set name='Hackeado' where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1' returning 1) select test.chk('lector NO puede modificar', (select count(*) from u)=0);
-- extraña
select test.as_user('99999999-9999-4999-8999-999999999999');
with u as (update public.designs set name='Hackeado' where id='d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1' returning 1) select test.chk('extraña NO puede modificar', (select count(*) from u)=0);

-- 7) visibilidad de la tabla de miembros
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'); select test.chk('dueña ve a los 2 miembros', (select count(*) from public.design_members)=2);
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'); select test.chk('Bea solo ve su fila', (select count(*) from public.design_members)=1);
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3'); select test.chk('Carlos solo ve su fila', (select count(*) from public.design_members)=1);
select test.as_user('99999999-9999-4999-8999-999999999999'); select test.chk('extraña no ve miembros', (select count(*) from public.design_members)=0);
do $$ begin begin insert into public.design_members(design_id,user_id,email,role) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','99999999-9999-4999-8999-999999999999','zoe@test.com','editor'); perform test.chk('extraña NO puede auto-añadirse',false);
  exception when others then perform test.chk('extraña NO puede auto-añadirse', true); end; end $$;
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
with u as (update public.design_members set role='editor' where user_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3' returning 1) select test.chk('lector NO puede subirse el rol', (select count(*) from u)=0);

-- 8) versiones
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
insert into public.design_versions(design_id,data) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','{"v":"editor"}');
select test.chk('editor puede crear versiones', (select count(*) from public.design_versions)=1);
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
select test.chk('lector puede VER versiones', (select count(*) from public.design_versions)=1);
do $$ begin begin insert into public.design_versions(design_id,data) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','{}'); perform test.chk('lector NO puede crear versiones',false);
  exception when others then perform test.chk('lector NO puede crear versiones', true); end; end $$;
select test.as_user('99999999-9999-4999-8999-999999999999');
select test.chk('extraña no ve versiones', (select count(*) from public.design_versions)=0);

-- 9) comentarios y notificaciones
reset role;
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
insert into public.design_comments (design_id, page, x, y, body, author_email) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1',0,10,20,'Primer comentario del lector','carlos@test.com');
select test.chk('lector puede comentar', (select count(*) from public.design_comments)=1);
do $$ begin begin insert into public.design_comments (design_id, body, author) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','suplantación','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'); perform test.chk('NO se puede comentar suplantando a otro',false);
  exception when others then perform test.chk('NO se puede comentar suplantando a otro', true); end; end $$;
do $$ begin begin insert into public.design_comments (design_id, body) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1',''); perform test.chk('comentario vacío rechazado',false);
  exception when others then perform test.chk('comentario vacío rechazado', true); end; end $$;
do $$ begin begin insert into public.design_comments (design_id, body) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1',repeat('x',2001)); perform test.chk('comentario >2000 caracteres rechazado',false);
  exception when others then perform test.chk('comentario >2000 caracteres rechazado', true); end; end $$;
select test.as_user('99999999-9999-4999-8999-999999999999');
do $$ begin begin insert into public.design_comments (design_id, body) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1','colado'); perform test.chk('extraña NO puede comentar',false);
  exception when others then perform test.chk('extraña NO puede comentar', true); end; end $$;
select test.chk('extraña no ve comentarios', (select count(*) from public.design_comments)=0);

reset role;
select test.chk('notif: comentario de Carlos avisa a Ana (comment) y a Bea (comment), no a él', (select count(*) from public.notifications where type='comment' and from_email='carlos@test.com')=2 and (select count(*) from public.notifications where user_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3' and type<>'shared')=0);

-- mención: Bea comenta mencionando a @carlos
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
insert into public.design_comments (design_id, page, x, y, body, author_email) values ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1',0,5,5,'Hola @Carlos, ¿lo revisas?','bea@test.com');
reset role;
select test.chk('notif: @carlos recibe "mention"', (select count(*) from public.notifications where user_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3' and type='mention')=1);
select test.chk('notif: Ana recibe "comment" de ese comentario', (select count(*) from public.notifications where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and type='comment' and from_email='bea@test.com')=1);
select test.chk('notif: la autora (Bea) no se avisa a sí misma', (select count(*) from public.notifications where user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' and from_email='bea@test.com')=0);

-- respuesta de Ana al comentario de Carlos → "reply" solo para Carlos (autor del hilo)
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
insert into public.design_comments (design_id, parent, page, x, y, body, author_email)
  select 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1', id, page, x, y, 'Hecho, gracias', 'ana@test.com' from public.design_comments where body='Primer comentario del lector';
reset role;
select test.chk('notif: la respuesta avisa al autor del hilo (reply)', (select count(*) from public.notifications where user_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3' and type='reply')=1);
select test.chk('notif: la respuesta NO avisa a Bea (no participa en el hilo)', (select count(*) from public.notifications where user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' and type='reply')=0);

-- permisos de comentarios: resolver / borrar
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
with u as (update public.design_comments set resolved=true where body='Primer comentario del lector' returning 1) select test.chk('editor puede resolver comentarios ajenos', (select count(*) from u)=1);
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
with u as (update public.design_comments set resolved=true where body like 'Hola @Carlos%' returning 1) select test.chk('lector NO puede resolver comentarios ajenos', (select count(*) from u)=0);
with u as (update public.design_comments set body='editado' where body='Primer comentario del lector' returning 1) select test.chk('el autor puede editar su comentario', (select count(*) from u)=1);
with d as (delete from public.design_comments where body like 'Hola @Carlos%' returning 1) select test.chk('lector NO puede borrar comentarios ajenos', (select count(*) from d)=0);
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
with d as (delete from public.design_comments where body like 'Hola @Carlos%' returning 1) select test.chk('la dueña puede borrar comentarios ajenos', (select count(*) from d)=1);

-- 10) notificaciones: privacidad e integridad
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
select test.chk('Carlos solo ve SUS avisos (shared + reply; la mención se borró en cascada con su comentario)', (select count(*) from public.notifications)=2 and (select count(*) from public.notifications where user_id<>auth.uid())=0);
select test.chk('borrar un comentario elimina los avisos asociados', (select count(*) from public.notifications where type='mention')=0);
with u as (update public.notifications set read=true where type='reply' returning 1) select test.chk('puede marcar un aviso como leído', (select count(*) from u)=1);
do $$ begin begin update public.notifications set body='falsificado' where true; perform test.chk('NO puede cambiar el contenido de un aviso',false);
  exception when others then perform test.chk('NO puede cambiar el contenido de un aviso', true); end; end $$;
do $$ begin begin insert into public.notifications(user_id,type,body) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','comment','falso'); perform test.chk('NO puede insertar avisos',false);
  exception when others then perform test.chk('NO puede insertar avisos', true); end; end $$;
select test.as_user('99999999-9999-4999-8999-999999999999');
select test.chk('la extraña no ve avisos de otros', (select count(*) from public.notifications)=0);
reset role;
select test.chk('al compartir, Bea y Carlos recibieron "shared"', (select count(*) from public.notifications where type='shared')=2);

-- 11) participantes (para @menciones)
select test.as_user('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
select test.chk('design_participants devuelve dueña + 2 miembros a un lector', (select count(*) from public.design_participants('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'))=3);
select test.as_user('99999999-9999-4999-8999-999999999999');
select test.chk('design_participants no devuelve nada a una extraña', (select count(*) from public.design_participants('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'))=0);

-- 12) plantillas propias
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
insert into public.user_templates(name,width,height,data) values ('Mi plantilla',1080,1080,'{}');
select test.chk('plantilla: la dueña la ve', (select count(*) from public.user_templates)=1);
do $$ begin begin insert into public.user_templates(owner,name,width,height,data) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','falsa',1,1,'{}'); perform test.chk('plantilla: NO se puede crear a nombre de otro',false);
  exception when others then perform test.chk('plantilla: NO se puede crear a nombre de otro', true); end; end $$;
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
select test.chk('plantilla: otra persona no la ve', (select count(*) from public.user_templates)=0);

-- 13) Storage: cada usuaria solo escribe/lee en su carpeta
select test.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
insert into storage.objects(bucket_id,name) values ('design-images','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/abc.png');
select test.chk('storage: Ana sube a su carpeta', (select count(*) from storage.objects)=1);
do $$ begin begin insert into storage.objects(bucket_id,name) values ('design-images','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/robo.png'); perform test.chk('storage: NO puede subir a la carpeta de otra',false);
  exception when others then perform test.chk('storage: NO puede subir a la carpeta de otra', true); end; end $$;
select test.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
select test.chk('storage: Bea no puede LISTAR las imágenes de Ana', (select count(*) from storage.objects)=0);
with d as (delete from storage.objects where name like 'aaaaaaaa%' returning 1) select test.chk('storage: Bea no puede borrar imágenes de Ana', (select count(*) from d)=0);
select test.as_user(null);
select test.chk('storage: anónimo no lista nada', (select count(*) from storage.objects)=0);
reset role;
select test.chk('storage: bucket público, 10 MB, solo png/jpeg/webp', (select public and file_size_limit=10485760 and allowed_mime_types=array['image/png','image/jpeg','image/webp'] from storage.buckets where id='design-images'));

-- ---------- informe ----------
reset role;
\echo
select case when ok then 'OK     ' else 'FALLO  ' end || name from test.results order by n;
\echo
select format('%s comprobaciones, %s fallidas', count(*), count(*) filter (where not ok)) from test.results;
