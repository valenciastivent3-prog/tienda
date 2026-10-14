/* TEXTOS DE LA TIENDA — aquí están todas las frases que ve el cliente.
   Cambia lo que está entre comillas a la derecha de cada ":" y guarda. No toques lo que está a la izquierda.

   Reglas:
   - Escribe texto normal (no HTML). Si pones < o > se mostrarán tal cual, no hacen nada.
   - Lo que va entre llaves, como {nombre} o {num}, se reemplaza solo. Déjalo escrito igual.
   - Si necesitas una comilla doble dentro de un texto, escríbela así: \"
   - El nombre de la tienda, el lema, el WhatsApp y el color se cambian en Administración > Ajustes (o en config.js).
   - Los nombres e instrucciones de los métodos de pago (Nequi, banco...) se cambian en Administración > Pagos.
   - Para cambiar un texto sin tocar este archivo, también puedes poner "textos:{ clave:\"nuevo texto\" }"
     dentro del respaldo (data/datos.js, dentro de "config"). */
var TEXTOS={

  /* ===== Barra superior y pie de página ===== */
  "top.buscar":            "Buscar productos",
  "top.admin":             "Administración",
  "top.carrito":           "Carrito",
  "top.modoAdmin":         "Modo administrador",
  "pie.derechos":          "© {nombre}",
  "pie.admin":             "Administrar",

  /* ===== Portada y catálogo ===== */
  "hero.subtitulo":        "Compra fácil y recibe atención personal por WhatsApp.",
  "catalogo.titulo":       "Catálogo",
  "orden.etiqueta":        "Ordenar",
  "orden.nuevos":          "Más nuevos",
  "orden.menor":           "Precio: menor a mayor",
  "orden.mayor":           "Precio: mayor a menor",
  "orden.ofertas":         "Ofertas primero",
  "filtro.todos":          "Todos",
  "filtro.fisicos":        "Físicos",
  "filtro.virtuales":      "Virtuales",
  "filtro.todo":           "Todo",
  "vacio.sinResultados":   "Sin resultados",
  "vacio.sinResultadosDesc": "Prueba con otra búsqueda o categoría.",
  "vacio.sinProductos":    "Aún no hay productos",
  "vacio.sinProductosDesc": "Pronto agregaremos productos.",

  /* ===== Tarjeta de producto ===== */
  "producto.sinFoto":      "Sin foto",
  "producto.virtual":      "Virtual",
  "producto.oferta":       "Oferta",
  "producto.agregar":      "Agregar al carrito",
  "producto.agregado":     "Agregado ✓",
  "producto.agotado":      "Agotado",
  "producto.fotoAlt":      "{nombre}",

  /* ===== Carrito (paso 1) ===== */
  "paso.carrito":          "Carrito",
  "paso.datos":            "Datos",
  "paso.pago":             "Pago",
  "carrito.titulo":        "Tu carrito",
  "carrito.vacio":         "Está vacío. Agrega productos para hacer tu pedido.",
  "carrito.quitar":        "Quitar uno",
  "carrito.agregar":       "Agregar uno",
  "carrito.cupon":         "Cupón de descuento",
  "carrito.aplicar":       "Aplicar",
  "carrito.cuponNo":       "Ese cupón no existe o no está activo.",
  "carrito.cuponOk":       "Cupón aplicado ✓",
  "carrito.subtotal":      "Subtotal",
  "carrito.descuento":     "Descuento",
  "carrito.total":         "Total",
  "carrito.seguir":        "Seguir comprando",
  "carrito.continuar":     "Continuar",
  "carrito.cerrar":        "Cerrar",

  /* ===== Datos del cliente (paso 2) ===== */
  "datos.titulo":          "Tus datos",
  "datos.nombre":          "Tu nombre",
  "datos.celular":         "Tu celular",
  "datos.comoRecibir":     "¿Cómo quieres recibir tu pedido?",
  "datos.domicilio":       "A domicilio",
  "datos.recoger":         "Recoger en un punto",
  "datos.direccion":       "Dirección donde vives (barrio y referencias)",
  "datos.punto":           "Punto donde quieres recogerlo",
  "datos.cuentaTitulo":    "Datos de tu cuenta para la recarga",
  "datos.cuentaId":        "ID de tu cuenta",
  "datos.cuentaNombre":    "Nombre de tu cuenta (para confirmar que es la correcta)",
  "datos.cuentaAviso":     "Revisa bien estos datos: la recarga se hace a la cuenta que escribas. Primero se realiza el pago y, cuando lo confirmemos, te llegará a tu cuenta.",
  "datos.volver":          "Volver",

  /* Lo que falta por llenar. Salen en la frase: "Falta: tu nombre, tu celular." */
  "falta.prefijo":         "Falta: {lista}.",
  "falta.nombre":          "tu nombre",
  "falta.celular":         "tu celular",
  "falta.direccion":       "la dirección",
  "falta.punto":           "el punto de recogida",
  "falta.cuentaId":        "el ID de tu cuenta",
  "falta.cuentaNombre":    "el nombre de tu cuenta",
  "falta.formaPago":       "la forma de pago",
  "falta.referencia":      "la referencia o la captura de tu pago",

  /* ===== Pago (paso 3) ===== */
  "pago.titulo":           "Forma de pago",
  "pago.totalAPagar":      "Total a pagar",
  "pago.sinMetodos":       "Por ahora no hay formas de pago disponibles para este pedido. Escríbenos por WhatsApp.",
  "pago.confirmar":        "Confirmar pedido",
  "pago.enviando":         "Enviando…",
  "pago.errorEnvio":       "No se pudo enviar tu pedido. Revisa tu conexión e inténtalo de nuevo.",
  "pago.errorDemasiados":  "Has enviado varios pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp.",
  "pago.efectivoDefecto":  "Pagas en efectivo cuando recibes tu pedido.",
  "pago.envia":            "Envía el pago a",
  "pago.aNombre":          "A nombre de {titular}",
  "pago.qrAlt":            "Código QR para pagar",
  "pago.enLinea":          "Pagar en línea",
  "pago.copiar":           "Copiar",
  "pago.copiado":          "Copiado ✓",
  "pago.valorExacto":      "Valor exacto:",
  "pago.copiarValor":      "Copiar valor",
  "pago.cuandoPagues":     "Cuando pagues, escribe la referencia o sube la captura:",
  "pago.referencia":       "Referencia o número del comprobante",
  "pago.captura":          "Captura del pago (opcional si escribes la referencia)",
  "pago.procesando":       "Procesando…",
  "pago.capturaLista":     "Captura lista ✓",

  /* ===== Pedido recibido ===== */
  "ok.titulo":             "¡Pedido recibido!",
  "ok.cuerpoPago":         "Tu número de pedido es {num}. Lo revisaremos y confirmaremos tu pago en breve.",
  "ok.cuerpoEfectivo":     "Tu número de pedido es {num}. Lo revisaremos y te confirmaremos.",
  "ok.virtual":            "Cuando confirmemos tu pago, la recarga llegará a tu cuenta.",
  "ok.dudas":              "¿Dudas? {enlace}.",
  "ok.dudasEnlace":        "Escríbenos por WhatsApp",
  "ok.pruebaLocal":        "Modo de prueba: este pedido solo se guardó en este dispositivo.",

  /* ===== Tienda sin base de datos (en internet, sin Supabase configurado) ===== */
  "cerrada.aviso":         "Por ahora no estamos recibiendo pedidos por la página.",
  "cerrada.dudas":         "Escríbenos por WhatsApp para hacer tu pedido.",

  /* ===== Entrada al panel de administración ===== */
  "login.titulo":          "Administración",
  "login.correo":          "Correo",
  "login.contrasena":      "Contraseña",
  "login.clave":           "Clave",
  "login.cancelar":        "Cancelar",
  "login.entrar":          "Entrar",
  "login.entrando":        "Entrando…",
  "login.claveMala":       "Clave incorrecta.",
  "login.credencialesMalas": "Correo o contraseña incorrectos.",
  "login.sesionVencida":   "Tu sesión venció. Sal del panel y vuelve a entrar."
};
