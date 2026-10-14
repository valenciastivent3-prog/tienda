/* ADMINISTRACIÓN: productos, ofertas, pedidos, clientes, cupones, ajustes y respaldo */
/* ---------- ADMINISTRACIÓN ---------- */
function renderAdmin(){
  /* __ADMIN_TABS_FIX_FINAL__ */
  if(!window.__adminTabsFixFinal){
    window.__adminTabsFixFinal=true;

    document.addEventListener("click",function(e){
      var b=e.target.closest("#panel [data-tab]");
      if(!b)return;

      e.preventDefault();

      atab=b.dataset.tab;

      renderAdmin();
    });
  }

  if(!authed){$("panel").innerHTML="";return}
  var pend=orders.filter(function(o){return estadoDe(o)==="Pendiente"}).length;
  var sales=orders.filter(function(o){return estadoDe(o)==="Pagado"||estadoDe(o)==="Entregado"}).reduce(function(a,o){return a+o.total},0);
  var h='<div class="stats">'+[[items.length,"Productos"],[items.filter(function(p){return p.offer}).length,"En oferta"],[items.filter(function(p){return p.active}).length,"Visibles"],[items.filter(function(p){return !ilim(p)&&(p.stock||0)<=3}).length,"Con poco stock"],[fmt.format(sales),"Ventas confirmadas"],[pend,"Pedidos pendientes"]].map(function(s){return '<div class="stat"><b>'+s[0]+'</b><span class="meta">'+s[1]+'</span></div>'}).join("")+'</div>';
  h+='<div class="tabs">'+[["orders","Pedidos"+(pend?" ("+pend+")":"")],["customers","Clientes"],["loyalty","Puntos y ruleta"],["coupons","Cupones"],["pay","Pagos"],["settings","Ajustes"],["backup","Respaldo"]].map(function(t){return '<button class="chip" aria-pressed="'+(atab===t[0])+'" data-tab="'+t[0]+'">'+t[1]+'</button>'}).join("")+'<button class="chip" data-x="newp">&#65291; Agregar producto</button><button class="chip" data-x="logout">Salir</button></div>';
  if(!atab){$("panel").innerHTML=h;return}
  if(atab==="orders"){
    var F=[["Pendiente","Pendientes"],["Pagado","Por entregar"],["Entregado","Entregados"],["Cancelado","Cancelados"],["","Todos"]];
    var cnt=function(e){return orders.filter(function(o){return!e||estadoDe(o)===e}).length};
    if(!Backend.remote)h+='<div class="msg">Modo de prueba: los pedidos se guardan solo en este navegador. Para recibir los pedidos de tus clientes aquí, configura la base de datos (README, "Pedidos en línea").</div>';
    if(ordersErr)h+='<div class="msg err">'+esc(ordersErr)+'</div>';
    h+='<div class="bar"><div class="chips" style="margin:0">'+F.map(function(f){return '<button class="chip" aria-pressed="'+(pedidoFiltro===f[0])+'" data-pf="'+f[0]+'">'+f[1]+' ('+cnt(f[0])+')</button>'}).join("")+'</div><span><button class="btn" id="orefresh">Actualizar</button> <button class="btn primary" id="onew">Registrar pedido</button></span></div>';
    var vis=orders.filter(function(o){return!pedidoFiltro||estadoDe(o)===pedidoFiltro});
    h+=vis.length?'<div class="list">'+vis.map(orderRow).join("")+'</div>':'<div class="empty"><h2>'+(pedidoFiltro==="Pendiente"?"No tienes pedidos pendientes":"No hay pedidos aquí")+'</h2><p>'+(pedidoFiltro==="Pendiente"?"Cuando un cliente haga un pedido, aparecerá aquí para que confirmes su pago.":"Cambia el filtro para ver otros pedidos.")+'</p></div>';
    $("panel").innerHTML=h;
    $("onew").addEventListener("click",openOrder);
    $("orefresh").addEventListener("click",cargarPedidos);
    document.querySelectorAll("[data-od]").forEach(function(el){el.addEventListener("click",function(){var id=el.dataset.od;if(pdel!==id){pdel=id;renderAdmin();return}pdel=null;Backend.eliminar(id).then(function(){orders=orders.filter(function(o){return o.id!==id});ordersErr="";renderAdmin()}).catch(function(e){ordersErr="No se pudo eliminar: "+e.message;renderAdmin()})})});
    return;
  }
  if(atab==="customers"){
    var mp={};orders.filter(function(o){return estadoDe(o)==="Pagado"||estadoDe(o)==="Entregado"}).forEach(function(o){var k=o.tel||o.nombre,c=mp[k]=mp[k]||{n:o.nombre,t:o.tel,d:o.dir,c:0,s:0};c.c++;c.s+=o.total;c.d=o.dir||o.punto||c.d});
    var cs=Object.keys(mp).map(function(k){return mp[k]}).sort(function(a,b){return b.s-a.s});
    h+=cs.length?'<div class="list">'+cs.map(function(c){return '<div class="row" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between"><div><b>'+esc(c.n)+'</b><div class="meta">'+esc(c.t)+' • '+esc(c.d)+'</div></div><div class="meta">'+c.c+' pedido(s)</div><b>'+fmt.format(c.s)+'</b></div>'}).join("")+'</div>':'<div class="empty"><h2>Aún no hay clientes</h2><p>Los clientes aparecen aquí cuando registras pedidos.</p></div>';
    $("panel").innerHTML=h;return;
  }
  if(atab==="coupons"){
    var cu=cfg.cupones||[];
    h+='<div class="box" style="padding:0 0 18px;max-width:560px"><div class="two"><label>Código<input id="k-c" placeholder="BIENVENIDO10"></label><label>Tipo<select id="k-t"><option value="pct">Porcentaje (%)</option><option value="fijo">Valor fijo</option></select></label></div><label>Valor<input id="k-v" type="number" min="1"></label><div class="foot"><span class="err" id="kerr"></span><button class="btn primary" id="kadd">Crear cupón</button></div></div>';
    h+=cu.length?'<div class="list">'+cu.map(function(k,i){return '<div class="row" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between"><div><b>'+esc(k.codigo)+'</b><span class="tag'+(k.activo?' off':'')+'">'+(k.activo?"Activo":"Pausado")+'</span><div class="meta">'+(k.tipo==="pct"?k.valor+"% de descuento":fmt.format(k.valor)+" de descuento")+'</div></div><div class="acts"><button class="btn sm" data-kt="'+i+'">'+(k.activo?"Pausar":"Activar")+'</button><button class="btn sm danger" data-kd="'+i+'">Eliminar</button></div></div>'}).join("")+'</div>':'<div class="empty"><h2>Aún no hay cupones</h2><p>Crea uno y tus clientes lo escriben al pagar.</p></div>';
    $("panel").innerHTML=h;
    var sv=function(){cfg=Object.assign({},cfg,{cupones:cu});guardarCfg();renderAdmin()};
    $("kadd").addEventListener("click",function(){var c=$("k-c").value.trim().toUpperCase(),v=Number($("k-v").value),t=$("k-t").value;
      if(!c||!(v>0)||(t==="pct"&&v>100)||cu.some(function(x){return x.codigo===c})){$("kerr").textContent="Revisa el código (único) y el valor.";return}
      cu.push({codigo:c,tipo:t,valor:v,activo:true});sv()});
    document.querySelectorAll("[data-kt]").forEach(function(b){b.addEventListener("click",function(){cu[b.dataset.kt].activo=!cu[b.dataset.kt].activo;sv()})});
    document.querySelectorAll("[data-kd]").forEach(function(b){b.addEventListener("click",function(){cu.splice(Number(b.dataset.kd),1);sv()})});
    return;
  }
  if(atab==="pay"){
    var ms=metodos();
    if(ms.some(function(m){return m.activo!==false&&((m.tipo==="transfer"&&!m.cuenta&&!m.qr)||(m.tipo==="link"&&!m.enlace))}))h+='<div class="msg err">Hay métodos activos sin configurar: no se mostrarín a tus clientes hasta que agregues su número, cuenta o enlace.</div>';
    h+='<div class="bar"><span class="meta">Elige cómo te pueden pagar tus clientes. Los cambios se ven al instante en el pago.</span><button class="btn primary" id="madd">Agregar método</button></div>';
    h+='<div class="list">'+ms.map(function(m,i){
      var falta=(m.tipo==="transfer"&&!m.cuenta&&!m.qr)||(m.tipo==="link"&&!m.enlace);
      var det=m.tipo==="efectivo"?"Contra entrega (efectivo)":m.tipo==="link"?"Enlace de pago en línea":"Cuenta o billetera: "+esc(m.cuenta||(m.qr?"solo QR":"—"));
      return '<div class="row" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center"><div><b>'+ico(m)+' '+esc(m.nombre)+'</b><span class="tag'+(m.activo!==false?' off':'')+'">'+(m.activo!==false?"Activo":"Apagado")+'</span><div class="meta">'+det+(falta?' • <span style="color:var(--danger)">Falta configurar</span>':'')+'</div></div><div class="acts" style="flex-wrap:wrap"><button class="btn sm" data-mv="-1" data-i="'+i+'" aria-label="Subir">▲</button><button class="btn sm" data-mv="1" data-i="'+i+'" aria-label="Bajar">▼</button><button class="btn sm" data-mt="'+i+'">'+(m.activo!==false?"Apagar":"Activar")+'</button><button class="btn sm" data-me="'+i+'">Editar</button><button class="btn sm danger" data-md="'+i+'">'+(pdel==="m"+i?"Confirmar":"Eliminar")+'</button></div></div>'}).join("")+'</div>';
    $("panel").innerHTML=h;
    var cp=function(){return metodos().map(function(x){return Object.assign({},x)})};
    $("madd").addEventListener("click",function(){openMetodo(-1)});
    document.querySelectorAll("[data-me]").forEach(function(b){b.addEventListener("click",function(){openMetodo(Number(b.dataset.me))})});
    document.querySelectorAll("[data-mt]").forEach(function(b){b.addEventListener("click",function(){var l=cp(),x=l[Number(b.dataset.mt)];x.activo=x.activo===false;svm(l)})});
    document.querySelectorAll("[data-mv]").forEach(function(b){b.addEventListener("click",function(){var l=cp(),i=Number(b.dataset.i),j=i+Number(b.dataset.mv);if(j<0||j>=l.length)return;var t=l[i];l[i]=l[j];l[j]=t;svm(l)})});
    document.querySelectorAll("[data-md]").forEach(function(b){b.addEventListener("click",function(){var i=Number(b.dataset.md);if(pdel!=="m"+i){pdel="m"+i;renderAdmin();return}pdel=null;var l=cp();l.splice(i,1);svm(l)})});
    return;
  }
  if(atab==="loyalty"){renderLoyalty(h);return}
  if(atab==="settings"){
    h+='<div class="box" style="padding:0;max-width:560px"><label>Nombre de la tienda<input id="s-nombre"></label><label>Lema de bienvenida<input id="s-lema"></label><label>WhatsApp de contacto para tus clientes (con código de país, sin +)<input id="s-wa" inputmode="numeric"></label><div class="two"><label>Color principal<input id="s-color" type="color" style="height:42px;padding:4px"></label><label>Logo (opcional)<input id="s-logo" type="file" accept="image/*"></label></div><label class="chk"><input id="s-nologo" type="checkbox"> Quitar el logo actual</label><label>Clave de administración (solo se usa sin base de datos)<input id="s-clave"></label><label>Puntos de recogida sugeridos (uno por línea)<textarea id="s-puntos" rows="3" placeholder="Parque principal, sábados 3 pm"></textarea></label><div class="foot"><span class="meta" id="smsg"></span><button class="btn primary" id="ssave">Guardar ajustes</button></div></div>';
    $("panel").innerHTML=h;
    $("s-nombre").value=cfg.nombre;$("s-wa").value=cfg.whatsapp;$("s-clave").value=cfg.claveAdmin;$("s-lema").value=cfg.lema||"";$("s-puntos").value=cfg.puntos||"";$("s-color").value=cfg.color||"#ff7a3d";newLogo=undefined;
    $("s-logo").addEventListener("change",function(){if(this.files[0])resizeImg(this.files[0],300,"image/png",function(u){newLogo=u;$("smsg").textContent="Logo listo. Guarda los ajustes."})});
    $("s-nologo").addEventListener("change",function(){if(this.checked)newLogo=""});
    $("ssave").addEventListener("click",function(){
      var wa=$("s-wa").value.replace(/\D/g,""),cl=$("s-clave").value.trim();
      if(!$("s-nombre").value.trim()||wa.length<8||!cl){$("smsg").textContent="Revisa nombre, WhatsApp y clave.";return}
      cfg=Object.assign({},cfg,{nombre:$("s-nombre").value.trim(),whatsapp:wa,claveAdmin:cl,lema:$("s-lema").value.trim(),puntos:$("s-puntos").value.trim(),color:$("s-color").value,logo:newLogo===undefined?cfg.logo:newLogo});
      guardarCfg();applyTheme();renderTop();$("smsg").textContent="Guardado.";
    });
    return;
  }
  if(atab==="backup"){
    h+='<div class="box" style="padding:0"><p class="meta">Tus productos se guardan solo en este navegador. Para que los vea todo el mundo, copia este respaldo y pégalo en <b>DATOS_INICIALES</b> dentro del archivo (reemplazando las llaves vacías). Incluye tus productos y tus ajustes. También puedes pegar un respaldo aquí para restaurarlo.</p><textarea id="bk" rows="10" spellcheck="false">'+esc(JSON.stringify({config:(function(){var c=Object.assign({},cfg);delete c.claveAdmin;return c})(),productos:items}))+'</textarea><div class="foot"><button class="btn" id="bkcopy">Copiar respaldo</button><button class="btn primary" id="bkload">Restaurar desde el texto</button></div><div class="meta" id="bkmsg"></div></div>';
    $("panel").innerHTML=h;
    $("bkcopy").addEventListener("click",function(){$("bk").select();try{document.execCommand("copy");$("bkmsg").textContent="Copiado."}catch(e){$("bkmsg").textContent="Selecciona el texto y cópialo."}});
    $("bkload").addEventListener("click",function(){try{var d=JSON.parse($("bk").value);var pr=Array.isArray(d)?d:d.productos;if(!Array.isArray(pr))throw 0;items=pr.map(limpiarProducto);if(d.config&&typeof d.config==="object"){var dc=Object.assign({},d.config);delete dc.supabase;delete dc.claveAdmin;cfg=Object.assign({},cfg,dc);guardarCfg()}persist();$("bkmsg").textContent="Restaurado: "+pr.length+" productos.";renderAdmin()}catch(e){$("bkmsg").textContent="El texto no es un respaldo vílido."}});
    return;
  }
  $("panel").innerHTML=h;
}

