/* TIENDA: catÃ¡logo, carrito, cupones y registro del pedido.
   Todos los textos que ve el cliente salen de js/textos.js (funciÃ³n T / TH). */
/* ---------- TIENDA ---------- */
function renderStore(){
  if(ADMIN_PAGE&&!authed){$("app").innerHTML='<div class="empty"><h2>Panel de administraciÃ³n</h2><p>Inicia sesiÃ³n para administrar tu tienda.</p></div>';updateCount();return}
  var qv=$("q")?$("q").value.toLowerCase():"";
  var act=items.filter(function(p){return p.active||authed});
  var cats=[...new Set(act.map(function(p){return p.category}).filter(Boolean))].sort();
  if(cat&&cats.indexOf(cat)<0)cat="";
  var sort=$("sort")?$("sort").value:"new";
  var v=act.filter(function(p){return(!cat||p.category===cat)&&(!tipoF||(p.tipo==="virtual")===(tipoF==="virtual"))&&(!qv||(p.name+" "+p.description).toLowerCase().indexOf(qv)>-1)});
  v.sort(function(a,b){return sort==="low"?eff(a)-eff(b):sort==="high"?eff(b)-eff(a):sort==="offer"?(!!b.offer-!!a.offer):(b.createdAt||0)-(a.createdAt||0)});
  var h='<section class="hero"><h1>'+esc(cfg.lema||cfg.nombre)+'</h1><p>'+esc(T("hero.subtitulo"))+'</p></section>'
   +'<div class="bar"><h2>'+esc(T("catalogo.titulo"))+'</h2><select id="sort" aria-label="'+esc(T("orden.etiqueta"))+'">'
   +[["new","orden.nuevos"],["low","orden.menor"],["high","orden.mayor"],["offer","orden.ofertas"]].map(function(o){return'<option value="'+o[0]+'">'+esc(T(o[1]))+'</option>'}).join("")+'</select></div>';
  if(act.some(function(p){return p.tipo==="virtual"}))h+='<div class="chips">'+[["","filtro.todos"],["fisico","filtro.fisicos"],["virtual","filtro.virtuales"]].map(function(t){return '<button class="chip" aria-pressed="'+(tipoF===t[0])+'" data-t="'+t[0]+'">'+esc(T(t[1]))+'</button>'}).join("")+'</div>';
  if(cats.length)h+='<div class="chips"><button class="chip" aria-pressed="'+(cat==="")+'" data-c="">'+esc(T("filtro.todo"))+'</button>'+cats.map(function(c){return '<button class="chip" aria-pressed="'+(cat===c)+'" data-c="'+esc(c)+'">'+esc(c)+'</button>'}).join("")+'</div>';
  if(!v.length&&!authed)h+='<div class="empty"><h2>'+esc(T(act.length?"vacio.sinResultados":"vacio.sinProductos"))+'</h2><p>'+esc(T(act.length?"vacio.sinResultadosDesc":"vacio.sinProductosDesc"))+'</p></div>';
  else h+='<div class="grid">'+(authed?'<button class="card addcard" data-x="newp">ï¼‹ Agregar producto</button>':'')+v.map(function(p){
    var off=p.offer&&p.offerPrice>0,out=agotado(p),im=safeImg(p.image),pid=esc(p.id);
    return '<article class="card"'+(p.active?'':' style="opacity:.6"')+'><div class="pic">'+(im?'<img src="'+im+'" alt="'+esc(T("producto.fotoAlt",{nombre:p.name}))+'" loading="lazy">':(p.tipo==="virtual"?'âœ¦':esc(T("producto.sinFoto"))))+(p.tipo==="virtual"?'<span class="badge virt">'+esc(T("producto.virtual"))+'</span>':'')+(p.active?'':'<span class="badge" style="background:#555;left:auto;right:10px">Oculto</span>')+(off?'<span class="badge">'+esc(T("producto.oferta"))+'</span>':'')+'</div><div class="info"><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><div class="price">'+(off?'<s>'+fmt.format(p.price)+'</s><b class="o">'+fmt.format(p.offerPrice)+'</b>':'<b>'+fmt.format(p.price)+'</b>')+'</div><button class="btn primary" data-add="'+pid+'"'+(out?' disabled':'')+'>'+esc(T(out?"producto.agotado":"producto.agregar"))+'</button>'+(authed?'<div class="acts admin-acts"><button class="btn sm" data-a="edit" data-id="'+pid+'">Editar</button><button class="btn sm" data-a="vis" data-id="'+pid+'">'+(p.active?"Ocultar":"Mostrar")+'</button><button class="btn sm danger" data-a="del" data-id="'+pid+'">'+(pdel===p.id?"Confirmar":"Eliminar")+'</button></div><div class="meta">Stock: '+(ilim(p)?"ilimitado":(Number(p.stock)||0))+'</div>':'')+'</div></article>'}).join("")+'</div>';
  $("app").innerHTML=h;$("sort").value=sort;$("sort").addEventListener("change",renderStore);updateCount();
}
function updateCount(){var n=0;for(var k in cart)n+=cart[k];if($("count"))$("count").textContent=n}
function lines(){return Object.keys(cart).map(function(id){var p=items.find(function(x){return x.id===id});return p?{p:p,n:cart[id]}:null}).filter(Boolean)}
function discount(){if(!coupon)return 0;var sb=subtotal();return Math.min(sb,coupon.tipo==="pct"?Math.round(sb*coupon.valor/100):coupon.valor)}
function total(){return subtotal()-discount()}
function subtotal(){return lines().reduce(function(a,l){return a+eff(l.p)*l.n},0)}

