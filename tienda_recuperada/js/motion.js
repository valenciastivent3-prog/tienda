/* MOVIMIENTO: entrada escalonada, foco de luz en tarjetas, bolita al carrito, ondas, encabezado de cristal y parallax.
   Respeta "reducir movimiento" del sistema. Para quitarlo todo: borra la línea de js/motion.js en index.html y admin.html. */
(function(){
  var RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches,seen={};
  var io=("IntersectionObserver" in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("vis");io.unobserve(e.target)}})},{threshold:.06}):null;

  /* Solo anima lo que es nuevo: si el cliente escribe en el buscador, las tarjetas que siguen ahí no se repiten */
  function watch(id,sel){
    var root=document.getElementById(id);if(!root||RM)return;
    var scan=function(){
      var old=seen[id]||{},now={},n=0;
      root.querySelectorAll(sel).forEach(function(el,i){
        var b=el.querySelector("[data-add],[data-od],[data-oa]"),k=b?(b.dataset.add||b.dataset.od||b.dataset.id):"k"+i;now[k]=1;
        if(!old[k]){el.classList.add("enter");el.style.setProperty("--i",Math.min(n++,10));if(io)io.observe(el);else el.classList.add("vis")}
      });
      seen[id]=now;
    };
    new MutationObserver(scan).observe(root,{childList:true});scan();
  }
  watch("app",".card:not(.addcard)");
  watch("panel",".row.order,.stat");

  /* Ventana de compra: cada paso entra en cascada y los totales cuentan hacia arriba */
  var db=document.getElementById("dbox"),sig="";
  if(db&&!RM)new MutationObserver(function(){
    var h=db.querySelector("h2"),s=h?h.textContent:"";if(s===sig)return;sig=s;
    db.classList.remove("swap");void db.offsetWidth;db.classList.add("swap");
    db.querySelectorAll("[data-count]").forEach(function(el){
      var to=Number(el.dataset.count)||0,t0=performance.now();
      (function f(t){var k=Math.min(1,(t-t0)/900);var v=Math.round(to*(1-Math.pow(1-k,3)));el.textContent=el.hasAttribute("data-plain")?v:fmt.format(v);if(k<1)requestAnimationFrame(f)})(t0);
    });
  }).observe(db,{childList:true});

  /* Foco de luz que sigue el cursor sobre las tarjetas */
  document.addEventListener("mousemove",function(e){
    var c=e.target.closest&&e.target.closest(".card");if(!c)return;
    var r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px");
  },{passive:true});

  /* Encabezado de cristal y parallax de la portada */
  var hd=document.querySelector("header");
  addEventListener("scroll",function(){
    if(hd)hd.classList.toggle("scrolled",scrollY>12);
    if(!RM){var h=document.querySelector(".hero");if(h)h.style.setProperty("--sy",(scrollY*.18)+"px")}
  },{passive:true});

  /* Onda al tocar un botón y bolita que vuela hasta el carrito */
  function fly(b){
    var c=document.getElementById("opencart");if(!c||!b.animate)return;
    var a=b.getBoundingClientRect(),t=c.getBoundingClientRect(),d=document.createElement("div");
    d.className="fly";d.style.left=(a.left+a.width/2-9)+"px";d.style.top=(a.top+a.height/2-9)+"px";document.body.appendChild(d);
    d.animate([{transform:"translate(0,0) scale(1)",opacity:1},{transform:"translate("+(t.left+t.width/2-a.left-a.width/2)+"px,"+(t.top+t.height/2-a.top-a.height/2)+"px) scale(.3)",opacity:.4}],{duration:650,easing:"cubic-bezier(.5,-.2,.7,.4)"})
      .onfinish=function(){d.remove();c.classList.remove("bump");void c.offsetWidth;c.classList.add("bump")};
  }
  document.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest(".btn,.chip,.paytile");if(!b||RM)return;
    var r=b.getBoundingClientRect(),s=document.createElement("span"),d=Math.max(r.width,r.height)*2;
    s.className="ripple";s.style.cssText="width:"+d+"px;height:"+d+"px;left:"+(e.clientX-r.left-d/2)+"px;top:"+(e.clientY-r.top-d/2)+"px";
    b.appendChild(s);setTimeout(function(){s.remove()},600);
    if(b.dataset&&b.dataset.add)fly(b);
  },true);
})();