function openForm(p){
  editing=p||null;img=p&&p.image||"";
  var cats=[...new Set(items.map(function(x){return x.category}).filter(Boolean))];
  $("dbox").innerHTML='<h2>'+(p?"Editar producto":"Nuevo producto")+'</h2><label>Tipo de producto<select id="f-tipo"><option value="fisico">Físico (se envía)</option><option value="virtual">Virtual (diamantes, códigos, servicios…)</option></select></label><label>Nombre<input id="f-name" maxlength="80"></label><label>Descripción<textarea id="f-desc" rows="3" maxlength="500"></textarea></label><div class="two"><label>Precio<input id="f-price" type="number" min="0" step="100"></label><label>Stock disponible<input id="f-stock" type="number" min="0" step="1"></label></div><div id="f-vbox" class="f" style="display:none"><p class="meta" style="margin:0">Al comprar, el cliente escribirá el ID y el nombre de su cuenta.</p><label class="chk"><input id="f-ilim" type="checkbox"> Stock ilimitado</label></div><label>Categoría<input id="f-cat" list="cl" maxlength="40"><datalist id="cl">'+cats.map(function(c){return '<option value="'+esc(c)+'">'}).join("")+'</datalist></label><div class="imgrow"><img class="thumb" id="f-thumb" alt=""><div><input id="f-file" type="file" accept="image/*"><div class="meta" id="f-imsg"></div></div></div><div class="two"><label class="chk"><input id="f-offer" type="checkbox"> Producto en oferta</label><label>Precio de oferta<input id="f-op" type="number" min="0" step="100"></label></div><label class="chk"><input id="f-active" type="checkbox"> Visible en la tienda</label><div class="err" id="ferr"></div><div class="foot"><button class="btn" data-x="close">Cancelar</button><button class="btn primary" data-x="save">Guardar</button></div>';
  $("f-name").value=p?p.name:"";$("f-desc").value=p?p.description:"";$("f-price").value=p?p.price:"";$("f-stock").value=p?p.stock:"";
  $("f-cat").value=p?p.category:"";$("f-offer").checked=!!(p&&p.offer);$("f-op").value=p&&p.offerPrice?p.offerPrice:"";$("f-active").checked=p?p.active:true;
  $("f-tipo").value=p&&p.tipo||"fisico";$("f-ilim").checked=p?!!p.ilimitado:true;
  var tu=function(){var v=$("f-tipo").value==="virtual";$("f-vbox").style.display=v?"grid":"none";$("f-stock").disabled=v&&$("f-ilim").checked;$("f-name").placeholder=v?"Ej: 500 diamantes":""};
  $("f-tipo").addEventListener("change",tu);$("f-ilim").addEventListener("change",tu);tu();
  $("f-thumb").src=img;$("f-thumb").style.visibility=img?"visible":"hidden";
  $("f-file").addEventListener("change",function(){
    var f=this.files[0];if(!f)return;$("f-imsg").textContent="Procesando imagen…";
    var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){
      var s=Math.min(1,700/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);img=c.toDataURL("image/jpeg",0.78);
      $("f-thumb").src=img;$("f-thumb").style.visibility="visible";$("f-imsg").textContent="Imagen lista.";
    };im.onerror=function(){$("f-imsg").textContent="No se pudo leer la imagen."};im.src=r.result};r.readAsDataURL(f);
  });
  $("dlg").showModal();
}
function saveForm(){
  var name=$("f-name").value.trim(),price=Number($("f-price").value),off=$("f-offer").checked,op=Number($("f-op").value)||0;
  if(!name){$("ferr").textContent="Escribe el nombre del producto.";return}
  if(!(price>0)){$("ferr").textContent="Escribe un precio mayor a 0.";return}
  if(off&&!(op>0&&op<price)){$("ferr").textContent="El precio de oferta debe ser menor al precio normal.";return}
  var d={id:editing?editing.id:uid(),name:name,description:$("f-desc").value.trim(),price:price,stock:Number($("f-stock").value)||0,tipo:$("f-tipo").value,ilimitado:$("f-tipo").value==="virtual"&&$("f-ilim").checked,category:$("f-cat").value.trim(),offer:off,offerPrice:off?op:0,active:$("f-active").checked,image:img,createdAt:editing?editing.createdAt:Date.now()};
  if(editing)items[items.indexOf(editing)]=d;else items.push(d);
  persist();$("dlg").close();refresh();
}
function askPin(){
  var rem=Backend.remote;
  $("dbox").innerHTML='<h2>'+esc(T("login.titulo"))+'</h2>'+(rem?'<label>'+esc(T("login.correo"))+'<input id="ml" type="email" autocomplete="username"></label><label>'+esc(T("login.contrasena"))+'<input id="pin" type="password" autocomplete="current-password"></label>':'<label>'+esc(T("login.clave"))+'<input id="pin" type="password" autocomplete="current-password"></label>')+'<div class="err" id="perr"></div><div class="foot"><button class="btn" data-x="close">'+esc(T("login.cancelar"))+'</button><button class="btn primary" data-x="pin">'+esc(T("login.entrar"))+'</button></div>';
  $("dlg").showModal();(rem?$("ml"):$("pin")).focus();
  $("pin").addEventListener("keydown",function(e){if(e.key==="Enter")checkPin()});
}
function checkPin(){
  var entrar=function(){authed=true;$("dlg").close();renderAll();(REMOTO?cargarCatalogo():Promise.resolve()).then(cargarPedidos).catch(function(e){ordersErr=String(e&&e.message||e);renderAdmin()})};
  if(Backend.remote){$("perr").textContent=T("login.entrando");Backend.login($("ml").value.trim(),$("pin").value).then(entrar).catch(function(e){$("perr").textContent=e.message})}
  else if($("pin").value===cfg.claveAdmin)entrar();
  else $("perr").textContent=T("login.claveMala");
}
function cargarPedidos(){return Backend.listar().then(function(l){orders=l;ordersErr="";renderAdmin()}).catch(function(e){ordersErr="No se pudieron cargar los pedidos: "+(e&&e.message||e);renderAdmin()})}
function orderRow(o){
  var e=estadoDe(o),solo=o.items.every(function(i){return i.v}),b="";
  var ent=o.punto?"Recoger en: "+esc(o.punto):(o.dir?"Domicilio: "+esc(o.dir):"");
  if(e==="Pendiente")b+='<button class="btn sm primary" data-oa="pagado" data-id="'+esc(o.id)+'">Confirmar pago</button>';
  if(e==="Pagado")b+='<button class="btn sm primary" data-oa="entregado" data-id="'+esc(o.id)+'">'+(solo?"Marcar recargado":"Marcar entregado")+'</button>';
  if(e==="Pendiente"||e==="Pagado")b+='<button class="btn sm danger" data-oa="cancelar" data-id="'+esc(o.id)+'">Cancelar pedido</button>';
  b+='<button class="btn sm danger" data-od="'+esc(o.id)+'">'+(pdel===o.id?"Confirmar":"Eliminar")+'</button>';
  return '<div class="row order"><div class="line"><div><b>'+esc(o.nombre)+'</b> <span class="meta">'+esc(o.tel)+' • '+new Date(o.fecha).toLocaleString("es-CO")+' • #'+esc(String(o.id).slice(-6).toUpperCase())+'</span></div><span class="tag'+(e==="Pendiente"?" off":"")+" st-"+e.toLowerCase()+'">'+esc(e)+'</span></div>'
   +reciboTabla(o)
   +(ent?'<div class="meta">'+ent+'</div>':'')
   +(o.idJuego?'<div class="meta">ID de Free Fire: <b>'+esc(o.idJuego)+'</b></div>':'')
   +(o.cuenta?'<div class="cuenta">Cuenta a recargar — ID: <b>'+esc(o.cuenta.id)+'</b> • Nombre: <b>'+esc(o.cuenta.nombre)+'</b></div>':'')
   +'<div class="meta">Pago: '+esc(o.pago||"")+(o.referencia?' • Ref: '+esc(o.referencia):'')+(o.cupon?' • Cupón '+esc(o.cupon):'')+' • <b>'+fmt.format(o.total)+'</b></div>'
   +(safeImg(o.comprobante)?'<img class="comp" src="'+safeImg(o.comprobante)+'" alt="Comprobante de pago" title="Clic para ampliar">':'')
   +'<div class="acts" style="flex-wrap:wrap">'+b+'</div></div>';
}
function cambiarEstado(id,acc){
  var o=orders.find(function(x){return x.id===id});if(!o)return;
  var nuevo={pagado:"Pagado",entregado:"Entregado",cancelar:"Cancelado"}[acc],copia=Object.assign({},o,{estado:nuevo}),mover=0;
  if(acc==="pagado"&&!o.desc){copia.desc=true;mover=-1}
  if(acc==="cancelar"&&o.desc){copia.desc=false;mover=1}
  Backend.actualizar(copia).then(function(){
    Object.assign(o,copia);
    if(mover)o.items.forEach(function(i){var p=items.find(function(x){return x.id===i.id});if(p&&!ilim(p))p.stock=Math.max(0,(p.stock||0)+mover*i.q)});
    if(mover)persist();ordersErr="";refresh();
  }).catch(function(e){ordersErr="No se pudo actualizar el pedido: "+e.message;renderAdmin()});
}

