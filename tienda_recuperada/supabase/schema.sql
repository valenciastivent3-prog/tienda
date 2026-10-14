-- =====================================================================
-- PEDIDOS EN LÍNEA — pega este archivo completo en Supabase > SQL Editor > Run.
--
-- ANTES de ejecutarlo: cambia TU_CORREO@ejemplo.com por el correo con el que entras al panel
-- (es el ÚNICO lugar donde va tu correo; solo aparece una vez, en el paso 1).
--
-- Es seguro ejecutarlo varias veces y también sobre la versión anterior de este archivo:
-- no borra tus pedidos, solo actualiza las reglas.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Quién es administrador. Esta tabla NO se puede leer desde la web (RLS sin políticas).
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

insert into public.admins (email) values (lower('TU_CORREO@ejemplo.com'))
on conflict (email) do nothing;

-- Si olvidaste cambiar el correo, se detiene aquí y no queda nada a medias.
do $$
begin
  if exists (select 1 from public.admins where email like 'tu\_correo@ejemplo.com') then
    raise exception 'Cambia TU_CORREO@ejemplo.com por tu correo real y vuelve a ejecutar.';
  end if;
end $$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;


-- ---------------------------------------------------------------------
-- 2) Tabla de pedidos
-- ---------------------------------------------------------------------
create table if not exists public.pedidos (
  id      text primary key,
  creado  timestamptz not null default now(),
  estado  text not null default 'Pendiente',
  datos   jsonb not null
);
-- Dirección desde la que llegó el pedido (solo para frenar el spam; el cliente no la ve ni la manda).
alter table public.pedidos add column if not exists ip text;

create index if not exists pedidos_creado_idx on public.pedidos (creado desc);
create index if not exists pedidos_ip_creado_idx on public.pedidos (ip, creado);

alter table public.pedidos drop constraint if exists pedidos_estado_ok;
alter table public.pedidos add constraint pedidos_estado_ok
  check (estado in ('Pendiente','Pagado','Entregado','Cancelado')) not valid;


-- ---------------------------------------------------------------------
-- 3) Permisos y reglas de acceso (RLS)
--    Clientes (anon): solo pueden CREAR pedidos. No pueden leer, cambiar ni borrar nada.
--    Administrador: todo, pero solo si su correo está en la tabla admins.
-- ---------------------------------------------------------------------
alter table public.pedidos enable row level security;

revoke all on public.pedidos from anon, authenticated;
grant insert on public.pedidos to anon;
grant select, insert, update, delete on public.pedidos to authenticated;

drop policy if exists "clientes crean pedidos" on public.pedidos;
drop policy if exists "admin crea pedidos"     on public.pedidos;
drop policy if exists "admin lee"              on public.pedidos;
drop policy if exists "admin actualiza"        on public.pedidos;
drop policy if exists "admin elimina"          on public.pedidos;

create policy "clientes crean pedidos" on public.pedidos
  for insert to anon
  with check (estado = 'Pendiente');

create policy "admin crea pedidos" on public.pedidos
  for insert to authenticated
  with check (public.es_admin());

create policy "admin lee" on public.pedidos
  for select to authenticated
  using (public.es_admin());

create policy "admin actualiza" on public.pedidos
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "admin elimina" on public.pedidos
  for delete to authenticated
  using (public.es_admin());


-- ---------------------------------------------------------------------
-- 4) Validación al CREAR un pedido (cualquiera puede mandar datos a la API, así que la base de datos
--    no confía en lo que diga la página).
--    - Rechaza pedidos mal formados o demasiado grandes.
--    - Si lo manda un cliente: lo fuerza a "Pendiente", le pone la fecha del servidor y le quita cualquier
--      marca interna ("desc"), para que nadie pueda fabricar un pedido que aparezca ya como pagado.
--    - Si lo manda un cliente: máximo 8 pedidos cada 10 minutos desde la misma conexión.
-- ---------------------------------------------------------------------
create or replace function public.pedidos_antes_insertar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_rol  text := coalesce(auth.role(), 'servicio');
  v_comp text;
  v_hdr  json;
  v_ip   text;
  v_n    int;
