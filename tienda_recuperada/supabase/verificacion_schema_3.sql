-- =====================================================================
-- VERIFICACIÓN DESPUÉS DE EJECUTAR schema_3_puntos_ff.sql
-- Son consultas de SOLO LECTURA (la prueba de permisos usa un rol temporal y termina con ROLLBACK).
-- Ejecuta cada bloque por separado en Supabase > SQL Editor y compara con lo esperado.
-- =====================================================================

-- 1) RLS activado en todas las tablas  -> todas deben decir true
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('puntos','puntos_mov','premios','catalogo_premios','giros','intentos','cupones_ruleta','canjes','pedidos')
order by relname;

-- 2) Funciones creadas -> deben aparecer las 20
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('ff_norm','pedido_ff','pin_error','mover_puntos','puntos_de_pedido','aplicar_puntos_pedido',
                  'pedidos_puntos_trg','pedidos_proteger_datos','procesar_puntos_pedido','ruleta_publica','consultar_puntos',
                  'crear_cuenta','definir_pin','detalle_cuenta','canjear_premio','girar_ruleta','validar_premio',
                  'admin_guardar_ruleta','admin_guardar_premio_canje','admin_borrar_premio_canje','admin_estado_canje')
order by proname;

-- 3) Solo UNA versión de procesar_puntos_pedido (la nueva, con 1 parámetro)
select oid::regprocedure from pg_proc where proname = 'procesar_puntos_pedido';

-- 4) Qué puede ejecutar la llave pública (anon). Esperado:
--    true  : consultar_puntos, crear_cuenta, definir_pin, detalle_cuenta, canjear_premio, girar_ruleta, ruleta_publica, validar_premio
--    false : mover_puntos, pin_error, aplicar_puntos_pedido, procesar_puntos_pedido, admin_*
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_puede
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('consultar_puntos','crear_cuenta','definir_pin','detalle_cuenta','canjear_premio','girar_ruleta','ruleta_publica','validar_premio',
                    'mover_puntos','pin_error','aplicar_puntos_pedido','procesar_puntos_pedido',
                    'admin_guardar_ruleta','admin_guardar_premio_canje','admin_borrar_premio_canje','admin_estado_canje')
order by anon_puede desc, p.proname;

-- 5) Triggers sobre pedidos (debes ver los tuyos anteriores + pedidos_puntos_trg + pedidos_proteger_datos)
select tgname, tgenabled from pg_trigger where tgrelid = 'public.pedidos'::regclass and not tgisinternal order by tgname;

-- 6) Índices únicos clave
select indexname from pg_indexes where schemaname = 'public'
  and indexname in ('puntos_ff_id_uq','puntos_mov_pedido_motivo_uq','puntos_mov_ref_uq','giros_clave_uq','canjes_clave_uq');

-- 7) Humo: lo que ve la tienda (no crea nada)
select public.ruleta_publica();
select public.consultar_puntos('123456789');   -- existe:false si el ID no tiene cuenta

-- 8) Prueba de que la llave pública NO puede leer las tablas (debe fallar con "permission denied")
begin;
  set local role anon;
  select * from public.puntos limit 1;        -- <- ESPERADO: ERROR permission denied for table puntos
rollback;

-- 9) Suma de probabilidades de la ruleta activa -> debe ser 100 (si ya la configuraste)
select count(*) as premios_activos, coalesce(sum(peso),0) as suma_pesos from public.catalogo_premios where activo;
