-- =====================================================================
-- PRECHECK (SOLO LECTURA) - ejecútalo en Supabase > SQL Editor ANTES de schema_3_puntos_ff.sql
-- No modifica nada. Pega los resultados para confirmar que es seguro migrar.
-- =====================================================================

-- 1) ¿Hay filas guardadas por celular? schema_3 SE DETIENE si la suma es > 0.
select (select count(*) from public.puntos)      as puntos,
       (select count(*) from public.puntos_mov)  as puntos_mov,
       (select count(*) from public.giros)       as giros,
       (select count(*) from public.intentos)    as intentos;

-- 2) ¿La identidad sigue siendo "tel" (aún no migrado) o ya es "ff_id"?
select table_name, column_name from information_schema.columns
where table_schema='public' and table_name in ('puntos','puntos_mov','giros','intentos')
  and column_name in ('tel','ff_id') order by 1,2;

-- 3) Funciones existentes relacionadas (para saber qué reemplazará el script)
select oid::regprocedure from pg_proc
where pronamespace='public'::regnamespace
  and proname in ('procesar_puntos_pedido','mi_cuenta','girar_ruleta','validar_premio','pedido_es_de','es_admin');

-- 4) Triggers actuales de pedidos (schema_3 agrega 2 y conserva los tuyos)
select tgname, tgenabled from pg_trigger where tgrelid='public.pedidos'::regclass and not tgisinternal order by 1;

-- 5) Políticas RLS actuales de las tablas de puntos (schema_3 las reemplaza)
select tablename, policyname, cmd, roles from pg_policies
where schemaname='public' and tablename in ('puntos','puntos_mov','premios','catalogo_premios','giros','intentos') order by 1,2;

-- 6) Ajustes de puntos (necesita las claves "cada" y "objetivo")
select clave, valor from public.ajustes where clave='puntos';

-- 7) Pedidos por estado (para saber si hay pedidos Pagado/Entregado antiguos sin puntos)
select estado, count(*) from public.pedidos group by 1 order by 2 desc;
