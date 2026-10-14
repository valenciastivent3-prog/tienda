# Mi Tienda

Tienda en línea con **administración en una página aparte** (`admin.html`), sistema de **puntos y ruleta** y **aviso de cookies**. No necesita servidor propio: son archivos estáticos (HTML, CSS y JavaScript) más una base de datos en Supabase.

**Empieza por `TUTORIAL_BASE_DE_DATOS.md`.**

## Estructura

```
tienda/
├── index.html          La tienda (clientes). No contiene código de administración.
├── admin.html          El panel de administración (tú). Pide correo y contraseña.
├── TUTORIAL_BASE_DE_DATOS.md   Paso a paso para configurar Supabase
├── css/                base, store, admin y rgb (efectos RGB)
├── js/
│   ├── config.js       Datos de la tienda y llaves públicas de Supabase
│   ├── textos.js       Frases que ve el cliente
│   ├── core.js         Utilidades, estado, carga del catálogo
│   ├── backend.js      Conexión con Supabase (productos, pedidos, puntos, sesión del admin)
│   ├── cookies.js      Aviso y configuración de cookies (solo tienda)
│   ├── puntos.js       "Mis puntos" y ruleta (cliente)
│   ├── ui.js · store.js · main.js
│   └── admin.js        Solo lo carga admin.html
├── supabase/
│   ├── schema.sql                    1) Pedidos y administrador
│   └── schema_2_catalogo_puntos.sql  2) Productos, ajustes, puntos y ruleta
├── _headers · vercel.json            Cabeceras de seguridad
└── data/datos.js       Solo para el modo de prueba sin base de datos
```

## Tipos de producto

- **Físico:** al comprar, el cliente elige *entrega a domicilio* (escribe dónde vive) o *recoger en un punto* (escribe o elige uno de los puntos que definas en Ajustes).
- **Virtual** (por ejemplo "500 diamantes"): solo pones nombre y precio. Al comprar, el cliente escribe el **ID** y el **nombre de su cuenta** para confirmar que es la correcta. Se paga primero (no hay contra entrega) y, cuando confirmes el pago, se acredita a su cuenta. Puede tener stock ilimitado.
- Las ofertas, cupones y categorías funcionan igual para ambos tipos.
- Si el carrito mezcla ambos, se piden los datos de cada tipo y no se permite contra entrega.

## Primer uso

1. Configura la base de datos con `TUTORIAL_BASE_DE_DATOS.md`.
2. Entra a `admin.html` con tu correo y contraseña.
3. Agrega productos (＋ Agregar producto), ajusta nombre, WhatsApp, pagos y la pestaña **Puntos y ruleta**.
4. Todo lo que cambies aquí se ve en la tienda al instante: ya no hay que copiar el Respaldo ni volver a subir archivos.

**Modo de prueba (sin base de datos):** abre `admin.html` en tu computador; clave inicial `1234`. Todo queda solo en ese navegador.

## Métodos de pago

Se administran en **Administración > Pagos**, sin tocar código:
- **Billetera o cuenta** (Nequi, Daviplata, Bancolombia...): número o cuenta, titular, código QR opcional e instrucciones. El cliente puede copiar el número y el valor exacto con un botón.
- **Enlace de pago en línea** (tarjeta, PSE): pegas el enlace de pago que te da tu pasarela (Wompi, Mercado Pago, ePayco u otra). El cliente lo abre, paga y luego escribe la referencia. El enlace debe empezar con `https://`.
- **Contra entrega** (efectivo): solo aparece si el pedido no incluye productos virtuales.
- Puedes agregar todos los métodos que quieras, apagarlos, reordenarlos con ▲▼, editarlos o eliminarlos.
- Un método activo sin número, cuenta o enlace **no se muestra** a los clientes hasta que lo configures.

El pago del cliente es por pasos: **Carrito → Datos (entrega o cuenta a recargar) → Pago**. Al final escribe la referencia o sube la captura de su pago, y tú lo verificas en Pedidos.

