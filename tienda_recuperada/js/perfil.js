/* FASE 2C · PERFIL Y RECOMPENSAS: tarjeta de jugador con datos reales (puntos y cupones que devuelve el servidor),
   sección RECOMPENSAS en la tienda, cierre animado de ventanas y avisos. Se carga antes de main.js. */
var RM_C=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Tarjeta PLAYER PROFILE (la usa pintarCuenta en puntos.js). Solo muestra datos reales: nada de nivel ni historial inventado. */
function perfilHUD(a,c,pct,puede){
  var sd=(typeof Cookies!=="undefined"&&Cookies.ok("preferencias"))?lsGet("tienda_datos",{}):{},
      nom=String(sd.n||"").trim().slice(0,24)||("JUGADOR ···"+String(a.ff||"").slice(-4));
  return '<div class="pf'+(puede?' ready':'')+'"><div class="pf-top"><div class="pf-av">'+esc(nom.charAt(0).toUpperCase())+'</div><div><b class="pf-n">'+esc(nom)+'</b><span class="pf-s"><i></i>STATUS: ONLINE</span></div></div>'
   +'<div><div class="pf-row"><span>PUNTOS</span><b><em data-count="'+a.puntos+'" data-plain="1">'+a.puntos+'</em> / '+c.objetivo+' XP</b></div><div class="pf-bar"><i style="--w:'+pct+'%"></i></div>'
   +'<div class="pf-row"><span>PRÓXIMA RECOMPENSA</span><b>'+(puede?'¡RULETA LISTA!':'Faltan '+(c.objetivo-a.puntos)+' pts')+'</b></div></div>'
   +'<div class="pf-stats"><div><span>CUPONES</span><b>'+a.premios.length+'</b></div><div><span>META PARA GIRAR</span><b>'+c.objetivo+'</b></div></div></div>';
}

/* Sección RECOMPENSAS de la tienda (shop.js la llama; solo aparece si el programa de puntos está activo) */
function fxRewards(sec){
  if(!ruletaOn())return "";
  var c=ptsCfg(),pr=(cfg.ruleta||[]).map(function(p){return String(p.nombre||"")}).filter(Boolean).slice(0,8);
  return sec("rew","04","RECOMPENSAS",'<div class="rw"><div class="rw-l"><span class="rw-k">PROGRAMA DE PUNTOS</span><p>Gana <b>1 punto</b> por cada <b>'+fmt.format(c.cada)+'</b> de tus compras pagadas. Con tu ID de Free Fire consultas tus puntos, canjeas premios y, con <b>'+c.objetivo+' puntos</b>, giras la ruleta.</p><button class="btn primary" data-pts="1">VER MIS PUNTOS</button></div>'
   +'<div class="rw-r"><span class="rw-k">PREMIOS EN LA RULETA</span><div class="rw-chips">'+pr.map(function(n,i){return '<em style="--i:'+i+'">'+esc(n)+'</em>'}).join("")+'</div></div></div>');
}
document.addEventListener("click",function(e){if(e.target.closest&&e.target.closest("[data-pts]")&&typeof abrirPuntos==="function")abrirPuntos()});

/* Cierre animado de ventanas (el cierre normal, Esc y el botón Cerrar pasan por aquí) */
(function(){
  if(RM_C||!window.HTMLDialogElement)return;
  var oc=HTMLDialogElement.prototype.close,os=HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.close=function(r){
    var d=this;if(!d.open||d._ct)return oc.call(d,r);
    d.classList.add("closing");d._ct=setTimeout(function(){d._ct=0;d.classList.remove("closing");oc.call(d,r)},220);
  };
  HTMLDialogElement.prototype.showModal=function(){ /* si se reabre mientras se cierra, termina el cierre al instante */
    if(this._ct){clearTimeout(this._ct);this._ct=0;this.classList.remove("closing");oc.call(this)}
    return os.call(this);
  };
  document.addEventListener("cancel",function(e){if(e.target.tagName==="DIALOG"){e.preventDefault();e.target.close()}},true);
})();

/* Avisos y celebración: pedido enviado y premio ganado */
(function(){
  var db=document.getElementById("dbox");if(!db)return;
  new MutationObserver(function(){
    var h=db.querySelector("h2");
    if(h&&db.querySelector(".rc")&&!db._ok){db._ok=1;if(window.toast)toast("PEDIDO ENVIADO")}
    if(!db.querySelector(".rc"))db._ok=0;
    var r=db.querySelector("#pt-res"),pf=db.querySelector(".pf");
    if(r&&pf&&/Ganaste/.test(r.textContent)&&!RM_C){
      if(window.toast)toast("¡PREMIO DESBLOQUEADO!");
      var col=["#22d3ee","#8b5cf6","#ffcf4a","#2dd4a0"],s="";
      for(var i=0;i<18;i++)s+='<i style="--x:'+Math.round((Math.random()-.5)*300)+'px;--y:'+Math.round(-40-Math.random()*120)+'px;--r:'+Math.round(Math.random()*720)+'deg;--d:'+Math.round(Math.random()*250)+'ms;background:'+col[i%4]+'"></i>';
      var cf=document.createElement("div");cf.className="confetti";cf.innerHTML=s;pf.appendChild(cf);
    }
  }).observe(db,{childList:true});
})();
