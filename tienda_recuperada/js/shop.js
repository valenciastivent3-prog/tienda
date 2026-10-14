/* FASE 3 · TIENDA HUD 3D AVANZADA
Conserva categorías, productos destacados, ofertas, recompensas,
aparición al hacer scroll y tilt 3D con parallax.
Compatible con el CSS de css/shop.css.
*/

var FX_PROXIMOS = [];
var fxIn = {};

function fxRar(p) {
return agotado(p)
? "r-out"
: (p.offer && p.offerPrice > 0
? "r-offer"
: (p.tipo === "virtual" ? "r-virt" : ""));
}

function fxBadges(p, off) {
var s = "";
var st = Number(p.stock) || 0;

if (off && p.price > 0) {
s += '<span class="badge pct">-' +
Math.round(100 - p.offerPrice / p.price * 100) +
'%</span>';
}

if (!ilim(p) && !agotado(p) && st > 0 && st <= 5) {
s += '<span class="badge low">¡ÚLTIMAS ' + st + '!</span>';
}

return s;
}

/* Tarjeta compartida por el catálogo, destacados y ofertas */
function fxCard(p, star) {
var off = p.offer && p.offerPrice > 0;
var out = agotado(p);
var im = safeImg(p.image);

return '<article class="card product-card-3d ' +
 fxRar(p) + '" data-tilt="card" data-product-id="' +
 esc(p.id) + '">' +

'<div class="pic">' +

(im
  ? '<img src="' + im + '" alt="' +
    esc(T("producto.fotoAlt", { nombre: p.name })) +
    '" loading="lazy">'
  : (p.tipo === "virtual"
    ? '✦'
    : esc(T("producto.sinFoto")))) +

(star
  ? '<span class="badge star">★ DESTACADO</span>'
  : (off
    ? '<span class="badge">' +
      esc(T("producto.oferta")) +
      '</span>'
    : '')) +

fxBadges(p, off) +

'</div>' +

'<div class="info">' +
'<h3>' + esc(p.name) + '</h3>' +
'<p>' + esc(p.description) + '</p>' +

'<div class="price">' +

(off
  ? '<s>' + fmt.format(p.price) + '</s>' +
    '<b class="o">' + fmt.format(p.offerPrice) + '</b>'
  : '<b>' + fmt.format(p.price) + '</b>') +

'</div>' +

'<button class="btn primary" data-add="' +
esc(p.id) + '"' +
(out ? ' disabled' : '') +
'>' +
esc(T(out ? "producto.agotado" : "producto.agregar")) +
'</button>' +

'</div>' +
'</article>';

}

function fxSections(act, cats) {
var q = $("q");

/* Con búsqueda o filtros activos, se conserva el catálogo filtrado */
if (cat || tipoF || (q && q.value.trim())) {
return "";
}

var isO = function(p) {
return p.offer && p.offerPrice > 0;
};

var h = "";

var sec = function(k, n, t, b) {
return '<section class="fx-sec' +
   (fxIn[k] ? ' in' : '') +
   '" data-k="' + k + '">' +

  '<div class="fx-h">' +
  '<span>// ' + n + '</span>' +
  '<h2>' + t + '</h2>' +
  '</div>' +

  b +
  '</section>';

};

/* Categorías */
if (cats.length) {
h += sec(
"cats",
"01",
"CATEGORÍAS",

  '<div class="fx-cats">' +

  cats.map(function(c, i) {
    return '<button class="chip catx fx-item" ' +
      'style="--i:' + i + '" ' +
      'data-c="' + esc(c) + '" ' +
      'aria-pressed="false">' +

      '<i>' + esc(c.charAt(0).toUpperCase()) + '</i>' +

      '<span>' +
      '<b>' + esc(c) + '</b>' +
      '<small>' +
      act.filter(function(p) {
        return p.category === c;
      }).length +
      ' productos</small>' +
      '</span>' +

      '</button>';
  }).join("") +

  FX_PROXIMOS.filter(function(g) {
    return cats.indexOf(g) < 0;
  }).map(function(g, i) {
    return '<div class="catx soon fx-item" ' +
      'style="--i:' + (cats.length + i) + '" ' +
      'aria-disabled="true">' +

      '<i>' + esc(g.charAt(0)) + '</i>' +

      '<span>' +
      '<b>' + esc(g) + '</b>' +
      '<small>PRÓXIMAMENTE</small>' +
      '</span>' +

      '</div>';
  }).join("") +

  '</div>'
);

}

/* Productos activos y disponibles */
var ok = act.filter(function(p) {
return p.active && !agotado(p);
});

/* Destacados */
var f = act.length > 3
? ok.slice().sort(function(a, b) {
return (Number(!!isO(b)) - Number(!!isO(a))) ||
((b.createdAt || 0) - (a.createdAt || 0));
}).slice(0, 3)
: [];

if (f.length) {
h += sec(
"feat",
"02",
"PRODUCTOS DESTACADOS",

  '<div class="fx-feat n' + f.length + '">' +

  f.map(function(p, i) {
    return fxCard(p, i === 0);
  }).join("") +

  '</div>'
);

}

/* Ofertas */
var o = ok.filter(function(p) {
return isO(p) && f.indexOf(p) < 0;
}).slice(0, 8);

if (o.length) {
h += sec(
"offers",
"03",
"OFERTAS",

  '<div class="fx-offers">' +

  o.map(function(p) {
    return fxCard(p, false);
  }).join("") +

  '</div>'
);

}

/* Sistema de recompensas existente */
if (typeof fxRewards === "function") {
h += fxRewards(sec);
}

return h;
}

