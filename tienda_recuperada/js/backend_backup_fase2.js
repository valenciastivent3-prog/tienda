/* BACKEND: habla con Supabase (pedidos, productos, ajustes, puntos y ruleta).
   Sin configurar js/config.js funciona en "modo de prueba": todo se guarda solo en este navegador.
   Sesión del administrador: se guarda en sessionStorage (se borra al cerrar la pestaña). Un sitio estático no puede
   usar cookies HttpOnly; la protección real es la política de contenido (CSP) y las reglas RLS de la base. */

var Backend=(function(){
  var S=cfg.supabase||{},remote=!!(S.url&&S.anonKey),token=null,refreshT=null,base=(S.url||"").replace(/\/+$/,""),last={};

  try{
    if(ADMIN_PAGE){
      var sv=JSON.parse(sessionStorage.getItem("tienda_ses")||"null");
      if(sv&&sv.a){
        token=sv.a;
        refreshT=sv.r||null;
      }
    }
  }catch(e){}

  function guardarSes(){
    try{
      if(token)
        sessionStorage.setItem("tienda_ses",JSON.stringify({a:token,r:refreshT}));
      else
        sessionStorage.removeItem("tienda_ses");
    }catch(e){}
  }

  function headers(extra){
    var h={
      apikey:S.anonKey,
      "Content-Type":"application/json"
    };

    var bearer=token||(/^eyJ/.test(S.anonKey||"")?S.anonKey:"");

    if(bearer)
      h.Authorization="Bearer "+bearer;

    return Object.assign(h,extra||{});
  }

  function refrescar(){
    if(!refreshT)
      return Promise.reject(new Error("sin refresco"));

    return fetch(
      base+"/auth/v1/token?grant_type=refresh_token",
      {
        method:"POST",
        headers:{
          apikey:S.anonKey,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          refresh_token:refreshT
        })
      }
    )
    .then(function(r){
      return r.json().then(function(j){
        if(!r.ok||!j.access_token)
          throw new Error("sesión vencida");

        token=j.access_token;
        refreshT=j.refresh_token||refreshT;
        guardarSes();
      });
    });
  }

  function call(method,path,body,extra,reintento){
    return fetch(
      base+path,
      {
        method:method,
        headers:headers(extra),
        body:body?JSON.stringify(body):undefined
      }
    )
    .then(function(r){

      if(r.ok)
        return r.status===204
          ?null
          :r.text().then(function(t){
              return t?JSON.parse(t):null;
            });

      if(
        token &&
        r.status===401 &&
        !reintento &&
        refreshT
      ){
        return refrescar()
          .then(function(){
            return call(
              method,
              path,
              body,
              extra,
              true
            );
          })
          .catch(function(){
            token=null;
            refreshT=null;
            guardarSes();

            throw new Error(
              T("login.sesionVencida")
            );
          });
      }

      if(
        token &&
        (r.status===401||r.status===403)
      ){
        throw new Error(
          T("login.sesionVencida")
        );
      }

      return r.text().then(function(t){
        var m=t;

        try{
          m=JSON.parse(t).message||t;
        }catch(e){}

        throw new Error(
          m||("Error "+r.status)
        );
      });
    });
  }

  function soloSi(rows){
    if(!rows||!rows.length)
      throw new Error(
        "No se pudo guardar el cambio. Vuelve a entrar al panel e inténtalo otra vez."
      );
  }

  var MERGE={
    Prefer:"resolution=merge-duplicates,return=minimal"
  };

  return{

    remote:remote,

    /* ¿Se pueden recibir pedidos de verdad?
       Sí si hay base de datos; o si estás probando en tu computador. */
    ready:remote||enLocal,

    restore:function(){
      return remote&&!!token;
    },

    login:function(email,pass){
      if(!remote)
        return Promise.resolve();

      return fetch(
        base+"/auth/v1/token?grant_type=password",
        {
          method:"POST",
          headers:{
            apikey:S.anonKey,
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            email:email,
            password:pass
          })
        }
      )
      .then(function(r){
        return r.json().then(function(j){

          if(!r.ok||!j.access_token)
            throw new Error(
              T("login.credencialesMalas")
            );

          token=j.access_token;
          refreshT=j.refresh_token||null;
          guardarSes();
        });
      });
    },

    logout:function(){
      token=null;
      refreshT=null;
      guardarSes();
    },

    /* Llama a una función de la base de datos
       (puntos, ruleta, cupones de premio). */
    rpc:function(nombre,args){
      return call(
        "POST",
        "/rest/v1/rpc/"+nombre,
        args||{}
      );
    },

    /* =====================================================
       FASE 1 — PROCESAR PUNTOS DE UN PEDIDO
       =====================================================

       accion:
         "sumar"    -> otorga los puntos del pedido
         "revertir" -> devuelve los puntos al cancelar

       La función SQL evita que un pedido otorgue
       puntos dos veces.
       ===================================================== */

    procesarPuntosPedido:function(
      pedidoId,
      tel,
      total,
      cada,
      accion
    ){
      return call(
        "POST",
        "/rest/v1/rpc/procesar_puntos_pedido",
        {
          p_pedido_id:String(pedidoId||""),
          p_tel:String(tel||""),
          p_total:Math.round(
            Number(total)||0
          ),
          p_cada:Math.max(
            1,
            Math.round(
              Number(cada)||2000
            )
          ),
          p_accion:
            accion==="revertir"
              ?"revertir"
              :"sumar"
        }
      );
    },

    /* Lectura genérica
       (solo el administrador puede leer puntos, premios y giros). */
    leer:function(tabla,q){
      return call(
        "GET",
        "/rest/v1/"+tabla+"?"+q
      );
    },

    catalogo:function(){
      return Promise.all([
        call(
          "GET",
          "/rest/v1/productos?select=datos,activo&order=creado.asc&limit=1000"
        ),
        call(
          "GET",
          "/rest/v1/ajustes?select=clave,valor"
        )
      ])
      .then(function(r){

        var a={};

        (r[1]||[]).forEach(function(x){
          a[x.clave]=x.valor;
        });

        var ps=(r[0]||[]).map(function(x){

          var d=
            (x.datos&&typeof x.datos==="object")
              ?Object.assign({},x.datos)
              :{};

          d.active=x.activo!==false;

          return limpiarProducto(d);
        });

        last={};

        ps.forEach(function(p){
          last[p.id]=JSON.stringify(p);
        });

        return{
          productos:ps,
          config:a.config,
          puntos:a.puntos,
          ruleta:a.ruleta
        };
      });
    },

    /* Sube solo los productos que cambiaron
       y borra los que ya no están. */
    guardarProductos:function(list){

      var rows=[],
          ids={},
          nuevo={};

      list.forEach(function(p){

        ids[p.id]=1;

        var s=JSON.stringify(p);

        nuevo[p.id]=s;

        if(last[p.id]!==s){

          rows.push({
            id:p.id,
            datos:p,
            activo:p.active!==false
          });

        }
      });

      var quitar=Object.keys(last).filter(function(id){
        return !ids[id]&&/^[A-Za-z0-9_-]+$/.test(id);
      });

      var p1=rows.length
        ?call(
            "POST",
            "/rest/v1/productos",
            rows,
            MERGE
          )
        :Promise.resolve();

      return p1
        .then(function(){

          return quitar.length
            ?call(
                "DELETE",
                "/rest/v1/productos?id=in.("+quitar.join(",")+")",
                null,
                {
                  Prefer:"return=minimal"
                }
              )
            :null;

        })
        .then(function(){
          last=nuevo;
        });
    },

    guardarAjuste:function(clave,valor){
      return call(
        "POST",
        "/rest/v1/ajustes",
        [
          {
            clave:clave,
            valor:valor
          }
        ],
        MERGE
      );
    },

    catalogoPremios:function(){
     return call(
       "GET",
       "/rest/v1/catalogo_premios?select=id,nombre,descripcion,tipo,valor,peso,stock,activo,creado,actualizado&order=creado.desc"
     );
   },

   crearPremio:function(p){
     return call(
       "POST",
       "/rest/v1/catalogo_premios",
       {
         nombre:String(p.nombre||"").trim(),
         descripcion:String(p.descripcion||"").trim(),
         tipo:String(p.tipo||"codigo"),
         valor:p.valor==null?"":String(p.valor),
         peso:Math.max(0,Math.floor(Number(p.peso)||0)),
         stock:p.stock===null||p.stock===undefined||p.stock===""?null:Math.max(0,Math.floor(Number(p.stock)||0)),
         activo:p.activo!==false
       },
       {
         Prefer:"return=representation"
       }
     );
   },

   actualizarPremio:function(id,p){
     return call(
       "PATCH",
       "/rest/v1/catalogo_premios?id=eq."+encodeURIComponent(id),
       {
         nombre:String(p.nombre||"").trim(),
         descripcion:String(p.descripcion||"").trim(),
         tipo:String(p.tipo||"codigo"),
         valor:p.valor==null?"":String(p.valor),
         peso:Math.max(0,Math.floor(Number(p.peso)||0)),
         stock:p.stock===null||p.stock===undefined||p.stock===""?null:Math.max(0,Math.floor(Number(p.stock)||0)),
         activo:p.activo!==false,
         actualizado:new Date().toISOString()
       },
       {
         Prefer:"return=representation"
       }
     ).then(soloSi);
   },

   eliminarPremio:function(id){
     return call(
       "DELETE",
       "/rest/v1/catalogo_premios?id=eq."+encodeURIComponent(id),
       null,
       {
         Prefer:"return=representation"
       }
     ).then(soloSi);
   },

   crear:function(o){

      if(!remote){

        var l=lsGet(
          "tienda_pedidos",
          []
        );

        l.unshift(o);

        return lsSet(
          "tienda_pedidos",
          l
        )
        ?Promise.resolve()
        :Promise.reject(
            new Error(
              "No hay espacio en el navegador."
            )
          );
      }

      return call(
        "POST",
        "/rest/v1/pedidos",
        {
          id:o.id,
          estado:o.estado,
          datos:o
        },
        {
          Prefer:"return=minimal"
        }
      );
    },

    listar:function(){

      if(!remote)
        return Promise.resolve(
          lsGet(
            "tienda_pedidos",
            []
          ).map(normalizarPedido)
        );

      return call(
        "GET",
        "/rest/v1/pedidos?select=id,estado,creado,datos&order=creado.desc&limit=500"
      )
      .then(function(rows){

        return (rows||[]).map(
          normalizarPedido
        );

      });
    },

    actualizar:function(o){

      if(!remote){

        var l=lsGet(
          "tienda_pedidos",
          []
        );

        var i=l.findIndex(function(x){
          return x.id===o.id;
        });

        if(i>-1)
          l[i]=o;

        lsSet(
          "tienda_pedidos",
          l
        );

        return Promise.resolve();
      }

      return call(
        "PATCH",
        "/rest/v1/pedidos?id=eq."+encodeURIComponent(o.id),
        {
          estado:o.estado,
          datos:o
        },
        {
          Prefer:"return=representation"
        }
      )
      .then(soloSi);
    },

    eliminar:function(id){

      if(!remote){

        lsSet(
          "tienda_pedidos",
          lsGet(
            "tienda_pedidos",
            []
          ).filter(function(x){
            return x.id!==id;
          })
        );

        return Promise.resolve();
      }

      return call(
        "DELETE",
        "/rest/v1/pedidos?id=eq."+encodeURIComponent(id),
        null,
        {
          Prefer:"return=representation"
        }
      )
      .then(soloSi);
    }

  };
})();