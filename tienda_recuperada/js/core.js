/* NÚCLEO: utilidades, estado, almacenamiento y tema */
var $=function(i){return document.getElementById(i)};
var fmt=new Intl.NumberFormat("es-CO",{style:"currency",currency:CONFIG.moneda,maximumFractionDigits:0});
/* Escapa texto para meterlo en HTML o en atributos (incluye comillas, que antes no se escapaban) */
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
/* Solo deja pasar imágenes en data:image/... (las fotos que sube la gente se guardan así). Cualquier otra cosa se descarta. */
function safeImg(u){return typeof u==="string"&&u.length<900000&&/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u)?u:""}
/* Solo enlaces https:// (evita javascript: y similares) */
function safeUrl(u){return typeof u==="string"&&/^https:\/\/[^\s"'<>]+$/i.test(u.trim())?u.trim():""}
/* Textos de la tienda: viven en js/textos.js. T() devuelve texto plano; TH() devuelve HTML ya escapado
   (los {huecos} se rellenan con lo que le pases: en TH tú te encargas de que sea HTML seguro). */
function T(k,v){var s=(cfg.textos&&cfg.textos[k]!=null?cfg.textos[k]:TEXTOS[k]);if(s==null)s=k;return String(s).replace(/\{(\w+)\}/g,function(m,n){return v&&v[n]!=null?v[n]:m})}
function TH(k,v){var s=esc(T(k)),r=v||{};return s.replace(/\{(\w+)\}/g,function(m,n){return r[n]!=null?r[n]:m})}
/* ¿La página está abierta en tu computador (modo de prueba) o en internet? */
var enLocal=(location.protocol==="file:"||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
function lsGet(k,def){try{var v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}

/* ADMIN_PAGE: true solo en admin.html. REMOTO: true si hay base de datos (Supabase) configurada. */
var ADMIN_PAGE=!!document.getElementById("adminroot");
var REMOTO=!!(CONFIG.supabase&&CONFIG.supabase.url&&CONFIG.supabase.anonKey);
/* Con base de datos, productos y ajustes se leen de ahí (los carga cargarCatalogo). Sin ella, modo de prueba local. */
var cfg=REMOTO?Object.assign({},CONFIG):Object.assign({},CONFIG,DATOS_INICIALES.config||{},lsGet("tienda_config",{}));
/* Deja cada producto con los tipos y largos correctos (viene del respaldo o del navegador y nunca se debe confiar a ciegas) */
function limpiarProducto(p){
  p=(p&&typeof p==="object")?p:{};
  var n=function(x){x=Number(x);return isFinite(x)&&x>0?x:0},t=function(x,m){return String(x==null?"":x).slice(0,m)};
  var id=/^[A-Za-z0-9_-]{1,40}$/.test(String(p.id))?String(p.id):uid();
  return{id:id,name:t(p.name,80),description:t(p.description,500),price:n(p.price),stock:Math.floor(n(p.stock)),tipo:p.tipo==="virtual"?"virtual":"fisico",ilimitado:!!p.ilimitado,
    category:t(p.category,40),offer:!!p.offer,offerPrice:n(p.offerPrice),active:p.active!==false,image:safeImg(p.image),createdAt:n(p.createdAt)||Date.now()};
}
var items=REMOTO?[]:(lsGet("tienda_productos",null)||(DATOS_INICIALES.productos||[]).slice()).map(limpiarProducto);
/* Métodos de pago: se editan en Administración > Pagos.
   tipo: "transfer" (Nequi, Daviplata, banco...), "link" (enlace de pago en línea) o "efectivo" (contra entrega). */
function metodosBase(){return[
 {id:"contra",nombre:"Pago contra entrega",tipo:"efectivo",activo:true,instr:"Pagas en efectivo cuando recibes tu pedido."},
 {id:"nequi",nombre:"Nequi",tipo:"transfer",activo:true,cuenta:cfg.nequi||"",titular:"",qr:"",instr:"Envía el valor exacto a este número y sube tu comprobante."},
 {id:"daviplata",nombre:"Daviplata",tipo:"transfer",activo:false,cuenta:"",titular:"",qr:"",instr:"Envía el valor exacto a este número y sube tu comprobante."},
 {id:"banco",nombre:"Transferencia bancaria",tipo:"transfer",activo:true,cuenta:cfg.banco||"",titular:"",qr:"",instr:"Haz la transferencia por el valor exacto y sube tu comprobante."},
 {id:"tarjeta",nombre:"Tarjeta o PSE",tipo:"link",activo:false,enlace:"",instr:"Paga en línea de forma segura y luego escribe la referencia de tu pago."}]}
function metodos(){return cfg.metodos||metodosBase()}
function pagos(){return metodos().filter(function(m){return m.activo!==false})}
var cart=lsGet("tienda_carrito",{});
var orders=(cfg.supabase&&cfg.supabase.url)?[]:lsGet("tienda_pedidos",[]),coupon=null,newLogo,compImg="",pedidoFiltro="Pendiente",ordersErr="";
function applyTheme(){var c=cfg.color||"#22d3ee",r=document.documentElement.style,n=parseInt(c.slice(1),16),l=0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255);r.setProperty("--accent",c);r.setProperty("--on-accent",l>150?"#111":"#fff")}
applyTheme();
function resizeImg(f,max,type,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL(type,0.8))};im.src=r.result};r.readAsDataURL(f)}
var authed=false,cat="",tipoF="",atab="",editing=null,img="",pdel=null,step="cart",pay="contra";
function persist(){
  if(REMOTO){if(authed)Backend.guardarProductos(items).catch(function(e){alert("No se pudo guardar en la base de datos: "+e.message)});return}
  if(!lsSet("tienda_productos",items))alert("No se pudo guardar: el espacio del navegador está lleno. Elimina productos o usa fotos más pequeñas.")
}
/* Guarda los ajustes públicos (nombre, color, métodos de pago, cupones...). Nunca sube la clave ni las llaves de Supabase. */
function guardarCfg(){
  if(REMOTO){var c=Object.assign({},cfg);["claveAdmin","supabase","pts","ruleta"].forEach(function(k){delete c[k]});Backend.guardarAjuste("config",c).catch(function(e){alert("No se pudieron guardar los ajustes: "+e.message)});return}
  lsSet("tienda_config",cfg)
}
/* Lee productos y ajustes de la base de datos (el visitante ve los activos; el administrador ve todos). */
function cargarCatalogo(){
  return Backend.catalogo().then(function(c){
    var cf=Object.assign({},c.config||{});delete cf.claveAdmin;delete cf.supabase;
    cfg=Object.assign({},CONFIG,cf,{pts:c.puntos||null,ruleta:[]});
    items=c.productos.map(limpiarProducto);applyTheme();renderAll();
    /* La ruleta (premios activos) y su costo vienen de la base de datos; el administrador los edita en "Puntos y ruleta". */
    if(!REMOTO)return;
    return Backend.rpc("ruleta_publica").then(function(r){
      if(r&&Array.isArray(r.premios)){
        cfg.ruleta=r.premios;
        cfg.pts=Object.assign({},cfg.pts||{},{objetivo:Number(r.costo)||0});
        renderAll();
      }
    }).catch(function(){});
  });
}
function eff(p){return p.offer&&p.offerPrice>0?p.offerPrice:p.price}
function uid(){return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

/* Productos virtuales (diamantes, códigos, servicios): no se envían y pueden tener stock ilimitado */
function ilim(p){return p.tipo==="virtual"&&!!p.ilimitado}
function agotado(p){return !ilim(p)&&(p.stock||0)<=0}
function estadoDe(o){return o.estado==="Nuevo"?"Pendiente":o.estado}
var ESTADOS=["Pendiente","Pagado","Entregado","Cancelado"];
/* Un pedido que llega de la base de datos puede venir mal formado (o armado a propósito por alguien malicioso).
   Aquí se limpia para que nunca rompa el panel ni meta HTML. Los valores de las columnas (id, estado) mandan sobre lo que diga "datos". */
function normalizarPedido(row){
  var d=(row&&row.datos&&typeof row.datos==="object"&&!Array.isArray(row.datos))?row.datos:(row&&typeof row==="object"?row:{});
  var num=function(x,def){x=Number(x);return isFinite(x)&&x>=0?x:def};
  var txt=function(x,max){return String(x==null?"":x).slice(0,max)};
  var its=Array.isArray(d.items)?d.items.slice(0,100).map(function(i){i=i||{};return{id:txt(i.id,40),n:txt(i.n,120),q:Math.floor(num(i.q,0)),pr:num(i.pr,0),v:!!i.v,puntos:(typeof i.puntos==="number"&&isFinite(i.puntos)&&i.puntos>=0)?Math.floor(i.puntos):null}}):[];
  var est=row&&row.estado!=null?row.estado:d.estado;
  var o={id:txt(row&&row.id!=null?row.id:d.id,40),fecha:num(d.fecha,row&&row.creado?Date.parse(row.creado)||0:0),estado:ESTADOS.indexOf(est)>-1?est:"Pendiente",
    nombre:txt(d.nombre,120),tel:txt(d.tel,40),idJuego:txt(d.idJuego,20),items:its,subtotal:num(d.subtotal,0),descuento:num(d.descuento,0),cupon:txt(d.cupon,40),total:num(d.total,0),
    pago:txt(d.pago,80),pagoId:txt(d.pagoId,40),referencia:txt(d.referencia,200),comprobante:safeImg(d.comprobante),
    dir:txt(d.dir,300),punto:txt(d.punto,200),cuenta:(d.cuenta&&typeof d.cuenta==="object")?{id:txt(d.cuenta.id,80),nombre:txt(d.cuenta.nombre,120)}:null,desc:!!d.desc};
  return o;
}