> El cobro sigue siendo manual: tú confirmas cada pago. Un cobro totalmente automático (que el pedido pase a "pagado" solo) necesita un servidor que reciba la confirmación de la pasarela; con un enlace de pago es posible, pero requiere trabajo adicional.

## Pedidos, puntos y ruleta

Todo está en el tutorial. Resumen del flujo: el cliente paga y sube su referencia → llega **Pendiente** → tú pulsas **Confirmar pago** (descuenta stock y **suma puntos**) → **Marcar entregado**. Con los puntos del objetivo el cliente gira la ruleta en **🎁 Mis puntos**; si gana un descuento recibe un cupón de un solo uso para el carrito.

## Cambiar los textos de la tienda

Todas las frases que ve el cliente (portada, botones, carrito, pasos del pago, mensajes de error, pedido recibido...) están en `js/textos.js`. Abre el archivo, cambia lo que está entre comillas a la derecha de cada `:` y guarda. Lo que va entre llaves, como `{num}`, se rellena solo.

- El nombre de la tienda, el lema, el WhatsApp y el color se cambian en **Administración > Ajustes**.
- Los nombres e instrucciones de los métodos de pago se cambian en **Administración > Pagos**.
- Los textos del panel de administración (el que solo ves tú) siguen escritos dentro de `js/admin.js`.

## Seguridad

Qué está protegido y cómo:

- **Base de datos:** los clientes solo pueden *crear* pedidos. Leer, cambiar o borrar es solo para tu correo (tabla `admins`). La base valida cada pedido que llega (formato, tamaño, comprobante solo imagen), fuerza que entre como *Pendiente* y limita a 8 pedidos cada 10 minutos por conexión (mejor esfuerzo).
- **Administración separada:** `admin.html` es la única página con código de administración. La seguridad real está en las reglas RLS de Supabase: sin tu sesión nadie puede escribir productos ni leer pedidos, aunque abra la página.
- **Puntos y ruleta:** los suma un disparador de la base de datos al confirmar el pago y el premio lo sortea la base (`girar_ruleta`); los clientes no pueden modificar puntos ni premios.
- **Panel:** todo lo que viene de un pedido o de un respaldo se escapa antes de mostrarse, las imágenes solo se aceptan como `data:image/...` y los enlaces de pago solo como `https://`. Un pedido mal formado ya no rompe la lista.
- **Política de contenido (CSP)** en `index.html`: el navegador solo ejecuta los scripts de esta carpeta y solo se conecta a `*.supabase.co`. Si algún día agregas otro servicio (chat, analytics), hay que permitirlo ahí. Si usas un dominio propio de Supabase, cámbialo en `connect-src`.
- **Cabeceras** (`_headers`, `vercel.json`): evitan que otra página meta la tuya en un marco y fijan HTTPS. GitHub Pages no permite cabeceras; allí solo aplica la CSP del `index.html`.
- **El respaldo ya no incluye la clave de administración**, y restaurar un respaldo no puede cambiar a qué Supabase se envían los pedidos.

Haz esto en Supabase (una vez):

1. **Authentication > Sign In / Providers:** desactiva *Allow new users to sign up*.
2. Usa una contraseña larga y única para tu usuario administrador. Si tu plan lo permite, activa también verificación en dos pasos.
3. No compartas la llave `service_role`.

## Cookies

La tienda muestra un aviso la primera vez. Categorías (en `js/cookies.js`):

- **Necesarias** (siempre activas): carrito y registro de tu elección (cookie propia `tienda_cookies`, 6 meses).
- **Preferencias** (opcionales): recordar nombre y celular para el siguiente pedido. Si el cliente retira el permiso, se borran.

No hay cookies de publicidad ni de seguimiento. Si agregas analítica, créala con `Cookies.on("estadisticas", fn)` y una categoría nueva en `CATS` para que solo cargue con permiso (y permite ese dominio en la CSP). El enlace "Cookies" del pie reabre la configuración. `admin.html` no muestra aviso: solo usa almacenamiento necesario (la sesión vive en `sessionStorage` y se borra al cerrar la pestaña).

