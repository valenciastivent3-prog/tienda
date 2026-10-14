-- =====================================================================
-- PASO 2: productos y ajustes en la base de datos + puntos + ruleta.
-- Ejecútalo DESPUÉS de schema.sql (en Supabase > SQL Editor > Run). Es seguro ejecutarlo varias veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Productos y ajustes. Cualquiera puede LEER (es lo que ve la tienda); solo el administrador puede escribir.
--    Un producto oculto (activo = false) solo lo ve el administrador.
-- ---------------------------------------------------------------------
create table if not exists public.productos (
  id     text primary key check (id ~ '^[A-Za-z0-9_-]{1,40}$'),
  datos  jsonb not null check (jsonb_typeof(datos) = 'object' and octet_length(datos::text) < 1500000),
  activo boolean not null default true,
  creado timestamptz not null default now()
);
create table if not exists public.ajustes (
  clave text primary key check (clave in ('config','puntos','ruleta')),
  valor jsonb not null check (octet_length(valor::text) < 1500000)
);
alter table public.productos enable row level security;
alter table public.ajustes   enable row level security;
revoke all on public.productos, public.ajustes from anon, authenticated;
grant select on public.productos, public.ajustes to anon, authenticated;
grant insert, update, delete on public.productos, public.ajustes to authenticated;

drop policy if exists "ver productos activos" on public.productos;
drop policy if exists "admin productos"       on public.productos;
drop policy if exists "ver ajustes"           on public.ajustes;
drop policy if exists "admin ajustes"         on public.ajustes;
create policy "ver productos activos" on public.productos for select to anon, authenticated using (activo);
create policy "admin productos"       on public.productos for all    to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "ver ajustes"           on public.ajustes   for select to anon, authenticated using (true);
create policy "admin ajustes"         on public.ajustes   for all    to authenticated using (public.es_admin()) with check (public.es_admin());

-- Valores iniciales de puntos y ruleta (no pisa lo que ya tengas).
insert into public.ajustes (clave, valor) values
 ('puntos', '{"cada": 2000, "objetivo": 50}'),
 ('ruleta', '[{"nombre":"5% de descuento","tipo":"pct","valor":5,"peso":30},{"nombre":"10% de descuento","tipo":"pct","valor":10,"peso":15},{"nombre":"+20 puntos","tipo":"puntos","valor":20,"peso":25},{"nombre":"Sigue intentando","tipo":"nada","valor":0,"peso":20},{"nombre":"$5.000 de descuento","tipo":"fijo","valor":5000,"peso":8},{"nombre":"20% de descuento","tipo":"pct","valor":20,"peso":2}]')
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------
-- 2) Tablas de puntos. Ninguna se puede leer ni escribir desde la web con la llave pública:
--    solo el administrador las lee, y solo las funciones de abajo (security definer) las modifican.
-- ---------------------------------------------------------------------
create table if not exists public.puntos (
  tel          text primary key,
  puntos       int  not null default 0 check (puntos >= 0),
  total_ganado int  not null default 0,
  actualizado  timestamptz not null default now()
);
create table if not exists public.puntos_mov (          -- un pedido suma puntos una sola vez
  pedido_id text primary key,
  tel       text not null,
  puntos    int  not null,
  creado    timestamptz not null default now()
);
create table if not exists public.premios (             -- cupones ganados en la ruleta (un solo uso)
  codigo text primary key,
  tel    text not null,
  nombre text not null,
  tipo   text not null check (tipo in ('pct','fijo')),
  valor  int  not null check (valor > 0),
  usado  boolean not null default false,
  creado timestamptz not null default now(),
  vence  timestamptz not null default now() + interval '60 days'
);
create table if not exists public.giros (
  id     bigserial primary key,
  tel    text not null,
  premio text not null,
  creado timestamptz not null default now()
);
create table if not exists public.intentos (            -- consultas fallidas (frena a quien adivina códigos)
  id     bigserial primary key,
  ip     text,
  creado timestamptz not null default now()
);
create index if not exists intentos_ip_idx  on public.intentos (ip, creado);
create index if not exists premios_tel_idx  on public.premios (tel);

alter table public.puntos     enable row level security;
alter table public.puntos_mov enable row level security;
alter table public.premios    enable row level security;
alter table public.giros      enable row level security;
alter table public.intentos   enable row level security;
revoke all on public.puntos, public.puntos_mov, public.premios, public.giros, public.intentos from anon, authenticated;
grant select on public.puntos, public.puntos_mov, public.premios, public.giros to authenticated;

drop policy if exists "admin lee puntos"  on public.puntos;
drop policy if exists "admin lee mov"     on public.puntos_mov;
drop policy if exists "admin lee premios" on public.premios;
drop policy if exists "admin lee giros"   on public.giros;
create policy "admin lee puntos"  on public.puntos     for select to authenticated using (public.es_admin());
create policy "admin lee mov"     on public.puntos_mov for select to authenticated using (public.es_admin());
create policy "admin lee premios" on public.premios    for select to authenticated using (public.es_admin());
create policy "admin lee giros"   on public.giros      for select to authenticated using (public.es_admin());

