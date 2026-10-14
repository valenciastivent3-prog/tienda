# Tutorial: configurar la base de datos (Supabase) paso a paso

Con esto tu tienda guarda **productos, ajustes, pedidos, puntos y ruleta** en una base de datos en línea. Lo que cambies en `admin.html` se ve en la tienda (`index.html`) sin volver a publicar archivos.

Tiempo estimado: 20 a 30 minutos. Los nombres de los menús de Supabase pueden cambiar un poco con el tiempo; si algo no coincide, busca la opción con nombre parecido.

## Cómo quedan conectadas la tienda y el administrador

```
 index.html (clientes)  ──┐                            ┌── Productos, ajustes, puntos y ruleta
                          ├──►  Supabase (tu base) ◄───┤   (los clientes solo LEEN el catálogo y CREAN pedidos)
 admin.html (tú)  ────────┘     reglas RLS             └── Pedidos (solo los lee quien entra con tu correo)
```

- La tienda **no tiene ningún código de administración**: solo `admin.html` lo tiene.
- Aunque alguien abra `admin.html`, sin tu correo y contraseña no puede leer pedidos ni cambiar nada: lo decide la **base de datos**, no la página.
- Los puntos los suma la base de datos cuando tú confirmas un pago, y el premio de la ruleta lo sortea la base de datos. La página solo muestra el resultado.

## Paso 1. Crear el proyecto

1. Entra a https://supabase.com y crea una cuenta.
2. **New project**. Ponle un nombre, crea una **contraseña de base de datos larga** (guárdala en un lugar seguro) y elige la región más cercana (por ejemplo *South America (São Paulo)*).
3. Espera a que termine de crearse (1 a 2 minutos).

## Paso 2. Crear tu usuario administrador

1. Menú **Authentication > Users > Add user > Create new user**.
2. Escribe **tu correo** y una **contraseña larga y única**. Marca *Auto Confirm User*.
3. Menú **Authentication > Sign In / Providers** (o *Settings*): **desactiva "Allow new users to sign up"**. Así nadie más puede crear cuentas.
4. Si tu plan lo permite, activa verificación en dos pasos para ese usuario.

## Paso 3. Crear las tablas y las reglas de seguridad

Menú **SQL Editor**. Haz esto **en orden**:

1. Abre `supabase/schema.sql` en un editor de texto, cambia `TU_CORREO@ejemplo.com` por **tu correo** (aparece **una sola vez**), copia **todo** el contenido, pégalo en el SQL Editor y pulsa **Run**. Debe terminar sin errores en rojo.
2. Abre `supabase/schema_2_catalogo_puntos.sql`, copia **todo**, pégalo en una consulta nueva y pulsa **Run**. No hay que cambiar nada.

Comprobación (opcional): ejecuta esto y verifica que las 7 tablas salgan con `true`:

```sql
select relname, relrowsecurity from pg_class
where relname in ('pedidos','productos','ajustes','puntos','puntos_mov','premios','giros','intentos');
```

> Si ejecutas los archivos otra vez no se borra nada: solo se actualizan las reglas.

## Paso 4. Conectar la tienda con tu base

1. **Project Settings > API Keys** (o *API*). Copia la **Project URL** y la llave **publishable** (también llamada *anon*).
2. Abre `js/config.js` y pégalas aquí:

```js
supabase:{url:"https://TU-PROYECTO.supabase.co", anonKey:"sb_publishable_..."}
```

3. **Nunca pegues la llave `secret` ni `service_role`** en ningún archivo de la tienda: da control total de tu base. Solo la URL y la publishable.

## Paso 5. Publicar

Sube la carpeta completa a Vercel, Netlify o Cloudflare Pages (arrastrar y soltar la carpeta funciona). Quedan dos direcciones:

- Tienda: `https://tusitio.com/`
- Administrador: `https://tusitio.com/admin.html` (guárdala en tus favoritos; no está enlazada desde la tienda y lleva `noindex` para que Google no la muestre).

## Paso 6. Primer uso

1. Abre `admin.html`, entra con tu correo y contraseña.
2. Si ya tenías productos en el modo de prueba: pestaña **Respaldo**, pega tu respaldo y pulsa **Restaurar**. Se suben a la base de datos. Si no, usa **＋ Agregar producto**.
3. **Ajustes**: nombre, WhatsApp y color. **Pagos**: Nequi, banco, etc.
4. **Puntos y ruleta**: define cuántos pesos equivalen a 1 punto, cuántos puntos cuesta un giro y los premios con su probabilidad. Pulsa **Guardar**.
5. Abre la tienda en otra pestaña (o el celular): debes ver tus productos y el botón **🎁 Mis puntos**.

## Paso 7. Probar de punta a punta (hazlo antes de vender)

1. En la tienda haz un pedido de prueba con tu celular.
2. En `admin.html > Pedidos` aparece **Pendiente**. Pulsa **Confirmar pago**: se descuenta el stock y se suman los puntos.
3. En la tienda: **Mis puntos** > tu celular + el número del pedido (los 6 caracteres que se mostraron al comprar). Debes ver tus puntos.
4. Para probar la ruleta sin gastar mucho, baja temporalmente "Puntos para cada giro" a 1 en el panel. Cuando termines, súbelo otra vez.

## Cómo funcionan los puntos

- Se suman **solo cuando confirmas el pago** (nunca al hacer el pedido). Un mismo pedido suma una sola vez.
- Si **cancelas** un pedido ya pagado, se restan esos puntos (si el cliente ya los gastó, el saldo queda en 0).
- El cliente se identifica con **celular + número de pedido**. Es práctico, pero no es una cuenta con contraseña: quien conozca ambos datos de un cliente puede ver sus puntos. Después de 15 intentos fallidos desde una misma conexión se bloquea unos minutos.
- Los premios de descuento son **cupones de un solo uso** que vencen a los 60 días. Se marcan como usados cuando confirmas el pago del pedido que los usó.

## Problemas frecuentes

| Síntoma | Qué revisar |
|---|---|
| "No se pudieron cargar los pedidos" | ¿Pusiste tu correo en `schema.sql` y es el mismo con el que entras? |
| La tienda sale vacía | ¿Ejecutaste `schema_2_catalogo_puntos.sql`? ¿Hay productos *visibles*? ¿URL y llave en `config.js`? |
| "Mis puntos" dice que no está disponible | Guarda una vez la pestaña **Puntos y ruleta** (o verifica que el Paso 3.2 corrió bien). |
| El panel te saca de la sesión | La sesión dura mientras la pestaña esté abierta; vuelve a entrar. |
| Error de red en la consola del navegador | La política de contenido (CSP) solo permite conectarse a `*.supabase.co`. |

## Cookies

Mira la sección "Cookies" del `README.md`.