Un sitio estático no puede usar cookies HttpOnly. Si más adelante quieres sesión en cookie HttpOnly, necesitas un servidor (por ejemplo, funciones de Vercel/Netlify).

En Colombia, si recoges datos personales (nombre, celular, dirección) conviene publicar una política de tratamiento de datos y pedir autorización (Ley 1581 de 2012). Consulta con un profesional para el texto legal.

## Apariencia

El diseño es oscuro con tonos cálidos (naranja, rosa y ámbar) y luces RGB animadas. Todo está en `css/rgb.css`:
- Para quitar las luces y dejar solo los colores, borra la línea `<link ... rgb.css>` de `index.html`.
- Para cambiar los colores de las luces, edita `--rgb1`, `--rgb2` y `--rgb3` al inicio de `rgb.css`.
- El color de los botones se cambia en Administración > Ajustes > Color principal.
- Si el celular o computador del cliente tiene activada la opción "reducir movimiento", las animaciones se apagan solas.

## Publicar y tener tu propio enlace

Al subir la carpeta a Netlify te dan un enlace tipo `algo-random.netlify.app`. Puedes mejorarlo de dos formas:

1. **Gratis:** cambia el nombre del sitio en los ajustes de Netlify (Site configuration) y queda `mitienda.netlify.app`.
2. **Dominio propio** (por ejemplo `mitienda.com`), lo más profesional:
   1. Compra el dominio en un registrador (Namecheap, GoDaddy, Hostinger, Cloudflare, o directamente en Netlify). El precio depende de la terminación (.com, .co, .shop...); compáralo antes de comprar.
   2. En Netlify: tu sitio > **Domain management** > **Add a domain you already own** > escribe tu dominio > Verify.
   3. Netlify te ofrece dos caminos: usar **Netlify DNS** (cambias los servidores de nombres en tu registrador) o dejar el DNS donde lo compraste y crear los registros que Netlify te indique (normalmente un `CNAME` de `www` hacia tu `.netlify.app` y un registro para el dominio sin `www`). Usa los valores exactos que te muestre Netlify.
   4. Espera a que se propague (de minutos a 48 horas). Netlify activa el candado HTTPS gratis.

Otras opciones gratuitas que también aceptan dominio propio: Cloudflare Pages, GitHub Pages y Vercel.

Para compartirla: pon el enlace en la biografía de Instagram/TikTok, en el estado de WhatsApp, y genera un código QR para imprimir.

## Limitaciones

- No hay cobro automático: el cliente paga por Nequi o transferencia y tú confirmas el pago a mano. Cobrar con tarjeta de forma automática requiere una pasarela de pagos (Wompi, Mercado Pago, etc.).
- Las fotos de productos se guardan dentro de la base (base64). Con pocos productos y fotos livianas va bien; para un catálogo grande conviene Supabase Storage.
- Cualquiera puede crear pedidos falsos (es inevitable en una tienda abierta); por eso los verificas antes de confirmarlos. El límite por conexión frena el spam sencillo, no un ataque organizado.
- Los precios, el total y los cupones los calcula la página del cliente, así que alguien con conocimientos podría mandar un pedido con un total menor. **Antes de confirmar un pago, compara el total del pedido con lo que realmente te llegó.** Quitar este riesgo del todo requiere guardar los productos en la base de datos y calcular el total allí.
- Los cupones creados en la pestaña Cupones son públicos (los lee la página). Los cupones de la ruleta no: se validan en la base de datos y son de un solo uso.
- Los puntos se identifican con celular + número de pedido, no con una cuenta con contraseña.
- El stock se descuenta desde tu panel al confirmar el pago y se guarda en la base; un cliente puede pedir algo agotado si compra justo antes de que lo confirmes.
- Si abres la tienda en internet sin Supabase configurado, el carrito avisa que no se reciben pedidos (antes los pedidos se perdían en el celular del cliente). El modo de prueba solo funciona abriendo la página en tu computador.
