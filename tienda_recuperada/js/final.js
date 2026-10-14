/* FASE 4 · cursor personalizado opcional (solo PC) y pausa del hero fuera de pantalla. Se carga al final. */
(function(){
  var RM=matchMedia("(prefers-reduced-motion: reduce)").matches,app=document.getElementById("app");

  /* El hero pausa sus animaciones cuando no está visible */
  if(app&&window.IntersectionObserver){
    var hio=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle("off",!e.isIntersecting)})});
    var wh=function(){var h=document.querySelector(".hero-x:not(.w8)");if(h){h.classList.add("w8");hio.observe(h)}};
    new MutationObserver(wh).observe(app,{childList:true});wh();
  }

  /* Cursor: punto + anillo que reacciona a botones y tarjetas. Se apaga con ◎ y se desactiva solo dentro de las ventanas. */
  if(RM||!matchMedia("(hover:hover) and (pointer:fine)").matches||innerWidth<760)return;
  var H=document.documentElement,KEY="fx_cursor",on=true,mx=-100,my=-100,rx=-100,ry=-100,raf=0,
      dl=[].slice.call(document.querySelectorAll("dialog")),
      mk=function(t,id){var e=document.createElement(t);e.id=id;e.setAttribute("aria-hidden","true");document.body.appendChild(e);return e},
      dot=mk("div","cur-dot"),ring=mk("div","cur-ring"),tg=mk("button","cur-tg");
  try{on=localStorage.getItem(KEY)!=="off"}catch(e){}
  tg.type="button";tg.textContent="◎";tg.title="Cursor personalizado: activar/desactivar";tg.setAttribute("aria-hidden","false");tg.setAttribute("aria-label","Activar o desactivar el cursor personalizado");tg.setAttribute("aria-pressed",on);
  function sync(){H.classList.toggle("cur-on",on&&!dl.some(function(d){return d.open}))}
  function tick(){raf=0;rx+=(mx-rx)*.2;ry+=(my-ry)*.2;dot.style.transform="translate("+mx+"px,"+my+"px)";ring.style.transform="translate("+rx+"px,"+ry+"px)";if(Math.abs(mx-rx)>.3||Math.abs(my-ry)>.3)raf=requestAnimationFrame(tick)}
  document.addEventListener("mousemove",function(e){
    mx=e.clientX;my=e.clientY;sync();if(!raf)raf=requestAnimationFrame(tick);
    var t=e.target.closest&&e.target.closest("a,button,.card,.chip,input,select,textarea,[data-add]");ring.classList.toggle("hot",!!t&&!t.disabled);
  },{passive:true});
  document.addEventListener("mouseleave",function(){H.classList.remove("cur-on")});
  tg.addEventListener("click",function(){
    on=!on;tg.setAttribute("aria-pressed",on);sync();
    if(typeof Cookies!=="undefined"&&Cookies.ok&&Cookies.ok("preferencias"))try{localStorage.setItem(KEY,on?"on":"off")}catch(e){} /* solo se guarda si aceptó cookies de preferencias */
  });
})();