begin
  if new.id !~ '^[a-z0-9]{8,40}$' then
    raise exception 'Pedido inválido (identificador).';
  end if;
  if jsonb_typeof(new.datos) is distinct from 'object' then
    raise exception 'Pedido inválido (formato).';
  end if;
  if octet_length(new.datos::text) > 900000 then
    raise exception 'Pedido demasiado grande.';
  end if;
  if char_length(coalesce(new.datos ->> 'nombre', '')) not between 1 and 120 then
    raise exception 'Pedido inválido (nombre).';
  end if;
  -- El celular es obligatorio para los clientes; el administrador puede registrar un pedido sin celular.
  if char_length(coalesce(new.datos ->> 'tel', '')) > 40
     or (v_rol = 'anon' and char_length(coalesce(new.datos ->> 'tel', '')) < 3) then
    raise exception 'Pedido inválido (celular).';
  end if;
  if jsonb_typeof(new.datos -> 'items') is distinct from 'array'
     or jsonb_array_length(new.datos -> 'items') not between 1 and 100 then
    raise exception 'Pedido inválido (productos).';
  end if;
  if coalesce(new.datos ->> 'total', '') !~ '^[0-9]{1,10}(\.[0-9]{1,4})?$' then
    raise exception 'Pedido inválido (total).';
  end if;

  -- El comprobante, si existe, debe ser una imagen en base64 y no pasar de ~700 KB.
  v_comp := coalesce(new.datos ->> 'comprobante', '');
  if v_comp <> '' and (length(v_comp) > 700000
     or v_comp !~ '^data:image/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$') then
    raise exception 'Pedido inválido (comprobante).';
  end if;

  if v_rol = 'anon' then
    new.estado := 'Pendiente';
    new.creado := now();
    new.datos  := (new.datos - 'desc') || jsonb_build_object('estado', 'Pendiente', 'id', new.id);

    -- Mejor esfuerzo: identifica la conexión (Cloudflare la manda en cf-connecting-ip). Si no hay dato, no limita.
    begin
      v_hdr := nullif(current_setting('request.headers', true), '')::json;
    exception when others then
      v_hdr := null;
    end;
    v_ip := nullif(trim(coalesce(
              v_hdr ->> 'cf-connecting-ip',
              v_hdr ->> 'x-real-ip',
              regexp_replace(coalesce(v_hdr ->> 'x-forwarded-for', ''), '^.*,', ''))), '');
    new.ip := left(v_ip, 64);

    if new.ip is not null then
      select count(*) into v_n
        from public.pedidos
       where ip = new.ip and creado > now() - interval '10 minutes';
      if v_n >= 8 then
        raise exception 'Demasiados pedidos seguidos. Intenta de nuevo en unos minutos.';
      end if;
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.pedidos_antes_insertar() from public;

drop trigger if exists pedidos_antes_insertar on public.pedidos;
create trigger pedidos_antes_insertar
  before insert on public.pedidos
  for each row execute function public.pedidos_antes_insertar();


-- Al actualizar (solo el administrador puede): mantiene "estado" y el "estado" guardado dentro de "datos" iguales.
create or replace function public.pedidos_antes_actualizar()
returns trigger
language plpgsql
as $$
begin
  new.id := old.id;
  new.creado := old.creado;
  new.ip := old.ip;
  new.datos := new.datos || jsonb_build_object('estado', new.estado, 'id', new.id);
  return new;
end;
$$;

drop trigger if exists pedidos_antes_actualizar on public.pedidos;
create trigger pedidos_antes_actualizar
  before update on public.pedidos
  for each row execute function public.pedidos_antes_actualizar();


-- ---------------------------------------------------------------------
-- 5) Para comprobar que quedó bien (opcional): ejecuta esto en el SQL Editor.
--    Debe mostrar rowsecurity = true y 5 políticas.
-- ---------------------------------------------------------------------
-- select relname, relrowsecurity as rowsecurity from pg_class where relname in ('pedidos','admins');
-- select policyname, cmd, roles from pg_policies where tablename = 'pedidos' order by cmd;
