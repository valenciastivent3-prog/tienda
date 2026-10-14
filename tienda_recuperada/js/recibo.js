/* RECIBO: tabla ordenada con casillas separadas (Producto | Cant. | Precio | Subtotal) y totales.
   Se usa en el recibo que ve el cliente al terminar la compra y en los pedidos del panel de administración. */
function reciboTabla(o){
  var its=o.items||[],sb=its.reduce(function(a,i){return a+(Number(i.q)||0)*(Number(i.pr)||0)},0),ds=Number(o.descuento)||0,tot=Number(o.total)||Math.max(0,sb-ds);
  return '<div class="rc-scroll"><table class="rc-t"><thead><tr><th>Producto</th><th class="n">Cant.</th><th class="n">Precio</th><th class="n">Subtotal</th></tr></thead><tbody>'
   +its.map(function(i,k){var q=Number(i.q)||0,p=Number(i.pr)||0;return '<tr style="--i:'+k+'"><td>'+esc(i.n)+(i.v?' <span class="tag">virtual</span>':'')+'</td><td class="n"><span class="rc-q">'+q+'</span></td><td class="n">'+fmt.format(p)+'</td><td class="n"><b>'+fmt.format(q*p)+'</b></td></tr>'}).join('')
   +'</tbody><tfoot>'
   +(ds>0?'<tr><td colspan="3">Subtotal</td><td class="n">'+fmt.format(sb)+'</td></tr><tr class="rc-dc"><td colspan="3">Descuento'+(o.cupon?' ('+esc(o.cupon)+')':'')+'</td><td class="n">-'+fmt.format(ds)+'</td></tr>':'')
   +'<tr class="rc-tot"><td colspan="3">Total</td><td class="n"><b data-count="'+tot+'">'+fmt.format(tot)+'</b></td></tr></tfoot></table></div>';
}
/* Recibo completo (cabecera + datos en casillas + tabla) */
function reciboCompleto(o){
  var ent=o.punto?'Recoger en: '+o.punto:(o.dir?'Domicilio: '+o.dir:''),
      c=function(k,v){return v?'<div><span>'+k+'</span><b>'+esc(v)+'</b></div>':''};
  return '<div class="rc"><div class="rc-head"><div><span class="rc-k">Recibo de pedido</span><b class="rc-n">#'+esc(String(o.id).slice(-6).toUpperCase())+'</b></div><span class="rc-date">'+esc(new Date(o.fecha).toLocaleString("es-CO"))+'</span></div>'
   +'<div class="rc-info">'+c('Cliente',o.nombre)+c('Celular',o.tel)+c('Pago',o.pago)+c('Referencia',o.referencia)+c('Entrega',ent)+(o.cuenta?c('Cuenta a recargar',o.cuenta.id+' · '+o.cuenta.nombre):'')+'</div>'
   +reciboTabla(o)+'</div>';
}
/* Check animado con confeti para la pantalla de "Pedido recibido" */
function okAnim(){
  var col=["#22d3ee","#8b5cf6","#ffcf4a","#8a5cf6","#2dbd85"],s='';
  for(var i=0;i<16;i++)s+='<i style="--x:'+Math.round((Math.random()-.5)*260)+'px;--y:'+Math.round(-50-Math.random()*110)+'px;--r:'+Math.round(Math.random()*720)+'deg;--d:'+Math.round(Math.random()*200)+'ms;background:'+col[i%5]+'"></i>';
  return '<div class="okwrap"><div class="confetti">'+s+'</div><svg class="okcheck" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg></div>';
}