function openOrder(){
  if(!items.length){alert("Primero agrega productos.");return}
  $("dbox").innerHTML='<h2>Registrar pedido</h2><div class="two"><label>Nombre<input id="o-n"></label><label>Celular<input id="o-t" inputmode="tel"></label></div><label>Dirección<input id="o-d"></label><label>Forma de pago<select id="o-p"><option>Pago contra entrega</option><option>Nequi</option><option>Transferencia bancaria</option><option>Otro</option></select></label><div class="meta">Productos (cantidad)</div>'+items.map(function(p){return '<div class="line"><span class="n">'+esc(p.name)+' <span class="meta">'+fmt.format(eff(p))+'</span></span><input type="number" min="0" value="0" data-oq="'+p.id+'" style="width:80px"></div>'}).join("")+'<label class="chk"><input id="o-s" type="checkbox" checked> Descontar del inventario</label><div class="err" id="oerr"></div><div class="foot"><button class="btn" data-x="close">Cancelar</button><button class="btn primary" data-x="osave">Guardar pedido</button></div>';
  $("dlg").showModal();
}
function saveOrder(){
  var n=$("o-n").value.trim(),its=[],tot=0;
  document.querySelectorAll("[data-oq]").forEach(function(i){var q=Number(i.value)||0;if(q>0){var p=items.find(function(x){return x.id===i.dataset.oq});its.push({id:p.id,n:p.name,q:q,pr:eff(p)});tot+=q*eff(p)}});
  if(!n||!its.length){$("oerr").textContent="Escribe el nombre del cliente y elige al menos un producto.";return}
  if($("o-s").checked){its.forEach(function(i){var p=items.find(function(x){return x.id===i.id});if(!ilim(p))p.stock=Math.max(0,(p.stock||0)-i.q)});persist()}
  var no={id:uid(),fecha:Date.now(),nombre:n,tel:$("o-t").value.trim(),dir:$("o-d").value.trim(),pago:$("o-p").value,estado:"Pendiente",total:tot,items:its,desc:$("o-s").checked};
  Backend.crear(no).then(function(){$("dlg").close();cargarPedidos().then(renderStore)}).catch(function(e){$("oerr").textContent="No se pudo guardar: "+e.message});
}