-- ---------------------------------------------------------------------
-- 3) Funciones de apoyo
-- ---------------------------------------------------------------------
create or replace function public.tel_norm(t text) returns text
language sql immutable set search_path = public as $$
  select right(regexp_replace(coalesce(t, ''), '\D', '', 'g'), 10)
$$;

create or replace function public.ip_actual() returns text
language plpgsql stable set search_path = public as $$
declare v_hdr json;
begin
  begin
    v_hdr := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  return left(nullif(trim(coalesce(v_hdr ->> 'cf-connecting-ip', v_hdr ->> 'x-real-ip',
              regexp_replace(coalesce(v_hdr ->> 'x-forwarded-for', ''), '^.*,', ''))), ''), 64);
end $$;

-- ¿Demasiados intentos fallidos desde esta conexión? (15 cada 10 minutos)
create or replace function public.bloqueado() returns boolean
language plpgsql security definer set search_path = public as $$
declare v_ip text := public.ip_actual();
begin
  if v_ip is null then return false; end if;
  return (select count(*) from public.intentos where ip = v_ip and creado > now() - interval '10 minutes') >= 15;
end $$;

create or replace function public.fallo(p_msg text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ip text := public.ip_actual();
begin
  -- Se devuelve un JSON (no se lanza error) para que el intento quede registrado.
  if v_ip is not null then
    insert into public.intentos (ip) values (v_ip);
    delete from public.intentos where creado < now() - interval '1 day';
  end if;
  return jsonb_build_object('error', p_msg);
end $$;

-- ---------------------------------------------------------------------
-- 4) Al cambiar el estado de un pedido (solo el administrador puede):
--    - Pagado/Entregado por primera vez -> suma puntos (una sola vez por pedido).
--    - Cancelado después de pagado       -> resta esos puntos.
--    - Si el pedido usó un cupón de la ruleta y se confirma el pago -> el cupón queda usado.
-- ---------------------------------------------------------------------
create or replace function public.pedidos_puntos() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; v_cada numeric; v_pts int; v_tel text := public.tel_norm(new.datos ->> 'tel'); v_mov record;
begin
  if new.estado in ('Pagado','Entregado') and old.estado not in ('Pagado','Entregado') then
    select valor into v_cfg from public.ajustes where clave = 'puntos';
    v_cada := coalesce((v_cfg ->> 'cada')::numeric, 0);
    if v_cada > 0 and length(v_tel) >= 7 then
      v_pts := floor((new.datos ->> 'total')::numeric / v_cada);
      if v_pts > 0 then
        insert into public.puntos_mov (pedido_id, tel, puntos) values (new.id, v_tel, v_pts) on conflict do nothing;
        if found then
          insert into public.puntos (tel, puntos, total_ganado) values (v_tel, v_pts, v_pts)
          on conflict (tel) do update set puntos = public.puntos.puntos + excluded.puntos,
            total_ganado = public.puntos.total_ganado + excluded.total_ganado, actualizado = now();
        end if;
      end if;
    end if;
    if old.estado = 'Pendiente' and coalesce(new.datos ->> 'cupon', '') <> '' then
      update public.premios set usado = true where codigo = upper(new.datos ->> 'cupon');
    end if;
  end if;

  if new.estado = 'Cancelado' and old.estado in ('Pagado','Entregado') then
    delete from public.puntos_mov where pedido_id = new.id returning tel, puntos into v_mov;
    if found then
      update public.puntos set puntos = greatest(0, puntos - v_mov.puntos), actualizado = now() where tel = v_mov.tel;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.pedidos_puntos() from public;

drop trigger if exists pedidos_puntos on public.pedidos;
create trigger pedidos_puntos after update of estado on public.pedidos
  for each row when (old.estado is distinct from new.estado) execute function public.pedidos_puntos();

-- ---------------------------------------------------------------------
-- 5) Funciones que llama la tienda. El cliente se identifica con su celular + el número de uno de sus pedidos
--    (los últimos 6 caracteres que ve al comprar). Los premios los sortea AQUÍ, con random() del servidor.
-- ---------------------------------------------------------------------
create or replace function public.pedido_es_de(p_tel text, p_pedido text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pedidos
                  where public.tel_norm(datos ->> 'tel') = public.tel_norm(p_tel)
                    and right(upper(id), 6) = right(upper(trim(p_pedido)), 6)
                    and estado <> 'Cancelado')
$$;

