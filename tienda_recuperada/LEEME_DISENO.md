# Diseño gaming (fases 1 a 4)

Cada fase es independiente: para quitarla, borra sus archivos y sus líneas en index.html.

| Fase | Archivos | Qué hace |
|------|----------|----------|
| Recibo + movimiento | css/motion.css, js/recibo.js, js/motion.js | Recibo en tabla, entradas escalonadas, bolita al carrito, ondas |
| 2A HUD | css/hud.css, js/hud.js, div #boot | Loader, fondo de partículas, navbar flotante, hero 3D, skeletons, toasts |
| 2B Tienda | css/shop.css, js/shop.js | Tarjetas 3D, categorías, destacados, ofertas |
| 2C Perfil | css/perfil.css, js/perfil.js | Perfil gamer, recompensas, cierre animado de ventanas |
| 4 Final | css/final.css, js/final.js | Foco visible, enlace "saltar", cursor opcional, modo ligero |

Ajustes rápidos
- Juegos "próximamente": variable FX_PROXIMOS al inicio de js/shop.js (vacía [] para quitarlos).
- Color principal: en el panel de administración (recomendado #22d3ee).
- Partículas: N en js/hud.js (baja solas si los FPS caen).
- Orden de carga en index.html: ... store.js, hud.js, shop.js, perfil.js, main.js, motion.js, final.js
