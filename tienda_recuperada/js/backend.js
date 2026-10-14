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

    /* Reprocesa los puntos de un pedido (solo administrador). Los puntos se suman y restan SOLOS en la base de datos
       cuando cambia el estado del pedido; esto sirve para pedidos pagados antes de instalar el sistema.
       Nunca suma dos veces el mismo pedido. El monto lo calcula la base de datos, no el navegador. */
    procesarPuntosPedido:function(pedidoId){
      return call(
        "POST",
        "/rest/v1/rpc/procesar_puntos_pedido",
        {
          p_pedido_id:String(pedidoId||"")
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

    /* ---------- Puntos, canjes y ruleta (administrador) ---------- */

    ruletaAdmin:function(){
      return call(
        "GET",
        "/rest/v1/catalogo_premios?select=id,nombre,descripcion,tipo,valor,peso,stock,activo&order=id.asc"
      );
    },

    premiosCanje:function(){
      return call(
        "GET",
        "/rest/v1/premios?select=id,nombre,descripcion,costo_puntos,stock,activo&order=costo_puntos.asc,id.asc"
      );
    },

    canjesAdmin:function(){
      return call(
        "GET",
        "/rest/v1/canjes?select=id,ff_id,nombre,costo,origen,estado,creado&order=creado.desc&limit=100"
      );
    },

    clientesPuntos:function(){
      return call(
        "GET",
        "/rest/v1/puntos?select=ff_id,puntos,total_ganado,pin_definido,actualizado&order=puntos.desc&limit=100"
      );
    },

    girosAdmin:function(){
      return call(
        "GET",
        "/rest/v1/giros?select=id,ff_id,premio,puntos_ganados,costo,creado&order=creado.desc&limit=50"
      );
    },

    /* La base de datos valida todo (2 a 12 premios activos, probabilidades enteras que suman exactamente 100). */
    guardarRuleta:function(lista){
      return call(
        "POST",
        "/rest/v1/rpc/admin_guardar_ruleta",
        { p_premios:lista }
      );
    },

    guardarPremioCanje:function(p){
      return call(
        "POST",
        "/rest/v1/rpc/admin_guardar_premio_canje",
        {
          p_id:p.id||null,
          p_nombre:String(p.nombre||"").trim(),
          p_descripcion:String(p.descripcion||"").trim(),
          p_costo:Math.floor(Number(p.costo)||0),
          p_stock:(p.stock===""||p.stock==null)?null:Math.floor(Number(p.stock)),
          p_activo:p.activo!==false
        }
      );
    },

    borrarPremioCanje:function(id){
      return call(
        "POST",
        "/rest/v1/rpc/admin_borrar_premio_canje",
        { p_id:id }
      );
    },

    estadoCanje:function(id,estado){
      return call(
        "POST",
        "/rest/v1/rpc/admin_estado_canje",
        { p_id:id, p_estado:estado }
      );
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