create or replace function public.mi_cuenta(p_tel text, p_pedido text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_tel text := public.tel_norm(p_tel); v_p int; v_prem jsonb;
begin
  if public.bloqueado() then return jsonb_build_object('error', 'Demasiados intentos. Espera unos minutos.'); end if;
  if length(v_tel) < 7 or length(coalesce(p_pedido, '')) < 4 or not public.pedido_es_de(p_tel, p_pedido) then
    return public.fallo('No encontramos un pedido con ese celular y ese número.');
  end if;
  select puntos into v_p from public.puntos where tel = v_tel;
  select coalesce(jsonb_agg(jsonb_build_object('codigo', codigo, 'nombre', nombre, 'tipo', tipo, 'valor', valor) order by creado desc), '[]'::jsonb)
    into v_prem from public.premios where tel = v_tel and not usado and vence > now();
  return jsonb_build_object('puntos', coalesce(v_p, 0), 'premios', v_prem);
end $$;

create or replace function public.girar_ruleta(p_tel text, p_pedido text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tel text := public.tel_norm(p_tel); v_cfg jsonb; v_rul jsonb; v_obj int; v_n int; v_tot numeric; v_r numeric;
  v_acc numeric := 0; v_idx int := -1; v_i int; v_el jsonb; v_pe numeric; v_tipo text; v_val int; v_nom text; v_cod text := null;
begin
  if public.bloqueado() then return jsonb_build_object('error', 'Demasiados intentos. Espera unos minutos.'); end if;
  if length(v_tel) < 7 or not public.pedido_es_de(p_tel, p_pedido) then
    return public.fallo('No encontramos un pedido con ese celular y ese número.');
  end if;
  select valor into v_cfg from public.ajustes where clave = 'puntos';
  select valor into v_rul from public.ajustes where clave = 'ruleta';
  v_obj := coalesce((v_cfg ->> 'objetivo')::int, 0);
  if v_obj <= 0 or jsonb_typeof(v_rul) is distinct from 'array' or jsonb_array_length(v_rul) < 2 then
    return jsonb_build_object('error', 'La ruleta no está disponible.');
  end if;

  select puntos into v_n from public.puntos where tel = v_tel for update;   -- bloquea la fila: dos giros a la vez no pasan
  if coalesce(v_n, 0) < v_obj then
    return jsonb_build_object('error', 'Aún no tienes los puntos necesarios.');
  end if;

  select sum(greatest(coalesce((e ->> 'peso')::numeric, 0), 0)) into v_tot from jsonb_array_elements(v_rul) e;
  if coalesce(v_tot, 0) <= 0 then return jsonb_build_object('error', 'La ruleta no está disponible.'); end if;
  v_r := random() * v_tot;
  v_i := 0;
  for v_el in select e from jsonb_array_elements(v_rul) e loop
    v_pe := greatest(coalesce((v_el ->> 'peso')::numeric, 0), 0);
    v_acc := v_acc + v_pe;
    if v_idx < 0 and v_pe > 0 and v_r < v_acc then v_idx := v_i; end if;
    v_i := v_i + 1;
  end loop;
  if v_idx < 0 then v_idx := v_i - 1; end if;

  v_el   := v_rul -> v_idx;
  v_tipo := coalesce(v_el ->> 'tipo', 'nada');
  v_val  := greatest(coalesce((v_el ->> 'valor')::int, 0), 0);
  v_nom  := left(coalesce(v_el ->> 'nombre', 'Premio'), 30);
  if v_tipo = 'pct' then v_val := least(v_val, 100); end if;

  update public.puntos set puntos = puntos - v_obj, actualizado = now() where tel = v_tel;
  if v_tipo in ('pct','fijo') and v_val > 0 then
    v_cod := 'R' || upper(substr(md5(random()::text || clock_timestamp()::text || v_tel), 1, 8));
    insert into public.premios (codigo, tel, nombre, tipo, valor) values (v_cod, v_tel, v_nom, v_tipo, v_val);
  elsif v_tipo = 'puntos' and v_val > 0 then
    update public.puntos set puntos = puntos + v_val, total_ganado = total_ganado + v_val where tel = v_tel;
  else
    v_tipo := 'nada';
  end if;
  insert into public.giros (tel, premio) values (v_tel, v_nom);

  select puntos into v_n from public.puntos where tel = v_tel;
  return jsonb_build_object('indice', v_idx, 'nombre', v_nom, 'tipo', v_tipo, 'valor', v_val, 'codigo', v_cod, 'puntos', v_n);
end $$;

-- Valida un cupón ganado en la ruleta (un solo uso). Devuelve null si no existe, ya se usó o venció.
create or replace function public.validar_premio(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if public.bloqueado() then return null; end if;
  select tipo, valor into v from public.premios where codigo = upper(trim(p_codigo)) and not usado and vence > now();
  if not found then perform public.fallo('x'); return null; end if;
  return jsonb_build_object('tipo', v.tipo, 'valor', v.valor);
end $$;

revoke all on function public.mi_cuenta(text, text), public.girar_ruleta(text, text), public.validar_premio(text),
  public.pedido_es_de(text, text), public.bloqueado(), public.fallo(text), public.ip_actual() from public;
grant execute on function public.mi_cuenta(text, text), public.girar_ruleta(text, text), public.validar_premio(text) to anon, authenticated;
grant execute on function public.tel_norm(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- Para comprobar (opcional): debe mostrar rowsecurity = true en las 7 tablas.
-- select relname, relrowsecurity from pg_class where relname in ('productos','ajustes','puntos','puntos_mov','premios','giros','intentos');
