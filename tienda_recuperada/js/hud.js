/* FASE 2A · HUD: loader, fondo con partículas, barra de progreso, toasts, skeletons y título animado.
   Se carga DESPUÉS de store.js y ANTES de main.js (necesita envolver renderStore y Backend.catalogo antes del arranque). */
(function(){
  var RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches,
      mob=innerWidth<760||/Mobi|Android/i.test(navigator.userAgent),
      $=function(i){return document.getElementById(i)};

  /* ---- Loader: se quita en cuanto carga la página (mínimo 650 ms para que se vea) ---- */
  var t0=performance.now(),b0=$("boot");
  function hideBoot(){
    var b=b0;if(!b)return;b0=null;
    setTimeout(function(){b.classList.add("out");setTimeout(function(){b.remove()},700)},Math.max(0,650-(performance.now()-t0)));
  }
  addEventListener("load",hideBoot);setTimeout(hideBoot,3000);

  /* ---- Skeletons: mientras Supabase responde se muestran tarjetas fantasma en vez de la tienda vacía ---- */
  var loading=typeof REMOTO!=="undefined"&&!!REMOTO;
  if(loading&&typeof Backend!=="undefined"&&Backend.catalogo){
    var bc=Backend.catalogo;
    Backend.catalogo=function(){var p=bc.apply(Backend,arguments),d=function(){loading=false};p.then(d,d);return p};
  }
  var rs=window.renderStore;
  window.renderStore=function(){
    if(loading){
      var s="";for(var i=0;i<6;i++)s+='<div class="skel"><div class="sk-pic"></div><div class="sk-l"></div><div class="sk-l s"></div><div class="sk-b"></div></div>';
      $("app").innerHTML='<section class="hero hero-x sk-hero"><div class="hud-tag"><i></i>INITIALIZING...</div></section><div class="skel-grid" aria-busy="true">'+s+'</div>';
      return;
    }
    return rs.apply(this,arguments);
  };

  /* ---- Toasts (reemplazan al alert() del sistema actual) ---- */
  window.toast=function(msg,type){
    var c=$("toasts");
    if(!c){c=document.createElement("div");c.id="toasts";c.setAttribute("role","status");c.setAttribute("aria-live","polite");document.body.appendChild(c)}
    var t=document.createElement("div"),i=document.createElement("b"),s=document.createElement("span"),p=document.createElement("u");
    t.className="toast"+(type==="err"?" err":"");i.textContent=type==="err"?"⚠":"✓";s.textContent=msg;
    t.appendChild(i);t.appendChild(s);t.appendChild(p);c.appendChild(t);
    while(c.children.length>4)c.firstChild.remove();
    setTimeout(function(){t.classList.add("out");setTimeout(function(){t.remove()},400)},type==="err"?5000:3200);
  };
  window.alert=function(m){toast(String(m),"err")};
  document.addEventListener("click",function(e){
    var t=e.target.closest&&e.target.closest("[data-add],[data-go]");if(!t)return;
    if(t.dataset.add)toast("PRODUCTO AGREGADO");
    else{var c=document.querySelector("#app .card,#app .skel");if(c)c.scrollIntoView({behavior:RM?"auto":"smooth",block:"center"})}
  });

  /* ---- Título del hero palabra por palabra (se repite en cada render porque la tienda se repinta) ---- */
  function split(){
    var h=document.querySelector(".hero-x h1:not(.sp)");if(!h||RM)return;
    var w=h.textContent.trim().split(/\s+/);h.classList.add("sp");h.setAttribute("aria-label",h.textContent);h.textContent="";
    w.forEach(function(t,i){var a=document.createElement("span"),b=document.createElement("span");a.className="w";a.style.setProperty("--w",i);a.setAttribute("aria-hidden","true");b.textContent=t;a.appendChild(b);h.appendChild(a);h.appendChild(document.createTextNode(" "))});
  }
  if($("app")){new MutationObserver(split).observe($("app"),{childList:true});split()}

  /* ---- El núcleo 3D sigue al mouse (solo PC) ---- */
  var tk=0;
  if(!RM&&!mob)document.addEventListener("mousemove",function(e){
    var h=e.target.closest&&e.target.closest(".hero-x");if(!h||tk)return;tk=1;var x=e.clientX,y=e.clientY;
    requestAnimationFrame(function(){tk=0;var r=h.getBoundingClientRect();h.style.setProperty("--rx",(-((y-r.top)/r.height-.5)*40)+"deg");h.style.setProperty("--ry",(((x-r.left)/r.width-.5)*60)+"deg")});
  },{passive:true});

  /* ---- Barra de progreso de scroll ---- */
  var bar=document.createElement("div"),sk=0;bar.id="hud-prog";bar.setAttribute("aria-hidden","true");document.body.appendChild(bar);
  addEventListener("scroll",function(){if(sk)return;sk=1;requestAnimationFrame(function(){sk=0;var h=document.documentElement;bar.style.transform="scaleX("+(scrollY/Math.max(1,h.scrollHeight-innerHeight))+")"})},{passive:true});

  /* ---- Fondo: piso en perspectiva + partículas conectadas (Canvas 2D, pausa si la pestaña está oculta) ---- */
  if(RM)return;
  var g=document.createElement("div");g.id="hud-grid";g.setAttribute("aria-hidden","true");g.appendChild(document.createElement("i"));document.body.prepend(g);
  var cv=document.createElement("canvas");cv.id="bg-fx";cv.setAttribute("aria-hidden","true");document.body.prepend(cv);
  var lite=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=2;if(lite)document.documentElement.classList.add("lite");
  var x=cv.getContext("2d"),dpr=Math.min(devicePixelRatio||1,1.5),W,H,P=[],N=(mob||lite)?24:60,mx=0,my=0,on=false,rt;
  function size(){W=cv.width=Math.round(innerWidth*dpr);H=cv.height=Math.round(innerHeight*dpr)}
  size();
  for(var i=0;i<N;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25*dpr,vy:(Math.random()-.5)*.25*dpr,r:(Math.random()*1.4+.6)*dpr,z:Math.random()+.2,c:i%4?"34,211,238":"139,92,246"});
  var lt=0,slow=0;
  function frame(t){ /* calidad adaptativa: si los FPS bajan, reduce las partículas a la mitad */
    if(document.hidden){on=false;return}
    if(lt&&t){if(t-lt>34){if(++slow>45&&N>14){N=Math.max(14,N>>1);P.length=N;slow=0}}else if(slow>0)slow--}
    lt=t||lt;
    x.clearRect(0,0,W,H);var L=(mob?90:130)*dpr,a,b,d,k;
    for(a=0;a<N;a++){
      k=P[a];k.x+=k.vx;k.y+=k.vy;if(k.x<0)k.x=W;else if(k.x>W)k.x=0;if(k.y<0)k.y=H;else if(k.y>H)k.y=0;
      k.px=k.x+mx*k.z*28*dpr;k.py=k.y+my*k.z*28*dpr;
      x.fillStyle="rgba("+k.c+",.75)";x.beginPath();x.arc(k.px,k.py,k.r,0,6.283);x.fill();
    }
    x.lineWidth=dpr*.6;
    for(a=0;a<N;a++)for(b=a+1;b<N;b++){
      d=Math.hypot(P[a].px-P[b].px,P[a].py-P[b].py);
      if(d<L){x.strokeStyle="rgba(34,211,238,"+(.2*(1-d/L))+")";x.beginPath();x.moveTo(P[a].px,P[a].py);x.lineTo(P[b].px,P[b].py);x.stroke()}
    }
    requestAnimationFrame(frame);
  }
  function go(){if(!on){on=true;requestAnimationFrame(frame)}}
  document.addEventListener("visibilitychange",go);
  addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(size,200)});
  if(!mob)document.addEventListener("mousemove",function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  go();
})();