/* ---------- Carrito y pago ---------- */
var chk={nombre:"",tel:"",idJuego:"",modo:"dom",addr:"",punto:"",vid:"",vname:"",ref:"",pay:""},cupMsg="";
function resetChk(){var sd=Cookies.ok("preferencias")?lsGet("tienda_datos",{}):{};chk={nombre:String(sd.n||""),tel:String(sd.t||""),idJuego:"",modo:"dom",addr:"",punto:"",vid:"",vname:"",ref:"",pay:""};compImg="";cupMsg=""}
resetChk();
function ico(m){return m.tipo==="efectivo"?"ðŸ’µ":m.tipo==="link"?"ðŸ’³":"ðŸ“²"}
function esV(l){return l.p.tipo==="virtual"}
function disponibles(L){var hv=L.some(esV);return pagos().filter(function(m){return!(m.tipo==="efectivo"&&hv)&&!(m.tipo==="link"&&!safeUrl(m.enlace))&&!(m.tipo==="transfer"&&!m.cuenta&&!safeImg(m.qr))})}
function stepper(n){return'<div class="steps">'+["paso.carrito","paso.datos","paso.pago"].map(function(k,i){return'<span class="stp'+(i+1===n?" on":"")+(i+1<n?" done":"")+'"><b>'+(i+1<n?"âœ“":i+1)+'</b>'+esc(T(k))+'</span>'}).join("")+'</div>'}
function validarDatos(L){
  var hv=L.some(esV),hp=L.some(function(l){return!esV(l)}),f=[];
  if(!chk.nombre.trim())f.push(T("falta.nombre"));if(!chk.tel.trim())f.push(T("falta.celular"));
  if(hp&&chk.modo==="dom"&&!chk.addr.trim())f.push(T("falta.direccion"));
  if(hp&&chk.modo==="punto"&&!chk.punto.trim())f.push(T("falta.punto"));
  if(hv&&!chk.vid.trim())f.push(T("falta.cuentaId"));if(hv&&!chk.vname.trim())f.push(T("falta.cuentaNombre"));
  return f;
}
function copiar(txt,btn){
  var ok=function(){var o=btn.textContent;btn.textContent=T("pago.copiado");setTimeout(function(){btn.textContent=o},1400)};
  var fb=function(){var t=document.createElement("textarea");t.value=txt;document.body.appendChild(t);t.select();try{document.execCommand("copy");ok()}catch(e){}document.body.removeChild(t)};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fb);else fb();
}
function detallePago(m){
  var h='<div class="paybox">',qr=safeImg(m.qr),lk=safeUrl(m.enlace);
  if(m.tipo==="efectivo")h+='<div>'+esc(m.instr||T("pago.efectivoDefecto"))+'</div>';
  else{
    if(m.tipo==="transfer"){
      if(m.cuenta)h+='<div class="meta">'+esc(T("pago.envia"))+'</div><div class="acct"><span>'+esc(m.cuenta)+'</span><button class="btn sm" data-copy="'+esc(m.cuenta)+'">'+esc(T("pago.copiar"))+'</button></div>'+(m.titular?'<div class="meta">'+esc(T("pago.aNombre",{titular:m.titular}))+'</div>':'');
      if(qr)h+='<img class="qr" src="'+qr+'" alt="'+esc(T("pago.qrAlt"))+'">';
    }
    if(m.tipo==="link"&&lk)h+='<a class="btn primary" href="'+esc(lk)+'" target="_blank" rel="noopener noreferrer">'+esc(T("pago.enLinea"))+'</a>';
    if(m.instr)h+='<div class="meta">'+esc(m.instr)+'</div>';
    h+='<div class="meta">'+esc(T("pago.valorExacto"))+' <b>'+fmt.format(total())+'</b> <button class="btn sm" data-copy="'+total()+'">'+esc(T("pago.copiarValor"))+'</button></div>';
    h+='<div class="meta">'+esc(T("pago.cuandoPagues"))+'</div><div class="f"><input id="c-ref" maxlength="100" placeholder="'+esc(T("pago.referencia"))+'" value="'+esc(chk.ref)+'"><label>'+esc(T("pago.captura"))+'<input id="c-file" type="file" accept="image/*"></label><div class="meta" id="c-fmsg">'+(compImg?esc(T("pago.capturaLista")):"")+'</div></div>';
  }
  return h+'</div>';
}
function avisoWhatsApp(){return cfg.whatsapp?'<p class="meta"><a href="https://wa.me/'+esc(String(cfg.whatsapp).replace(/\D/g,""))+'" target="_blank" rel="noopener noreferrer">'+esc(T("cerrada.dudas"))+'</a></p>':'<p class="meta">'+esc(T("cerrada.dudas"))+'</p>'}
function drawCart(){
  var L=lines(),b=$("dbox"),hv=L.some(esV),hp=L.some(function(l){return!esV(l)});
  if(!L.length){b.innerHTML='<h2>'+esc(T("carrito.titulo"))+'</h2><p class="meta">'+esc(T("carrito.vacio"))+'</p><div class="foot"><button class="btn" data-x="close">'+esc(T("carrito.cerrar"))+'</button></div>';return}
  if(step==="cart"){
    b.innerHTML=stepper(1)+'<h2>'+esc(T("carrito.titulo"))+'</h2>'+L.map(function(l){return'<div class="line"><div class="n"><b>'+esc(l.p.name)+'</b>'+(esV(l)?' <span class="tag">'+esc(T("producto.virtual"))+'</span>':'')+'<div class="meta">'+fmt.format(eff(l.p))+'</div></div><div class="qty"><button data-q="-1" data-id="'+esc(l.p.id)+'" aria-label="'+esc(T("carrito.quitar"))+'">âˆ’</button><span>'+l.n+'</span><button data-q="1" data-id="'+esc(l.p.id)+'" aria-label="'+esc(T("carrito.agregar"))+'">+</button></div></div>'}).join("")
     +'<div class="line"><input id="c-cup" maxlength="40" placeholder="'+esc(T("carrito.cupon"))+'" value="'+(coupon?esc(coupon.codigo):'')+'"><button class="btn" data-x="cup">'+esc(T("carrito.aplicar"))+'</button></div><div class="meta">'+esc(cupMsg)+'</div>'
     +(discount()>0?'<div class="line meta"><span>'+esc(T("carrito.subtotal"))+'</span><span>'+fmt.format(subtotal())+'</span></div><div class="line meta"><span>'+esc(T("carrito.descuento"))+'</span><span>-'+fmt.format(discount())+'</span></div>':'')
     +'<div class="line total"><span>'+esc(T("carrito.total"))+'</span><span>'+fmt.format(total())+'</span></div>'
     +(Backend.ready?'':'<p class="err">'+esc(T("cerrada.aviso"))+'</p>'+avisoWhatsApp())
     +'<div class="foot"><button class="btn" data-x="close">'+esc(T("carrito.seguir"))+'</button><button class="btn primary" data-x="to-datos"'+(Backend.ready?'':' disabled')+'>'+esc(T("carrito.continuar"))+'</button></div>';
  }else if(step==="datos"){
    var pts=(cfg.puntos||"").split("\n").map(function(x){return x.trim()}).filter(Boolean);
    b.innerHTML=stepper(2)+'<h2>'+esc(T("datos.titulo"))+'</h2><div class="f"><input id="c-name" maxlength="80" placeholder="'+esc(T("datos.nombre"))+'" autocomplete="name" value="'+esc(chk.nombre)+'"><input id="c-phone" maxlength="20" placeholder="'+esc(T("datos.celular"))+'" inputmode="tel" autocomplete="tel" value="'+esc(chk.tel)+'"></div>' +(L.some(function(l){return l.p.category==="diamantes"})?'<div class="f"><input id="c-ffid" maxlength="20" inputmode="numeric" placeholder="ID de jugador de Free Fire" value="'+esc(chk.idJuego)+'"></div>':')
     +(hp?'<div class="meta">'+esc(T("datos.comoRecibir"))+'</div><div class="paygrid"><button class="paytile'+(chk.modo==="dom"?' on':'')+'" data-modo="dom"><span class="ico">ðŸ </span><b>'+esc(T("datos.domicilio"))+'</b></button><button class="paytile'+(chk.modo==="punto"?' on':'')+'" data-modo="punto"><span class="ico">ðŸ“</span><b>'+esc(T("datos.recoger"))+'</b></button></div>'
        +(chk.modo==="dom"?'<textarea id="c-addr" rows="2" maxlength="300" placeholder="'+esc(T("datos.direccion"))+'">'+esc(chk.addr)+'</textarea>':'<input id="c-punto" maxlength="150" list="c-puntos" placeholder="'+esc(T("datos.punto"))+'" value="'+esc(chk.punto)+'"><datalist id="c-puntos">'+pts.map(function(x){return'<option value="'+esc(x)+'">'}).join("")+'</datalist>'):'')
     +(hv?'<div class="meta">'+esc(T("datos.cuentaTitulo"))+'</div><div class="f"><input id="c-vid" maxlength="60" placeholder="'+esc(T("datos.cuentaId"))+'" value="'+esc(chk.vid)+'"><input id="c-vname" maxlength="80" placeholder="'+esc(T("datos.cuentaNombre"))+'" value="'+esc(chk.vname)+'"></div><p class="meta">'+esc(T("datos.cuentaAviso"))+'</p>':'')
     +'<div class="err" id="err"></div><div class="foot"><button class="btn" data-x="back-cart">'+esc(T("datos.volver"))+'</button><button class="btn primary" data-x="to-pago">'+esc(T("carrito.continuar"))+'</button></div>';
  }else{
    var P=disponibles(L);if(!P.some(function(x){return x.id===chk.pay}))chk.pay=P.length?P[0].id:"";
    var m=P.find(function(x){return x.id===chk.pay});
    b.innerHTML=stepper(3)+'<h2>'+esc(T("pago.titulo"))+'</h2><div class="paytotal"><span>'+esc(T("pago.totalAPagar"))+'</span><b>'+fmt.format(total())+'</b></div>'
     +(P.length?'<div class="paygrid">'+P.map(function(x){return'<button class="paytile'+(x.id===chk.pay?' on':'')+'" data-pm="'+esc(x.id)+'"><span class="ico">'+ico(x)+'</span><b>'+esc(x.nombre)+'</b></button>'}).join("")+'</div>'+detallePago(m):'<p class="err">'+esc(T("pago.sinMetodos"))+'</p>')
     +'<div class="err" id="err"></div><div class="foot"><button class="btn" data-x="back-datos">'+esc(T("datos.volver"))+'</button><button class="btn primary" data-x="send"'+(P.length&&Backend.ready?'':' disabled')+'>'+esc(T("pago.confirmar"))+'</button></div>';
    if($("c-file"))$("c-file").addEventListener("change",function(){if(!this.files[0])return;$("c-fmsg").textContent=T("pago.procesando");resizeImg(this.files[0],900,"image/jpeg",function(u){compImg=u;$("c-fmsg").textContent=T("pago.capturaLista")})});
  }
}
function sendOrder(){
  if(!Backend.ready)return;
  var L=lines(),hv=L.some(esV),hp=L.some(function(l){return!esV(l)});
  var m=disponibles(L).find(function(x){return x.id===chk.pay}),f=validarDatos(L);
  if(!m)f.push(T("falta.formaPago"));else if(m.tipo!=="efectivo"&&!chk.ref.trim()&&!compImg)f.push(T("falta.referencia"));
  if(f.length){$("err").textContent=T("falta.prefijo",{lista:f.join(", ")});return}
  var o={id:uid(),fecha:Date.now(),estado:"Pendiente",nombre:chk.nombre.trim(),tel:chk.tel.trim(),
    items:L.map(function(l){return{id:l.p.id,n:l.p.name,q:l.n,pr:eff(l.p),v:esV(l),puntos:l.p.puntosPersonalizados?Math.max(0,Math.floor(Number(l.p.puntosCompra)||0)):null}}),
    subtotal:subtotal(),descuento:discount(),cupon:coupon?coupon.codigo:"",total:total(),
    pago:m.nombre,pagoId:m.id,referencia:chk.ref.trim(),comprobante:m.tipo==="efectivo"?"":compImg,
    dir:hp&&chk.modo==="dom"?chk.addr.trim():"",punto:hp&&chk.modo==="punto"?chk.punto.trim():"",
    cuenta:hv?{id:chk.vid.trim(),nombre:chk.vname.trim()}:null};
  var btn=document.querySelector('[data-x=send]');btn.disabled=true;btn.textContent=T("pago.enviando");
  Backend.crear(o).then(function(){
    recordarDatos(o.nombre,o.tel);cart={};coupon=null;resetChk();lsSet("tienda_carrito",cart);step="cart";renderStore();
    var num='<b>#'+esc(o.id.slice(-6).toUpperCase())+'</b>',wa=String(cfg.whatsapp||"").replace(/\D/g,"");
    $("dbox").innerHTML='<div class="okmark">âœ“</div><h2>'+esc(T("ok.titulo"))+'</h2><p>'+TH(m.tipo==="efectivo"?"ok.cuerpoEfectivo":"ok.cuerpoPago",{num:num})+'</p>'
      +(hv?'<p class="meta">'+esc(T("ok.virtual"))+'</p>':'')+ptsAviso(o.total)
      +(Backend.remote?'':'<p class="err">'+esc(T("ok.pruebaLocal"))+'</p>')
      +(wa?'<p class="meta">'+TH("ok.dudas",{enlace:'<a href="https://wa.me/'+wa+'" target="_blank" rel="noopener noreferrer">'+esc(T("ok.dudasEnlace"))+'</a>'})+'</p>':'')
      +'<div class="foot"><button class="btn primary" data-x="close">'+esc(T("carrito.cerrar"))+'</button></div>';
  }).catch(function(e){btn.disabled=false;btn.textContent=T("pago.confirmar");$("err").textContent=T(/demasiados/i.test(e&&e.message||"")?"pago.errorDemasiados":"pago.errorEnvio")});
}
function applyCoupon(){
  var c=$("c-cup").value.trim().toUpperCase(),k=(cfg.cupones||[]).find(function(x){return x.activo&&x.codigo===c});
  var fin=function(cp,msg){coupon=cp;cupMsg=msg;drawCart()};
  if(!c)return fin(null,"");
  if(k)return fin(k,T("carrito.cuponOk"));
  if(!Backend.remote)return fin(null,T("carrito.cuponNo"));
  /* Cupones de la ruleta: se validan en la base de datos (son de un solo uso). */
  Backend.rpc("validar_premio",{p_codigo:c}).then(function(r){
    if(r&&(r.tipo==="pct"||r.tipo==="fijo")&&Number(r.valor)>0)fin({codigo:c,tipo:r.tipo,valor:Number(r.valor),activo:true},T("carrito.cuponOk"));else fin(null,T("carrito.cuponNo"));
  }).catch(function(){fin(null,T("carrito.cuponNo"))});
}