/* ---------- Métodos de pago ---------- */
var mQr="",mIdx=-1;
function svm(ms){cfg=Object.assign({},cfg,{metodos:ms});guardarCfg();renderAdmin()}
function openMetodo(i){
  var m=i>=0?metodos()[i]:{nombre:"",tipo:"transfer",activo:true};mIdx=i;mQr=m.qr||"";
  $("dbox").innerHTML='<h2>'+(i>=0?"Editar método de pago":"Nuevo método de pago")+'</h2><label>Nombre<input id="m-nombre" placeholder="Ej: Nequi, Daviplata, Bancolombia"></label><label>Tipo<select id="m-tipo"><option value="transfer">Billetera o cuenta (Nequi, Daviplata, banco)</option><option value="link">Enlace de pago en línea (tarjeta, PSE)</option><option value="efectivo">Contra entrega (efectivo)</option></select></label><div id="m-t" class="f"><label>Número o cuenta<input id="m-cuenta" placeholder="Ej: 300 000 0000"></label><label>A nombre de (opcional)<input id="m-titular"></label><label>Código QR (opcional)<input id="m-qrf" type="file" accept="image/*"></label><div class="meta" id="m-qrm"></div></div><div id="m-l" class="f"><label>Enlace de pago (empieza con https://)<input id="m-enlace" placeholder="https://..."></label></div><label>Instrucciones para el cliente<textarea id="m-instr" rows="2"></textarea></label><label class="chk"><input id="m-activo" type="checkbox"> Activo</label><div class="err" id="merr"></div><div class="foot"><button class="btn" data-x="close">Cancelar</button><button class="btn primary" data-x="msave">Guardar</button></div>';
  $("m-nombre").value=m.nombre||"";$("m-tipo").value=m.tipo;$("m-cuenta").value=m.cuenta||"";$("m-titular").value=m.titular||"";$("m-enlace").value=m.enlace||"";$("m-instr").value=m.instr||"";$("m-activo").checked=m.activo!==false;
  $("m-qrm").textContent=mQr?"QR cargado. Sube otro para reemplazarlo.":"";
  var tu=function(){var t=$("m-tipo").value;$("m-t").style.display=t==="transfer"?"grid":"none";$("m-l").style.display=t==="link"?"grid":"none"};
  $("m-tipo").addEventListener("change",tu);tu();
  $("m-qrf").addEventListener("change",function(){if(this.files[0])resizeImg(this.files[0],500,"image/png",function(u){mQr=u;$("m-qrm").textContent="QR listo."})});
  $("dlg").showModal();
}
function saveMetodo(){
  var t=$("m-tipo").value,n=$("m-nombre").value.trim(),cu=$("m-cuenta").value.trim(),en=$("m-enlace").value.trim();
  if(!n){$("merr").textContent="Escribe el nombre del método.";return}
  if(t==="transfer"&&!cu&&!mQr){$("merr").textContent="Escribe el número o cuenta, o sube un código QR.";return}
  if(t==="link"&&!/^https:\/\//i.test(en)){$("merr").textContent="El enlace debe empezar con https://";return}
  var ms=metodos().map(function(x){return Object.assign({},x)});
  var m={id:mIdx>=0?ms[mIdx].id:uid(),nombre:n,tipo:t,activo:$("m-activo").checked,cuenta:t==="transfer"?cu:"",titular:t==="transfer"?$("m-titular").value.trim():"",qr:t==="transfer"?mQr:"",enlace:t==="link"?en:"",instr:$("m-instr").value.trim()};
  if(mIdx>=0)ms[mIdx]=m;else ms.push(m);
  $("dlg").close();svm(ms);
}

/* ---------- Puntos, canjes y ruleta (administración) ----------
   La cuenta de puntos de cada cliente es su ID de Free Fire. Los puntos se suman y restan SOLOS en la base de datos
   al cambiar el estado de un pedido. La ruleta se sortea en la base de datos con las probabilidades de aquí;
   la base de datos valida y rechaza lo que no sea correcto (probabilidades enteras que suman exactamente 100 %). */
var TIPOS_PREMIO=[["puntos","Puntos extra"],["pct","% de descuento (cupón)"],["fijo","Descuento fijo $ (cupón)"],["manual","Premio manual (lo entregas tú)"],["nada","Sin premio"]];
var LOY=null;
function loyIni(){
  var P=cfg.pts||{};
  LOY={cada:Number(P.cada)||2000,obj:Number(P.objetivo)||50,ruleta:[],premios:[],canjes:[],clientes:[],giros:[],borrados:[],msg:"",msgR:"",msgP:"",msgC:"",cargando:true};
}
function loyLeer(){
  if(!LOY||!$("l-cada"))return;
  LOY.cada=Number($("l-cada").value)||0;LOY.obj=Number($("l-obj").value)||0;
  document.querySelectorAll("[data-lr]").forEach(function(tr){var p=LOY.ruleta[Number(tr.dataset.lr)];if(!p)return;
    p.nombre=tr.querySelector(".l-n").value.trim();p.tipo=tr.querySelector(".l-t").value;p.valor=tr.querySelector(".l-v").value.trim();
    p.peso=tr.querySelector(".l-p").value.trim();p.stock=tr.querySelector(".l-s").value.trim();p.activo=tr.querySelector(".l-a").checked});
  document.querySelectorAll("[data-lp]").forEach(function(tr){var p=LOY.premios[Number(tr.dataset.lp)];if(!p)return;
    p.nombre=tr.querySelector(".p-n").value.trim();p.descripcion=tr.querySelector(".p-d").value.trim();p.costo=tr.querySelector(".p-c").value.trim();
    p.stock=tr.querySelector(".p-s").value.trim();p.activo=tr.querySelector(".p-a").checked});
}
function cargarLoy(){
  Promise.all([Backend.ruletaAdmin(),Backend.premiosCanje(),Backend.canjesAdmin(),Backend.clientesPuntos(),Backend.girosAdmin()])
    .then(function(r){
      LOY.ruleta=(r[0]||[]).map(function(x){return{id:x.id,nombre:x.nombre||"",descripcion:x.descripcion||"",tipo:x.tipo||"nada",valor:x.valor==null?"":String(x.valor),peso:String(x.peso==null?0:x.peso),stock:x.stock==null?"":String(x.stock),activo:x.activo!==false}});
      LOY.premios=(r[1]||[]).map(function(x){return{id:x.id,nombre:x.nombre||"",descripcion:x.descripcion||"",costo:String(x.costo_puntos==null?"":x.costo_puntos),stock:x.stock==null?"":String(x.stock),activo:x.activo!==false}});
      LOY.canjes=r[2]||[];LOY.clientes=r[3]||[];LOY.giros=r[4]||[];LOY.borrados=[];LOY.cargando=false;renderAdmin()})
    .catch(function(e){LOY.cargando=false;LOY.msg="No se pudieron leer los datos: "+e.message+" (¿ejecutaste supabase/schema_3_puntos_ff.sql?)";renderAdmin()});
}
function loySuma(){return LOY.ruleta.reduce(function(a,p){var n=Math.floor(Number(p.peso));return a+(p.activo&&n>0?n:0)},0)}
function renderLoyalty(h){
  if(!Backend.remote){$("panel").innerHTML=h+'<div class="msg">Los puntos y la ruleta necesitan la base de datos. Sigue TUTORIAL_BASE_DE_DATOS.md.</div>';return}
  if(!LOY){loyIni();cargarLoy()}
  var suma=loySuma(),ok100=suma===100,fecha=function(t){var d=new Date(t);return isNaN(d.getTime())?"":d.toLocaleString("es-CO")};
  h+='<div class="box" style="padding:0;max-width:900px"><p class="meta">Cada cliente tiene una cuenta de puntos con su <b>ID de Free Fire</b>. Ganan <b>1 punto por cada</b> cierto valor pagado: se suman solos cuando confirmas el pago del pedido (una sola vez) y se restan si lo cancelas. Para canjear o girar usan un PIN que ellos crean.</p>'
   +'<div class="two"><label>Pesos por cada punto (COP)<input id="l-cada" type="number" min="1" step="100" value="'+esc(LOY.cada)+'"></label><label>Puntos que cuesta cada giro<input id="l-obj" type="number" min="1" step="1" value="'+esc(LOY.obj)+'"></label></div>'
   +'<div class="foot"><span class="meta" id="lmsg-cfg">'+esc(LOY.msg)+'</span><button class="btn primary" id="l-cfg">Guardar configuración</button></div></div>';

  h+='<div class="bar"><b>Premios de la ruleta</b></div><div class="box" style="padding:0;max-width:900px"><p class="meta">Escribe la <b>probabilidad en % (número entero)</b> de cada premio. Los premios <b>activos deben sumar exactamente 100 %</b> (entre 2 y 12 premios). Stock vacío = ilimitado; si un premio se agota, su parte se reparte entre los demás. El sorteo lo hace la base de datos.</p>'
   +(LOY.cargando?'<div class="meta">Cargando…</div>':'')
   +LOY.ruleta.map(function(p,i){return'<div class="row" data-lr="'+i+'" style="display:grid;grid-template-columns:2fr 1.7fr 1fr .8fr .9fr auto auto;gap:6px;align-items:center"><input class="l-n" maxlength="30" placeholder="Nombre" value="'+esc(p.nombre)+'"><select class="l-t">'+TIPOS_PREMIO.map(function(t){return'<option value="'+t[0]+'"'+(p.tipo===t[0]?' selected':'')+'>'+t[1]+'</option>'}).join("")+'</select><input class="l-v" placeholder="Valor" '+(p.tipo==="nada"?"disabled ":"")+'value="'+esc(p.tipo==="nada"?"":p.valor)+'"><input class="l-p" type="number" min="0" max="100" step="1" placeholder="%" title="Probabilidad en %" value="'+esc(p.peso)+'"><input class="l-s" type="number" min="0" step="1" placeholder="Stock" title="Vacío = ilimitado" value="'+esc(p.stock)+'"><label class="meta" style="white-space:nowrap"><input class="l-a" type="checkbox"'+(p.activo?' checked':'')+'> activo</label><button class="btn sm danger" data-lx="'+i+'" aria-label="Quitar premio">Quitar</button></div>'}).join("")
   +'<div class="foot"><span class="meta" id="lmsg-r" style="'+(ok100?'':'color:#e0457b;font-weight:700')+'">Suma de activos: '+suma+' %'+(ok100?' ✓':' (debe ser 100)')+(LOY.msgR?' • '+esc(LOY.msgR):'')+'</span><button class="btn" id="l-norm" title="Reparte las probabilidades de los premios activos para que sumen 100 %, manteniendo su proporción">Ajustar a 100 %</button><button class="btn" id="l-add">Agregar premio</button><button class="btn primary" id="l-save">Guardar ruleta</button></div></div>';

  h+='<div class="bar"><b>Premios que se canjean con puntos</b></div><div class="box" style="padding:0;max-width:900px"><p class="meta">El cliente los canjea con su PIN. El costo y el stock se leen siempre de la base de datos. Stock vacío = ilimitado.</p>'
   +LOY.premios.map(function(p,i){return'<div class="row" data-lp="'+i+'" style="display:grid;grid-template-columns:1.6fr 2fr .8fr .8fr auto auto auto;gap:6px;align-items:center"><input class="p-n" maxlength="60" placeholder="Nombre" value="'+esc(p.nombre)+'"><input class="p-d" maxlength="200" placeholder="Descripción" value="'+esc(p.descripcion)+'"><input class="p-c" type="number" min="1" step="1" placeholder="Puntos" value="'+esc(p.costo)+'"><input class="p-s" type="number" min="0" step="1" placeholder="Stock" value="'+esc(p.stock)+'"><label class="meta" style="white-space:nowrap"><input class="p-a" type="checkbox"'+(p.activo?' checked':'')+'> activo</label><button class="btn sm primary" data-ps="'+i+'">Guardar</button><button class="btn sm danger" data-pd="'+i+'">Borrar</button></div>'}).join("")
   +(LOY.premios.length||LOY.cargando?'':'<div class="meta">Aún no hay premios canjeables.</div>')
   +'<div class="foot"><span class="meta" id="lmsg-p">'+esc(LOY.msgP)+'</span><button class="btn" id="p-add">Agregar premio canjeable</button></div></div>';

  var pend=LOY.canjes.filter(function(c){return c.estado==="pendiente"}),resto=LOY.canjes.filter(function(c){return c.estado!=="pendiente"}).slice(0,15);
  h+='<div class="bar"><b>Canjes y premios por entregar ('+pend.length+')</b><button class="btn" id="l-ref">Actualizar</button></div>'
   +(LOY.msgC?'<div class="meta">'+esc(LOY.msgC)+'</div>':'')
   +(pend.length?'<div class="list">'+pend.map(function(c){return'<div class="row line"><span><b>'+esc(c.nombre)+'</b> <span class="meta">ID Free Fire '+esc(c.ff_id)+' • '+(c.origen==="ruleta"?"ruleta":esc(c.costo)+" pts")+' • '+esc(fecha(c.creado))+'</span></span><span><button class="btn sm primary" data-ce="'+esc(c.id)+'" data-est="entregado">Entregado</button> <button class="btn sm danger" data-ce="'+esc(c.id)+'" data-est="cancelado">Cancelar</button></span></div>'}).join("")+'</div>':'<div class="empty"><p>No hay canjes pendientes.</p></div>')
   +(resto.length?'<div class="list">'+resto.map(function(c){return'<div class="row line"><span>'+esc(c.nombre)+' <span class="meta">ID '+esc(c.ff_id)+' • '+esc(fecha(c.creado))+'</span></span><span class="tag'+(c.estado==="entregado"?"":" off")+'">'+esc(c.estado)+'</span></div>'}).join("")+'</div>':'');

  h+='<div class="bar"><b>Clientes con puntos (ID de Free Fire)</b></div>'
   +(LOY.clientes.length?'<div class="list">'+LOY.clientes.map(function(c){return'<div class="row line"><span>'+esc(c.ff_id)+' <span class="meta">'+(c.pin_definido?"con PIN":"sin PIN todavía")+'</span></span><span class="meta">'+esc(c.total_ganado)+' ganados</span><b>'+esc(c.puntos)+' pts</b></div>'}).join("")+'</div>':'<div class="empty"><p>'+(LOY.cargando?"Cargando…":"Aún no hay cuentas. Se crean cuando un cliente se registra o cuando confirmas el pago de un pedido con ID de Free Fire.")+'</p></div>')
   +(LOY.giros.length?'<div class="bar"><b>Últimos giros de la ruleta</b></div><div class="list">'+LOY.giros.map(function(g){return'<div class="row line"><span><b>'+esc(g.premio)+'</b> <span class="meta">ID '+esc(g.ff_id)+' • '+esc(fecha(g.creado))+'</span></span><span class="meta">costó '+esc(g.costo)+' pts'+(g.puntos_ganados>0?' • +'+esc(g.puntos_ganados):'')+'</span></div>'}).join("")+'</div>':'');
  $("panel").innerHTML=h;

  var recarga=function(){LOY.cargando=true;cargarLoy()};
  $("l-ref").addEventListener("click",function(){loyLeer();LOY.msgC="";recarga()});
  $("l-add").addEventListener("click",function(){loyLeer();if(LOY.ruleta.length>=24)LOY.msgR="Demasiados premios.";else LOY.ruleta.push({id:null,nombre:"",descripcion:"",tipo:"puntos",valor:"10",peso:"0",stock:"",activo:true});renderAdmin()});
  $("l-norm").addEventListener("click",function(){
    loyLeer();
    var act=LOY.ruleta.filter(function(p){return p.activo}),tot=act.reduce(function(a,p){return a+Math.max(0,Number(p.peso)||0)},0);
    if(!act.length){LOY.msgR="No hay premios activos.";renderAdmin();return}
    if(tot<=0){var b0=Math.floor(100/act.length);act.forEach(function(p,i){p.peso=String(b0+(i<100-b0*act.length?1:0))});LOY.msgR="Reparto igual entre los activos. Revisa y guarda.";renderAdmin();return}
    /* método del mayor resto: enteros que suman exactamente 100 */
    var q=act.map(function(p,i){var x=Math.max(0,Number(p.peso)||0)*100/tot;return{p:p,f:Math.floor(x),r:x-Math.floor(x),i:i}}),falta=100-q.reduce(function(a,x){return a+x.f},0);
    q.slice().sort(function(a,b){return b.r-a.r||a.i-b.i}).slice(0,falta).forEach(function(x){x.f++});
    q.forEach(function(x){x.p.peso=String(x.f)});
    LOY.msgR="Ajustado a 100 %. Revisa y guarda.";renderAdmin();
  });
  $("p-add").addEventListener("click",function(){loyLeer();LOY.premios.push({id:null,nombre:"",descripcion:"",costo:"",stock:"",activo:true});renderAdmin()});
  document.querySelectorAll("[data-lx]").forEach(function(b){b.addEventListener("click",function(){loyLeer();var q=LOY.ruleta.splice(Number(b.dataset.lx),1)[0];if(q&&q.id!=null)LOY.borrados.push(q.id);renderAdmin()})});
  document.querySelectorAll("[data-lr] input,[data-lr] select").forEach(function(el){el.addEventListener("change",function(){loyLeer();renderAdmin()})});

  $("l-cfg").addEventListener("click",function(){
    loyLeer();var L=LOY,m=function(t){L.msg=t;$("lmsg-cfg").textContent=t};
    if(!(L.cada>=1)||!(L.obj>=1))return m("Revisa los pesos por punto y los puntos por giro (mínimo 1).");
    m("Guardando…");
    Backend.guardarAjuste("puntos",{cada:Math.floor(L.cada),objetivo:Math.floor(L.obj)})
      .then(function(){cfg.pts={cada:Math.floor(L.cada),objetivo:Math.floor(L.obj)};m("Guardado.")})
      .catch(function(e){m("No se pudo guardar: "+e.message)});
  });

  $("l-save").addEventListener("click",function(){
    loyLeer();var L=LOY,m=function(t){L.msgR=t;$("lmsg-r").textContent=t};
    var act=L.ruleta.filter(function(p){return p.activo});
    if(L.ruleta.some(function(p){return!p.nombre}))return m("Todos los premios necesitan nombre.");
    if(act.length<2||act.length>12)return m("Debe haber entre 2 y 12 premios activos.");
    if(loySuma()!==100)return m("Las probabilidades activas deben sumar exactamente 100 %.");
    var lista=L.ruleta.map(function(p){return{id:p.id,nombre:p.nombre,descripcion:p.descripcion||"",tipo:p.tipo,valor:p.tipo==="nada"?"0":p.valor,peso:Math.floor(Number(p.peso)||0),stock:p.stock===""?null:Math.floor(Number(p.stock)),activo:p.activo,eliminar:false}})
      .concat(L.borrados.map(function(id){return{id:id,eliminar:true}}));
    m("Guardando…");
    Backend.guardarRuleta(lista).then(function(r){
      if(r&&r.error){m(r.error);return}
      L.msgR="Guardado. La tienda ya usa estas probabilidades.";L.cargando=true;cargarLoy();
    }).catch(function(e){m("No se pudo guardar: "+e.message)});
  });

  document.querySelectorAll("[data-ps]").forEach(function(b){b.addEventListener("click",function(){
    loyLeer();var p=LOY.premios[Number(b.dataset.ps)];if(!p)return;
    LOY.msgP="Guardando…";$("lmsg-p").textContent=LOY.msgP;
    Backend.guardarPremioCanje(p).then(function(r){
      if(r&&r.error){LOY.msgP=r.error;$("lmsg-p").textContent=r.error;return}
      LOY.msgP="Guardado.";LOY.cargando=true;cargarLoy();
    }).catch(function(e){LOY.msgP="No se pudo guardar: "+e.message;$("lmsg-p").textContent=LOY.msgP});
  })});
  document.querySelectorAll("[data-pd]").forEach(function(b){b.addEventListener("click",function(){
    loyLeer();var i=Number(b.dataset.pd),p=LOY.premios[i];if(!p)return;
    if(p.id==null){LOY.premios.splice(i,1);renderAdmin();return}
    if(!window.confirm('¿Borrar el premio "'+p.nombre+'"? Los canjes ya hechos se conservan.'))return;
    Backend.borrarPremioCanje(p.id).then(function(r){
      if(r&&r.error){LOY.msgP=r.error;renderAdmin();return}
      LOY.msgP="Premio borrado.";LOY.cargando=true;cargarLoy();
    }).catch(function(e){LOY.msgP="No se pudo borrar: "+e.message;renderAdmin()});
  })});
  document.querySelectorAll("[data-ce]").forEach(function(b){b.addEventListener("click",function(){
    var est=b.dataset.est;
    if(est==="cancelado"&&!window.confirm("¿Cancelar este canje? Se devuelven los puntos al cliente."))return;
    Backend.estadoCanje(Number(b.dataset.ce),est).then(function(r){
      LOY.msgC=r&&r.error?r.error:(est==="entregado"?"Marcado como entregado.":"Canje cancelado y puntos devueltos.");LOY.cargando=true;cargarLoy();
    }).catch(function(e){LOY.msgC="No se pudo actualizar: "+e.message;renderAdmin()});
  })});
}
