/* ARRANQUE: eventos globales e inicio de la aplicaciÃ³n */
/* ---------- Eventos ---------- */
document.addEventListener("change",function(e){
  var el=e.target;
  if(!el.matches("input[data-qty]"))return;
  var id=el.dataset.id;
  var n=Math.floor(Number(el.value));
  if(!Number.isFinite(n)||n<1)n=1;
  if(n>9999)n=9999;
  cart[id]=n;
  lsSet("tienda_carrito",cart);
  updateCount();
  drawCart();
});
document.addEventListener("click",function(e){
  if(e.target.classList&&e.target.classList.contains("comp")){e.target.classList.toggle("big");return}
  var t=e.target.closest("button");if(!t)return;var d=t.dataset;
  if(d.add){cart[d.add]=(cart[d.add]||0)+1;lsSet("tienda_carrito",cart);updateCount();t.textContent=T("producto.agregado");setTimeout(renderStore,700)}
  else if(d.c!==undefined&&t.classList.contains("chip")){cat=d.c;renderStore()}
  else if(d.t!==undefined&&t.classList.contains("chip")){tipoF=d.t;renderStore()}
  else if(d.pf!==undefined){pedidoFiltro=d.pf;renderAdmin()}
  else if(d.oa)cambiarEstado(d.id,d.oa);
  else if(d.tab){atab=atab===d.tab?"":d.tab;renderAdmin()}
  else if(d.x==="newp")openForm(null);
  else if(d.x==="logout"){authed=false;atab="";Backend.logout();if(Backend.remote)orders=[];renderAll()}
  else if(d.q){var id=d.id;cart[id]=(cart[id]||0)+Number(d.q);if(cart[id]<=0)delete cart[id];lsSet("tienda_carrito",cart);updateCount();drawCart()}
  else if(d.x==="close")$("dlg").close();
  else if(d.x==="to-datos"){step="datos";drawCart()}
  else if(d.x==="to-pago"){var fd=validarDatos(lines());if(fd.length){$("err").textContent=T("falta.prefijo",{lista:fd.join(", ")});return}step="pago";drawCart()}
  else if(d.x==="back-cart"){step="cart";drawCart()}
  else if(d.x==="back-datos"){step="datos";drawCart()}
  else if(d.modo){chk.modo=d.modo;drawCart()}
  else if(d.pm){chk.pay=d.pm;drawCart()}
  else if(d.copy!==undefined)copiar(d.copy,t);
  else if(d.x==="msave")saveMetodo();
  else if(d.x==="send")sendOrder();else if(d.x==="cup")applyCoupon();else if(d.x==="osave")saveOrder();
  else if(d.x==="save")saveForm();
  else if(d.x==="pin")checkPin();
  else if(d.a==="edit")openForm(items.find(function(p){return p.id===d.id}));
  else if(d.a==="del"){
    if(pdel!==d.id){pdel=d.id;renderStore();setTimeout(function(){if(pdel===d.id){pdel=null;renderStore()}},4000);return}
    pdel=null;items=items.filter(function(p){return p.id!==d.id});delete cart[d.id];persist();refresh();
  }
  else if(d.a==="vis"){var pv=items.find(function(p){return p.id===d.id});pv.active=!pv.active;persist();refresh()}
});
if($("adminlink"))$("adminlink").addEventListener("click",function(){if(!authed)askPin()});
renderAll();
/* Arranque: la tienda lee el catÃ¡logo de la base de datos; el panel (admin.html) pide sesiÃ³n. */
if(ADMIN_PAGE){
  if(Backend.remote&&Backend.restore()){authed=true;renderAll();cargarCatalogo().then(cargarPedidos).catch(function(){authed=false;Backend.logout();renderAll();askPin()})}
  else askPin();
}else if(REMOTO)cargarCatalogo().catch(function(){});

/* Con base de datos en lÃ­nea, revisa cada 30 s si llegaron pedidos nuevos */
setInterval(function(){if(ADMIN_PAGE&&authed&&Backend.remote&&(atab==="orders"||atab==="")&&!$("dlg").open)cargarPedidos()},30000);

/* Guarda lo que el cliente escribe mientras avanza por los pasos del pago */
var CHKMAP={"c-name":"nombre","c-phone":"tel","c-ffid":"idJuego","c-addr":"addr","c-punto":"punto","c-vid":"vid","c-vname":"vname","c-ref":"ref"};
$("dbox").addEventListener("input",function(e){var k=CHKMAP[e.target.id];if(k)chk[k]=e.target.value});


