# Informe de recuperación (2026-10-13)

## Estado real encontrado
- `tienda_completa.zip` (modificado hasta 12-oct) es un SUPERCONJUNTO de `respaldo_tienda_20261008_184108.zip`:
  no falta ninguna función JS ni selector CSS del respaldo; solo añade trabajo nuevo (puntos por ID de FF,
  canjes, ruleta configurable, schema_3, verificación). Nada del diseño ni de las animaciones se perdió.
- Ningún ZIP incluye `.git`: el commit 78f7f87, el estado de la rama main y el push NO se pudieron verificar.
- Tu base de datos AÚN NO tiene schema_3 (las tablas siguen con columna `tel`; no existen `canjes` ni `cupones_ruleta`).
  Hasta ejecutarlo, el panel "Puntos y ruleta" y "Mis puntos" fallarán (el frontend ya espera `ff_id` y las 13 funciones nuevas).

## Cambio hecho
- `admin.html`: enlazadas `css/hud.css` y `css/shop.css` (el HTML ya cargaba hud.js y shop.js, que inyectan elementos
  que sin esas hojas aparecían sin estilo). Copia previa: `admin.html.ANTES_de_enlazar_hud_shop.bak`.
## Archivo nuevo
- `supabase/precheck_schema_3.sql` (solo lectura).

## Pruebas
- PASÓ: `node --check` en todos los JS activos; todos los `src`/`href` de index.html y admin.html existen, sin duplicados;
  las 13 funciones RPC que llama el JS existen en schema_3 con los mismos nombres.
- NO EJECUTADO: schema_3 (no hay PostgreSQL ni acceso a tu Supabase aquí), pruebas en navegador, git, push.

## Orden recomendado
1. Respaldo en Supabase. 2. `precheck_schema_3.sql`. 3. Si las 4 cuentas dan 0: `schema_3_puntos_ff.sql` completo.
4. `verificacion_schema_3.sql` bloque por bloque. 5. Admin > Puntos y ruleta: pesos = 100 %. 6. Probar con un ID de prueba.
7. Solo entonces git add/commit/push (sin --force).
