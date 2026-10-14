/* COOKIES Y ALMACENAMIENTO: aviso de consentimiento (solo en la tienda, no en el panel).
   - Necesarias (siempre): el carrito y el registro de tu elección. Sin ellas la tienda no funciona.
   - Preferencias (opcional): recordar tu nombre y celular para tus próximos pedidos.
   Esta tienda NO usa cookies de publicidad ni de seguimiento. Si algún día agregas analítica, créala con
   Cookies.on("estadisticas", function(){ ...cargar el script... }) y agrega la categoría en CATS: así solo se activa con permiso.
   La elección se guarda en una cookie propia (6 meses) y en el navegador. */
var Cookies=(function(){
  var KEY="tienda_cookies",VER=1,esperando={};
  var CATS=[
    {id:"necesarias",t:"Necesarias",d:"Guardan tu carrito y tu elección de cookies. La tienda no funciona sin ellas.",fija:true},
    {id:"preferencias",t:"Preferencias",d:"Recuerdan tu nombre y celular para que no tengas que escribirlos en tu próximo pedido."}
  ];
  function leer(){
    var m=document.cookie.match(/(?:^|;\s*)tienda_cookies=([^;]*)/),c=null;
    if(m){try{c=JSON.parse(decodeURIComponent(m[1]))}catch(e){}}
    if(!c)c=lsGet(KEY,null);
    return c&&c.v===VER?c:null;
  }
  var cur=leer();
  function guardar(sel){
    var c={v:VER,t:Date.now()};CATS.forEach(function(k){c[k.id]=k.fija?true:!!sel[k.id]});
    try{document.cookie=KEY+"="+encodeURIComponent(JSON.stringify(c))+"; max-age=15552000; path=/; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"")}catch(e){}
    lsSet(KEY,c);cur=c;
    if(!c.preferencias){try{localStorage.removeItem("tienda_datos")}catch(e){}}   // retirar el permiso borra lo recordado
    Object.keys(esperando).forEach(function(id){if(c[id]){esperando[id].forEach(function(f){try{f()}catch(e){}});delete esperando[id]}});
  }
  function ok(cat){return cat==="necesarias"?true:!!(cur&&cur[cat])}
  function on(cat,fn){if(ok(cat))fn();else(esperando[cat]=esperando[cat]||[]).push(fn)}
  function cerrar(){var b=document.getElementById("cookiebar");if(b)b.remove()}
  function banner(){
    cerrar();var b=document.createElement("div");b.id="cookiebar";b.setAttribute("role","dialog");b.setAttribute("aria-label","Cookies");
    b.innerHTML='<p><b>Cookies.</b> Usamos almacenamiento necesario para que el carrito funcione. Si lo permites, también recordamos tu nombre y celular para tus próximos pedidos. No usamos cookies de publicidad ni de seguimiento.</p><div class="acts"><button class="btn" id="ck-cfg">Configurar</button><button class="btn" id="ck-min">Solo necesarias</button><button class="btn primary" id="ck-all">Aceptar todas</button></div>';
    document.body.appendChild(b);
    document.getElementById("ck-all").onclick=function(){var s={};CATS.forEach(function(k){s[k.id]=true});guardar(s);cerrar()};
    document.getElementById("ck-min").onclick=function(){guardar({});cerrar()};
    document.getElementById("ck-cfg").onclick=panel;
  }
  function panel(){
    cerrar();var d=document.getElementById("dbox");
    d.innerHTML='<h2>Configurar cookies</h2><p class="meta">Tú decides qué podemos guardar en tu navegador. Puedes cambiarlo cuando quieras desde el enlace "Cookies" al final de la página.</p>'
      +CATS.map(function(k){return'<label class="chk ckrow"><input type="checkbox" data-ck="'+k.id+'"'+(k.fija?' checked disabled':(ok(k.id)?' checked':''))+'><span><b>'+k.t+'</b>'+(k.fija?' <span class="tag">Siempre activas</span>':'')+'<br><span class="meta">'+k.d+'</span></span></label>'}).join("")
      +'<div class="foot"><button class="btn primary" id="ck-save">Guardar mi elección</button></div>';
    document.getElementById("dlg").showModal();
    document.getElementById("ck-save").onclick=function(){var s={};d.querySelectorAll("[data-ck]").forEach(function(i){s[i.dataset.ck]=i.checked});guardar(s);document.getElementById("dlg").close()};
  }
  if(!ADMIN_PAGE){
    if(!cur)banner();
    var l=document.getElementById("cookielink");if(l)l.addEventListener("click",panel);
  }
  return{ok:ok,on:on,abrir:panel};
})();
function recordarDatos(n,t){if(Cookies.ok("preferencias"))lsSet("tienda_datos",{n:String(n||"").slice(0,80),t:String(t||"").slice(0,20)})}