(function() {
var RM = window.matchMedia &&
matchMedia("(prefers-reduced-motion: reduce)").matches;

var mob = innerWidth < 760 ||
/Mobi|Android/i.test(navigator.userAgent);

var app = document.getElementById("app");

/* Animaciones de entrada cuando aparecen las secciones */
var io = (!RM && "IntersectionObserver" in window)
? new IntersectionObserver(function(es) {
es.forEach(function(e) {
if (e.isIntersecting) {
e.target.classList.add("in");
fxIn[e.target.dataset.k] = true;
io.unobserve(e.target);
}
});
}, { threshold: 0.12 })
: null;

function reveal() {
document.querySelectorAll(".fx-sec:not(.in)").forEach(function(s) {
if (io) {
io.observe(s);
} else {
s.classList.add("in");
fxIn[s.dataset.k] = true;
}
});
}

if (app) {
new MutationObserver(reveal).observe(app, {
childList: true,
subtree: true
});

reveal();

}

/* Desplazamiento suave hacia el catálogo al elegir categoría */
document.addEventListener("click", function(e) {
if (e.target.closest && e.target.closest(".catx[data-c]")) {
setTimeout(function() {
var b = document.querySelector("#app .bar");

    if (b) {
      b.scrollIntoView({
        behavior: RM ? "auto" : "smooth",
        block: "start"
      });
    }
  }, 80);
}

});

/* No ejecutar tilt si se prefiere movimiento reducido o es móvil */
if (RM || mob || !matchMedia("(hover:hover)").matches) {
return;
}

/* Tilt 3D y parallax */
var cur = null;
var raf = 0;
var ev = null;

var V = ["--px", "--py", "--rx", "--ry"];

function rst(c) {
V.forEach(function(k) {
c.style.removeProperty(k);
});
}

document.addEventListener("mousemove", function(e) {
var c = e.target.closest &&
e.target.closest(".card:not(.addcard)");

if (cur && cur !== c) {
  rst(cur);
}

cur = c;

if (!c) {
  return;
}

ev = e;

if (!raf) {
  raf = requestAnimationFrame(function() {
    raf = 0;

    if (!cur || !ev || !cur.isConnected) {
      return;
    }

    var r = cur.getBoundingClientRect();

    if (!r.width || !r.height) {
      return;
    }

    var px = (ev.clientX - r.left) / r.width - 0.5;
    var py = (ev.clientY - r.top) / r.height - 0.5;

    /* Limitar el efecto para evitar inclinaciones exageradas */
    px = Math.max(-0.5, Math.min(0.5, px));
    py = Math.max(-0.5, Math.min(0.5, py));

    cur.style.setProperty("--px", px.toFixed(3));
    cur.style.setProperty("--py", py.toFixed(3));

    cur.style.setProperty(
      "--ry",
      (px * 8).toFixed(2) + "deg"
    );

    cur.style.setProperty(
      "--rx",
      (-py * 6).toFixed(2) + "deg"
    );
  });
}

}, { passive: true });

/* Restaurar la tarjeta cuando el cursor sale de ella */
document.addEventListener("mouseout", function(e) {
if (!cur || !e.relatedTarget || cur.contains(e.relatedTarget)) {
return;
}

rst(cur);
cur = null;
ev = null;

}, { passive: true });

window.addEventListener("blur", function() {
if (cur) {
rst(cur);
}

cur = null;
ev = null;

});
})();
