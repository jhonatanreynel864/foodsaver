/*
 * INTERFAZ DE FOODSAVER
 * ---------------------
 * Este archivo solo dibuja la pantalla y atiende los toques y clics.
 * Los cálculos (validar, clasificar, vender, pérdidas, ordenar, filtrar)
 * los hace Java a través de MotorJava.llamar(...).
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------
  //  Estado de la pantalla
  // ---------------------------------------------------------------
  const estado = {
    vista: "inicio",
    productos: [],      // datos crudos de la base de datos
    movimientos: [],
    general: null,      // análisis de Java con todo el inventario
    lista: null,        // análisis de Java con filtro, búsqueda y orden
    historial: null,    // resumen de Java de ventas y pérdidas
    categorias: [],
    filtro: "todos",
    busqueda: "",
    orden: "vence",
    diasAlerta: 7,
    negocio: "Mi tienda",
    hoy: Datos.fechaLocal(),
  };

  const $ = (selector, raiz = document) => raiz.querySelector(selector);
  const $$ = (selector, raiz = document) => Array.from(raiz.querySelectorAll(selector));

  // ---------------------------------------------------------------
  //  Formato (solo presentación)
  // ---------------------------------------------------------------
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const formatoDinero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const formatoPrecio = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
  const formatoFechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });

  const dinero = (n) => "$" + formatoDinero.format(Math.round(Number(n) || 0));
  const precio = (n) => "$" + formatoPrecio.format(Number(n) || 0);
  const unidades = (n) => `${formatoDinero.format(n)} ${n === 1 ? "unidad" : "unidades"}`;
  const productosTexto = (n) => `${n} ${n === 1 ? "producto" : "productos"}`;

  function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function aFecha(iso) {
    const [a, m, d] = String(iso).split("-").map(Number);
    return new Date(a, m - 1, d);
  }

  function partesFecha(iso) {
    const f = aFecha(iso);
    return {
      dia: f.getDate(),
      mes: MESES[f.getMonth()] || "",
      anio: f.getFullYear(),
      semana: DIAS_SEMANA[f.getDay()] || "",
    };
  }

  function sumarDias(iso, dias) {
    const f = aFecha(iso);
    f.setDate(f.getDate() + dias);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  }

  function fechaLarga(iso) {
    const texto = formatoFechaLarga.format(aFecha(iso));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /** Texto corto que explica cuánto le queda al producto. */
  function plazo(p) {
    if (p.estado === "agotado") return "Agotado";
    if (p.dias < -1) return `Venció hace ${-p.dias} días`;
    if (p.dias === -1) return "Venció ayer";
    if (p.dias === 0) return "Vence hoy";
    if (p.dias === 1) return "Vence mañana";
    return `Vence en ${p.dias} días`;
  }

  // Íconos pequeños que acompañan a los textos
  const ICONO = {
    mas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    lapiz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4"/></svg>',
    cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    lupa: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/></svg>',
    bien: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.500 3 3 5-6"/></svg>',
    caja: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/></svg>',
  };

  // ---------------------------------------------------------------
  //  Avisos breves
  // ---------------------------------------------------------------
  function aviso(texto, tipo = "ok") {
    const caja = document.createElement("div");
    caja.className = `aviso aviso--${tipo}`;
    caja.textContent = texto;
    $("#avisos").appendChild(caja);
    setTimeout(() => caja.classList.add("aviso--fuera"), 3600);
    setTimeout(() => caja.remove(), 4000);
  }

  // ---------------------------------------------------------------
  //  Datos -> Java -> pantalla
  // ---------------------------------------------------------------
  const limpiar = (texto) => String(texto ?? "").replace(/[\t\n\r]+/g, " ").trim();

  function inventarioComoTexto() {
    return estado.productos
      .map((p) => [p.id, limpiar(p.nombre), limpiar(p.categoria), p.cantidad, p.precio, p.vence].join("\t"))
      .join("\n");
  }

  function movimientosComoTexto() {
    return estado.movimientos
      .map((m) => [m.tipo, m.cantidad, m.total, m.fecha].join("\t"))
      .join("\n");
  }

  async function recalcular() {
    estado.hoy = Datos.fechaLocal();
    const texto = inventarioComoTexto();
    const [general, lista, historial] = await Promise.all([
      MotorJava.llamar("analizar", texto, estado.hoy, estado.diasAlerta, "todos", "", "vence"),
      MotorJava.llamar("analizar", texto, estado.hoy, estado.diasAlerta, estado.filtro, estado.busqueda, estado.orden),
      MotorJava.llamar("historial", movimientosComoTexto(), estado.hoy),
    ]);
    if (!general.ok || !lista.ok || !historial.ok) {
      throw new Error(general.error || lista.error || historial.error || "Java no pudo calcular el inventario.");
    }
    estado.general = general;
    estado.lista = lista;
    estado.historial = historial;
    pintar();
  }

  async function recalcularLista() {
    const lista = await MotorJava.llamar("analizar", inventarioComoTexto(), estado.hoy,
      estado.diasAlerta, estado.filtro, estado.busqueda, estado.orden);
    if (lista.ok) {
      estado.lista = lista;
      if (estado.vista === "productos") pintarProductos();
    }
  }

  async function cargarDatos() {
    const [productos, movimientos] = await Promise.all([Datos.listarProductos(), Datos.listarMovimientos()]);
    estado.productos = productos;
    estado.movimientos = movimientos;
    await recalcular();
  }

  async function intentar(tarea) {
    try {
      await tarea();
      return true;
    } catch (error) {
      console.error(error);
      aviso(error.message || "Algo salió mal. Inténtalo otra vez.", "error");
      return false;
    }
  }

  // ---------------------------------------------------------------
  //  Piezas reutilizables
  // ---------------------------------------------------------------

  /** Cuadro con la fecha de vencimiento, pintado según el estado. */
  function fecha(p) {
    const f = partesFecha(p.vence);
    const otroAnio = f.anio !== aFecha(estado.hoy).getFullYear();
    return `
      <div class="fecha fecha--${p.estado}" aria-hidden="true">
        <span class="fecha__mes">${f.mes}</span>
        <span class="fecha__dia">${f.dia}</span>
        ${otroAnio ? `<span class="fecha__anio">${f.anio}</span>` : ""}
      </div>`;
  }

  function pastilla(p) {
    return `<span class="pastilla pastilla--${p.estado}">${plazo(p)}</span>`;
  }

  /** Barra de vida: cuánto le queda al producto dentro de una ventana de 30 días. */
  function barraVida(p) {
    let ancho = 0;
    if (p.estado === "vencido") ancho = 100;
    else if (p.estado !== "agotado") ancho = Math.max(4, Math.min(100, (p.dias / 30) * 100));
    return `<div class="vida vida--${p.estado}"><span style="width:${ancho}%"></span></div>`;
  }

  function accionPrincipal(p, clase = "") {
    if (p.estado === "vencido") {
      return `<button class="btn btn--peligro ${clase}" type="button" data-accion="baja" data-id="${esc(p.id)}">Retirar</button>`;
    }
    if (p.estado === "agotado") {
      return `<button class="btn btn--suave ${clase}" type="button" data-accion="editar" data-id="${esc(p.id)}">Reabastecer</button>`;
    }
    return `<button class="btn btn--principal ${clase}" type="button" data-accion="vender" data-id="${esc(p.id)}">Vender</button>`;
  }

  function vacio(icono, titulo, texto, boton = "") {
    return `
      <div class="vacio">
        <div class="vacio__icono" aria-hidden="true">${icono}</div>
        <h3>${titulo}</h3>
        <p>${texto}</p>
        ${boton}
      </div>`;
  }

  const botonAgregar = `<button class="btn btn--principal" type="button" data-accion="nuevo">${ICONO.mas}Agregar producto</button>`;

  // ---------------------------------------------------------------
  //  Vista: INICIO
  // ---------------------------------------------------------------
  function frasePrincipal(r) {
    const dias = r.diasAlerta === 1 ? "el próximo día" : `los próximos ${r.diasAlerta} días`;
    if (r.total === 0) {
      return "Aún no tienes productos. Agrega el primero para empezar.";
    }
    if (r.perdida > 0 && r.enRiesgo > 0) {
      return `Tienes <mark class="marca-rojo">${dinero(r.perdida)}</mark> en productos vencidos y <mark class="marca-ambar">${dinero(r.enRiesgo)}</mark> por vender en ${dias}.`;
    }
    if (r.perdida > 0) {
      return `Tienes <mark class="marca-rojo">${dinero(r.perdida)}</mark> en productos vencidos. Lo demás está en buen estado.`;
    }
    if (r.enRiesgo > 0) {
      return `Nada vencido. Tienes <mark class="marca-ambar">${dinero(r.enRiesgo)}</mark> por vender en ${dias}.`;
    }
    return "Todo al día: no hay productos vencidos ni por vencer.";
  }

  function tarjetasEstado(r) {
    const tarjeta = (clave, titulo, cuenta, valor, nota) => `
      <button class="tarjeta tarjeta--${clave}" type="button" data-accion="ver-filtro" data-filtro="${clave}">
        <span class="tarjeta__titulo"><i></i>${titulo}</span>
        <strong class="tarjeta__cuenta">${cuenta}</strong>
        <span class="tarjeta__nota">${nota}</span>
        <span class="tarjeta__valor">${dinero(valor)}</span>
        <span class="tarjeta__ver">Ver ${ICONO.flecha}</span>
      </button>`;
    return `
      <div class="tarjetas">
        ${tarjeta("vencido", "Vencidos", r.vencidos, r.perdida, "Ya no se pueden vender")}
        ${tarjeta("por_vencer", "Por vencer", r.porVencer, r.enRiesgo, `Les quedan ${r.diasAlerta} días o menos`)}
        ${tarjeta("vigente", "En buen estado", r.vigentes, r.valorVigente, "Con tiempo de sobra")}
      </div>`;
  }

  function semana(productos) {
    const conUnidades = productos.filter((p) => p.estado !== "agotado");
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const f = partesFecha(sumarDias(estado.hoy, i));
      dias.push({
        titulo: i === 0 ? "Hoy" : i === 1 ? "Mañana" : f.semana,
        numero: f.dia,
        items: conUnidades.filter((p) => p.dias === i),
        hoy: i === 0,
      });
    }
    return `
      <div class="semana" role="list">
        ${dias.map((d) => `
          <div class="semana__dia ${d.hoy ? "semana__dia--hoy" : ""} ${d.items.length ? "semana__dia--con" : ""}" role="listitem">
            <span class="semana__titulo">${d.titulo}</span>
            <span class="semana__numero">${d.numero}</span>
            ${d.items.length
              ? `<span class="semana__cuenta">${productosTexto(d.items.length)}</span>
                 <span class="semana__nombres">${d.items.slice(0, 2).map((p) => esc(p.nombre)).join(", ")}${d.items.length > 2 ? ` y ${d.items.length - 2} más` : ""}</span>`
              : `<span class="semana__nada">Nada vence</span>`}
          </div>`).join("")}
      </div>`;
  }

  function pintarInicio() {
    const g = estado.general;
    const r = g.resumen;
    const vista = $("#vista");
    const heroe = `
      <div class="heroe">
        <p class="heroe__saludo">Hola, ${esc(estado.negocio)}</p>
        <p class="frase">${frasePrincipal(r)}</p>
      </div>`;
    if (r.total === 0) {
      vista.innerHTML = heroe + vacio(ICONO.caja, "Empieza por tu primer producto",
        "Escribe el nombre, cuántas unidades tienes, el precio y la fecha de vencimiento. FoodSaver te avisa antes de que se pierda.", botonAgregar);
      return;
    }
    const conAlerta = r.vencidos + r.porVencer;
    vista.innerHTML = `
      ${heroe}
      ${tarjetasEstado(r)}

      <section class="bloque">
        <div class="bloque__cabeza">
          <h2>Qué hacer hoy</h2>
          <p>Empieza por arriba: es lo más urgente.</p>
        </div>
        ${g.alertas.length ? `
          <ol class="urgentes">
            ${g.alertas.map((p) => `
              <li class="urgente">
                ${fecha(p)}
                <div class="urgente__texto">
                  <strong>${esc(p.nombre)}</strong>
                  <span>${pastilla(p)} <span class="urgente__dato">${unidades(p.cantidad)} · ${dinero(p.valor)}</span></span>
                </div>
                ${accionPrincipal(p, "btn--chico")}
              </li>`).join("")}
          </ol>
          ${conAlerta > g.alertas.length ? `<button class="btn-texto" type="button" data-accion="ver-filtro" data-filtro="todos">Ver los ${conAlerta} productos que necesitan atención</button>` : ""}`
          : `<div class="tranquilo">${ICONO.bien}<p><strong>Nada urgente.</strong> Todos tus productos tienen más de ${r.diasAlerta} días antes de vencer.</p></div>`}
      </section>

      <section class="bloque">
        <div class="bloque__cabeza">
          <h2>Tus próximos 7 días</h2>
          <p>Qué se vence cada día.</p>
        </div>
        ${semana(g.productos)}
      </section>`;
  }

  // ---------------------------------------------------------------
  //  Vista: PRODUCTOS (inventario)
  // ---------------------------------------------------------------
  function filaProducto(p) {
    const rotuloValor = p.estado === "vencido" ? "Pérdida" : p.estado === "por_vencer" ? "En riesgo" : "Valor";
    return `
      <article class="etiqueta etiqueta--${p.estado}">
        ${fecha(p)}
        <div class="etiqueta__cuerpo">
          <h3>${esc(p.nombre)}</h3>
          <p class="etiqueta__meta">${esc(p.categoria)} · ${unidades(p.cantidad)} · ${precio(p.precio)} cada una</p>
          <div class="etiqueta__plazo">${pastilla(p)}${barraVida(p)}</div>
        </div>
        <div class="etiqueta__valor">
          <span>${rotuloValor}</span>
          <strong>${dinero(p.valor)}</strong>
        </div>
        <div class="etiqueta__acciones">
          ${accionPrincipal(p)}
          <button class="btn btn--linea" type="button" data-accion="editar" data-id="${esc(p.id)}" aria-label="Editar ${esc(p.nombre)}">${ICONO.lapiz}Editar</button>
        </div>
      </article>`;
  }

  function pintarProductos() {
    const vista = $("#vista");
    const r = estado.general.resumen;
    if (!$("#lista-productos", vista)) {
      vista.innerHTML = `
        <div class="herramientas">
          <label class="buscador">
            ${ICONO.lupa}
            <input id="campo-busqueda" type="search" placeholder="Buscar un producto…" autocomplete="off" aria-label="Buscar producto" value="${esc(estado.busqueda)}">
          </label>
          <label class="orden">
            <span>Ordenar por</span>
            <select id="campo-orden" aria-label="Ordenar por">
              <option value="vence">Lo que vence primero</option>
              <option value="nombre">Nombre (A–Z)</option>
              <option value="valor">Mayor valor</option>
              <option value="cantidad">Menor cantidad</option>
            </select>
          </label>
        </div>
        <div id="fichas" class="fichas" role="group" aria-label="Mostrar"></div>
        <div id="lista-productos" class="lista"></div>`;
      $("#campo-orden", vista).value = estado.orden;
    }
    const fichas = [
      ["todos", "Todos", r.total],
      ["vencido", "Vencidos", r.vencidos],
      ["por_vencer", "Por vencer", r.porVencer],
      ["vigente", "En buen estado", r.vigentes],
      ["agotado", "Agotados", r.agotados],
    ];
    $("#fichas", vista).innerHTML = fichas.map(([clave, nombre, cuenta]) => `
      <button class="ficha ficha--${clave} ${estado.filtro === clave ? "ficha--activa" : ""}" type="button"
              data-accion="filtrar" data-filtro="${clave}" aria-pressed="${estado.filtro === clave}">
        ${nombre}<span>${cuenta}</span>
      </button>`).join("");

    const productos = estado.lista.productos;
    const lista = $("#lista-productos", vista);
    if (r.total === 0) {
      lista.innerHTML = vacio(ICONO.caja, "Aún no hay productos", "Agrega lo que tienes en la tienda con su fecha de vencimiento.", botonAgregar);
    } else if (productos.length === 0) {
      lista.innerHTML = vacio(ICONO.lupa, "No encontramos nada", "Ningún producto coincide con lo que buscas.",
        `<button class="btn btn--suave" type="button" data-accion="limpiar-filtros">Ver todos los productos</button>`);
    } else {
      lista.innerHTML = productos.map(filaProducto).join("");
    }
  }

  // ---------------------------------------------------------------
  //  Vista: REPORTES
  // ---------------------------------------------------------------
  function graficoDias(h) {
    const mayor = h.mayorDia > 0 ? h.mayorDia : 1;
    const alto = (v) => (v > 0 ? Math.max(3, (v / mayor) * 100) : 0);
    return `
      <div class="grafico" role="img" aria-label="Dinero vendido y perdido por día en los últimos 14 días">
        ${h.dias.map((d, i) => {
          const f = partesFecha(d.fecha);
          const esHoy = i === h.dias.length - 1;
          return `
            <div class="grafico__dia ${esHoy ? "grafico__dia--hoy" : ""}" title="${f.dia} ${f.mes}: vendido ${dinero(d.ventas)}, perdido ${dinero(d.bajas)}">
              <div class="grafico__barras">
                <span class="grafico__barra grafico__barra--venta" style="height:${alto(d.ventas)}%"></span>
                <span class="grafico__barra grafico__barra--baja" style="height:${alto(d.bajas)}%"></span>
              </div>
              <span class="grafico__rotulo">${esHoy ? "Hoy" : f.dia}</span>
            </div>`;
        }).join("")}
      </div>
      <div class="leyenda">
        <span><i class="leyenda__venta"></i>Vendido</span>
        <span><i class="leyenda__baja"></i>Perdido</span>
        <span class="leyenda__max">El mejor día: ${dinero(h.mayorDia)}</span>
      </div>`;
  }

  function pintarReportes() {
    const r = estado.general.resumen;
    const h = estado.historial;
    const cats = estado.general.categorias;
    const maxCat = Math.max(1, ...cats.map((c) => c.vencido + c.porVencer + c.vigente));
    const de100 = Math.round(h.tasaDesperdicio);
    const hayMovimientos = h.registrosVentas + h.registrosBajas > 0;

    $("#vista").innerHTML = `
      <div class="cifras">
        <div class="cifra cifra--rojo">
          <span class="cifra__rotulo">Vencido sin retirar</span>
          <strong>${dinero(r.perdida)}</strong>
          <span class="cifra__nota">${productosTexto(r.vencidos)} en la tienda que ya no se pueden vender</span>
        </div>
        <div class="cifra cifra--ambar">
          <span class="cifra__rotulo">Por vencer</span>
          <strong>${dinero(r.enRiesgo)}</strong>
          <span class="cifra__nota">${productosTexto(r.porVencer)} que aún puedes vender a tiempo</span>
        </div>
        <div class="cifra">
          <span class="cifra__rotulo">Ya perdido</span>
          <strong>${dinero(h.totalBajas)}</strong>
          <span class="cifra__nota">${unidades(h.unidadesPerdidas)} retiradas por daño o vencimiento</span>
        </div>
      </div>

      <section class="bloque panel">
        <p class="frase frase--media">
          ${hayMovimientos
            ? `De cada <strong>$100</strong> que salieron de tu tienda, <mark class="${de100 > 0 ? "marca-rojo" : "marca-verde"}">$${de100}</mark> ${de100 === 1 ? "se perdió" : "se perdieron"}.`
            : "Cuando registres ventas y pérdidas, aquí verás qué parte de tu mercancía se desperdicia."}
        </p>
        <div class="medidor" aria-hidden="true"><span style="width:${Math.min(100, h.tasaDesperdicio)}%"></span></div>
        <p class="frase__pie">Vendiste ${dinero(h.totalVentas)} en ${h.registrosVentas} ${h.registrosVentas === 1 ? "venta" : "ventas"} y perdiste ${dinero(h.totalBajas)} en ${h.registrosBajas} ${h.registrosBajas === 1 ? "retiro" : "retiros"}.</p>
      </section>

      <div class="dos-columnas">
        <section class="bloque panel">
          <div class="bloque__cabeza">
            <h2>Vendido y perdido por día</h2>
            <p>Últimos 14 días.</p>
          </div>
          ${graficoDias(h)}
        </section>

        <section class="bloque panel">
          <div class="bloque__cabeza">
            <h2>Tu dinero por categoría</h2>
            <p>Cuánto vale lo que tienes hoy.</p>
          </div>
          ${cats.length ? `
            <div class="categorias">
              ${cats.map((c) => {
                const total = c.vencido + c.porVencer + c.vigente;
                const pct = (v) => (v / maxCat) * 100;
                return `
                  <div class="categoria">
                    <div class="categoria__texto">
                      <strong>${esc(c.nombre)}</strong>
                      <span>${dinero(total)}</span>
                    </div>
                    <div class="categoria__barra" title="Vencido ${dinero(c.vencido)} · Por vencer ${dinero(c.porVencer)} · En buen estado ${dinero(c.vigente)}">
                      <i class="categoria__vencido" style="width:${pct(c.vencido)}%"></i>
                      <i class="categoria__ambar" style="width:${pct(c.porVencer)}%"></i>
                      <i class="categoria__verde" style="width:${pct(c.vigente)}%"></i>
                    </div>
                    ${c.vencido > 0 || c.porVencer > 0 ? `<p class="categoria__nota">${c.vencido > 0 ? `<b class="t-rojo">${dinero(c.vencido)} vencido</b>` : ""}${c.vencido > 0 && c.porVencer > 0 ? " · " : ""}${c.porVencer > 0 ? `<b class="t-ambar">${dinero(c.porVencer)} por vencer</b>` : ""}</p>` : ""}
                  </div>`;
              }).join("")}
            </div>
            <div class="leyenda">
              <span><i class="leyenda__baja"></i>Vencido</span>
              <span><i class="leyenda__ambar"></i>Por vencer</span>
              <span><i class="leyenda__verde"></i>En buen estado</span>
            </div>` : `<p class="nota-suave">Aún no hay productos.</p>`}
        </section>
      </div>

      <section class="bloque panel">
        <div class="bloque__cabeza">
          <h2>Últimos movimientos</h2>
          <p>Cada venta y cada pérdida que registras.</p>
        </div>
        ${estado.movimientos.length ? `
          <ul class="movimientos">
            ${estado.movimientos.slice(0, 40).map((m) => {
              const f = partesFecha(m.fecha);
              const esBaja = m.tipo === "baja";
              return `
                <li class="movimiento">
                  <span class="movimiento__tipo movimiento__tipo--${esBaja ? "baja" : "venta"}">${esBaja ? "Pérdida" : "Venta"}</span>
                  <span class="movimiento__nombre">${esc(m.productoNombre)}<small>${unidades(m.cantidad)} · ${f.dia} ${f.mes}</small></span>
                  <strong class="movimiento__total ${esBaja ? "t-rojo" : ""}">${esBaja ? "−" : "+"}${dinero(m.total)}</strong>
                </li>`;
            }).join("")}
          </ul>` : `<p class="nota-suave">Todavía no has registrado ventas ni pérdidas.</p>`}
      </section>`;
  }

  // ---------------------------------------------------------------
  //  Pintar la vista activa y la navegación
  // ---------------------------------------------------------------
  const VISTAS = {
    inicio: ["Inicio", "Lo más importante de tu tienda hoy."],
    productos: ["Productos", "Todo lo que tienes en la tienda."],
    reportes: ["Reportes", "Cuánto se ha vendido, cuánto se ha perdido y cuánto puedes salvar."],
  };

  function pintar() {
    if (!estado.general) return;
    const r = estado.general.resumen;
    $("#cabecera-titulo").textContent = VISTAS[estado.vista][0];
    $("#cabecera-sub").textContent = VISTAS[estado.vista][1];
    $("#cabecera-fecha").textContent = fechaLarga(estado.hoy);
    $("#rail-negocio").textContent = estado.negocio;
    $$("[data-vista]").forEach((b) => {
      const activo = b.dataset.vista === estado.vista;
      b.classList.toggle("activo", activo);
      if (activo) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    const alertas = r.vencidos + r.porVencer;
    $$('[data-cuenta="alertas"]').forEach((e) => { e.textContent = alertas || ""; e.hidden = !alertas; });

    if (estado.vista === "inicio") pintarInicio();
    else if (estado.vista === "productos") pintarProductos();
    else pintarReportes();
  }

  /** Activa la animación de entrada solo cuando se cambia de sección. */
  let relojEntrada = null;
  function animarEntrada() {
    const vista = $("#vista");
    vista.classList.remove("vista--entra");
    void vista.offsetWidth;
    vista.classList.add("vista--entra");
    clearTimeout(relojEntrada);
    relojEntrada = setTimeout(() => vista.classList.remove("vista--entra"), 900);
  }

  function irA(vista) {
    if (!VISTAS[vista]) return;
    estado.vista = vista;
    $("#vista").innerHTML = "";
    pintar();
    animarEntrada();
    window.scrollTo({ top: 0 });
  }

  // ---------------------------------------------------------------
  //  Ventanas (modales)
  // ---------------------------------------------------------------
  let focoAnterior = null;

  function abrirModal(titulo, cuerpo, alMontar) {
    if ($("#capa-modal").hidden) focoAnterior = document.activeElement;
    const capa = $("#capa-modal");
    capa.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" tabindex="-1">
        <header class="modal__cabeza">
          <h2 id="modal-titulo">${titulo}</h2>
          <button class="btn-icono" type="button" data-accion="cerrar-modal" aria-label="Cerrar">${ICONO.cerrar}</button>
        </header>
        <div class="modal__cuerpo">${cuerpo}</div>
      </div>`;
    capa.hidden = false;
    document.body.classList.add("sin-desplazar");
    const modal = $(".modal", capa);
    if (alMontar) alMontar(modal);
    // En pantallas táctiles no se enfoca un campo para que el teclado no tape la ventana
    const tactil = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const primero = tactil ? modal : ($("[data-foco]", modal) || $("input, select, button.btn", modal));
    if (primero) primero.focus({ preventScroll: true });
    return modal;
  }

  function cerrarModal() {
    const capa = $("#capa-modal");
    capa.hidden = true;
    capa.innerHTML = "";
    document.body.classList.remove("sin-desplazar");
    if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus();
  }

  function ocupar(boton, ocupado, texto) {
    if (!boton) return;
    if (ocupado) {
      boton.dataset.textoOriginal = boton.textContent;
      boton.disabled = true;
      boton.textContent = texto || "Guardando…";
    } else {
      boton.disabled = false;
      boton.textContent = boton.dataset.textoOriginal || boton.textContent;
    }
  }

  const productoPorId = (id) => estado.productos.find((p) => p.id === id);
  const analizadoPorId = (id) => estado.general.productos.find((p) => p.id === id);

  // ---- Agregar / editar producto ----------------------------------
  function abrirFormularioProducto(id) {
    const p = id ? productoPorId(id) : null;
    if (id && !p) return;
    const campo = (nombre, rotulo, entrada, ayuda = "") => `
      <label class="campo" data-campo="${nombre}">
        <span class="campo__rotulo">${rotulo}</span>
        ${entrada}
        ${ayuda ? `<span class="campo__ayuda">${ayuda}</span>` : ""}
        <span class="campo__error" role="alert"></span>
      </label>`;
    const cuerpo = `
      <form id="form-producto" novalidate>
        ${campo("nombre", "¿Qué producto es?", `<input class="campo__entrada" name="nombre" type="text" maxlength="60" placeholder="Ej. Leche entera 1 L" autocomplete="off" data-foco value="${esc(p ? p.nombre : "")}">`)}
        ${campo("categoria", "Categoría", `
          <select class="campo__entrada" name="categoria">
            <option value="">Elige una…</option>
            ${estado.categorias.map((c) => `<option ${p && p.categoria === c ? "selected" : ""}>${esc(c)}</option>`).join("")}
          </select>`)}
        <div class="campos-2">
          ${campo("cantidad", "¿Cuántas unidades?", `<input class="campo__entrada" name="cantidad" type="text" inputmode="numeric" placeholder="Ej. 12" autocomplete="off" value="${p ? p.cantidad : ""}">`)}
          ${campo("precio", "Precio de cada una", `<input class="campo__entrada" name="precio" type="text" inputmode="decimal" placeholder="Ej. 4200" autocomplete="off" value="${p ? p.precio : ""}">`)}
        </div>
        ${campo("vence", "¿Cuándo se vence?", `<input class="campo__entrada" name="vence" type="date" min="2000-01-01" max="2100-12-31" value="${p ? esc(p.vence) : ""}">`, "Es la fecha que viene impresa en el empaque.")}
        <div class="modal__pie">
          <button class="btn btn--linea" type="button" data-accion="cerrar-modal">Cancelar</button>
          <button class="btn btn--principal" type="submit">${p ? "Guardar cambios" : "Agregar producto"}</button>
        </div>
        ${p ? `<button class="btn-texto btn-texto--peligro modal__eliminar" type="button" data-accion="eliminar" data-id="${esc(p.id)}">Eliminar este producto</button>` : ""}
      </form>`;

    abrirModal(p ? "Editar producto" : "Agregar producto", cuerpo, (modal) => {
      const form = $("#form-producto", modal);
      form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const boton = $('button[type="submit"]', form);
        const v = Object.fromEntries(new FormData(form).entries());
        ocupar(boton, true, "Revisando…");
        await intentar(async () => {
          // La validación la hace Java
          const r = await MotorJava.llamar("validarProducto", v.nombre, v.categoria, v.cantidad, v.precio, v.vence, estado.hoy, p ? "si" : "no");
          if (r.error) throw new Error(r.error);
          let primeroConError = null;
          for (const nombre of ["nombre", "categoria", "cantidad", "precio", "vence"]) {
            const caja = $(`[data-campo="${nombre}"]`, form);
            const mensaje = r.errores[nombre] || "";
            caja.classList.toggle("campo--error", Boolean(mensaje));
            $(".campo__error", caja).textContent = mensaje;
            if (mensaje && !primeroConError) primeroConError = $(".campo__entrada", caja);
          }
          if (!r.ok) {
            if (primeroConError) primeroConError.focus();
            return;
          }
          if (p) await Datos.actualizarProducto(p.id, r.limpio);
          else await Datos.crearProducto(r.limpio);
          await cargarDatos();
          cerrarModal();
          aviso(r.aviso || (p ? "Cambios guardados." : `${r.limpio.nombre} quedó registrado.`), r.aviso ? "atento" : "ok");
        });
        ocupar(boton, false);
      });
    });
  }

  // ---- Registrar una salida: venta o pérdida ----------------------
  function abrirMovimiento(id, tipoInicial) {
    const p = productoPorId(id);
    const a = analizadoPorId(id);
    if (!p || !a) return;
    const vencido = a.estado === "vencido";
    let tipo = vencido ? "baja" : tipoInicial;

    const cuerpo = `
      <form id="form-movimiento" novalidate>
        <div class="resumen-producto">
          ${fecha(a)}
          <div>
            <strong>${esc(p.nombre)}</strong>
            <span>${unidades(p.cantidad)} en la tienda · ${precio(p.precio)} cada una</span>
            ${pastilla(a)}
          </div>
        </div>
        ${vencido
          ? `<p class="form__nota">Este producto ya venció y no se puede vender. Retíralo para llevar la cuenta de lo que se perdió.</p>`
          : `<div class="campo">
               <span class="campo__rotulo" id="rotulo-tipo">¿Qué pasó con el producto?</span>
               <div class="opciones" role="radiogroup" aria-labelledby="rotulo-tipo">
                 <label class="opcion"><input type="radio" name="tipo" value="venta" ${tipo === "venta" ? "checked" : ""}><span>Lo vendí</span></label>
                 <label class="opcion"><input type="radio" name="tipo" value="baja" ${tipo === "baja" ? "checked" : ""}><span>Se dañó o se perdió</span></label>
               </div>
             </div>`}
        <div class="campo" data-campo="cantidad">
          <span class="campo__rotulo" id="rotulo-cantidad">¿Cuántas unidades?</span>
          <div class="contador">
            <button class="contador__boton" type="button" data-paso="-1" aria-label="Quitar una unidad">−</button>
            <input class="campo__entrada contador__entrada" name="cantidad" type="text" inputmode="numeric" autocomplete="off" value="${vencido ? p.cantidad : 1}" aria-labelledby="rotulo-cantidad" data-foco>
            <button class="contador__boton" type="button" data-paso="1" aria-label="Agregar una unidad">+</button>
            <button class="btn-texto" type="button" data-todo>Todas (${p.cantidad})</button>
          </div>
          <span class="campo__error" role="alert"></span>
        </div>
        <div class="cuenta" id="cuenta-previa" aria-live="polite">
          <span id="cuenta-rotulo"></span>
          <strong id="cuenta-total">—</strong>
          <small id="cuenta-quedan"></small>
        </div>
        <div class="modal__pie">
          <button class="btn btn--linea" type="button" data-accion="cerrar-modal">Cancelar</button>
          <button class="btn" type="submit"></button>
        </div>
      </form>`;

    abrirModal("", cuerpo, (modal) => {
      const form = $("#form-movimiento", modal);
      const entrada = $('input[name="cantidad"]', form);
      const caja = $('[data-campo="cantidad"]', form);
      const boton = $('button[type="submit"]', form);

      function ponerTipo() {
        const esVenta = tipo === "venta";
        $("#modal-titulo", modal).textContent = esVenta ? "Registrar venta" : "Registrar pérdida";
        $("#cuenta-rotulo", form).textContent = esVenta ? "Total de la venta" : "Dinero perdido";
        $("#cuenta-previa", form).classList.toggle("cuenta--baja", !esVenta);
        boton.className = `btn ${esVenta ? "btn--principal" : "btn--peligro"}`;
        boton.textContent = esVenta ? "Registrar venta" : vencido ? "Retirar producto" : "Registrar pérdida";
      }

      // Java revisa la operación cada vez que cambia la cantidad
      const consultar = () => tipo === "venta"
        ? MotorJava.llamar("vender", p.cantidad, entrada.value, p.precio, p.vence, estado.hoy)
        : MotorJava.llamar("baja", p.cantidad, entrada.value, p.precio);

      let turno = 0;
      async function previsualizar() {
        const miTurno = ++turno;
        const r = await consultar().catch(() => ({ ok: false, error: "No se pudo calcular." }));
        if (miTurno !== turno) return;
        caja.classList.toggle("campo--error", !r.ok);
        $(".campo__error", caja).textContent = r.ok ? "" : r.error;
        $("#cuenta-total", form).textContent = r.ok ? dinero(r.total) : "—";
        $("#cuenta-quedan", form).textContent = r.ok
          ? (r.nuevaCantidad === 0 ? "El producto queda agotado" : `Quedarán ${unidades(r.nuevaCantidad)}`) : "";
        boton.disabled = !r.ok;
      }

      $$('input[name="tipo"]', form).forEach((radio) => radio.addEventListener("change", () => {
        tipo = radio.value;
        ponerTipo();
        previsualizar();
      }));
      entrada.addEventListener("input", previsualizar);
      $$("[data-paso]", form).forEach((b) => b.addEventListener("click", () => {
        const actual = parseInt(entrada.value, 10) || 0;
        entrada.value = Math.max(1, Math.min(p.cantidad, actual + Number(b.dataset.paso)));
        previsualizar();
      }));
      $("[data-todo]", form).addEventListener("click", () => { entrada.value = p.cantidad; previsualizar(); });
      ponerTipo();
      previsualizar();

      form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const esVenta = tipo === "venta";
        ocupar(boton, true);
        const bien = await intentar(async () => {
          const r = await consultar();
          if (!r.ok) throw new Error(r.error);
          await Datos.actualizarProducto(p.id, { cantidad: r.nuevaCantidad });
          await Datos.crearMovimiento({
            productoId: p.id, productoNombre: p.nombre, categoria: p.categoria,
            tipo: esVenta ? "venta" : "baja", cantidad: r.cantidad,
            precioUnitario: p.precio, total: r.total, fecha: estado.hoy,
          });
          await cargarDatos();
          cerrarModal();
          aviso(esVenta
            ? `Venta registrada: ${dinero(r.total)}.`
            : `Pérdida registrada: ${dinero(r.total)}.`, esVenta ? "ok" : "atento");
        });
        if (!bien) { ocupar(boton, false); ponerTipo(); previsualizar(); }
      });
    });
  }

  // ---- Eliminar ----------------------------------------------------
  function abrirEliminar(id) {
    const p = productoPorId(id);
    if (!p) return;
    abrirModal("¿Eliminar este producto?", `
      <p class="form__nota">Vas a borrar <strong>${esc(p.nombre)}</strong> de tu lista. Sus ventas y pérdidas anteriores se conservan en Reportes. Esto no se puede deshacer.</p>
      <div class="modal__pie">
        <button class="btn btn--linea" type="button" data-accion="cerrar-modal" data-foco>No, conservar</button>
        <button class="btn btn--peligro" type="button" id="confirmar-eliminar">Sí, eliminar</button>
      </div>`, (modal) => {
      $("#confirmar-eliminar", modal).addEventListener("click", async (evento) => {
        const boton = evento.currentTarget;
        ocupar(boton, true, "Eliminando…");
        const bien = await intentar(async () => {
          await Datos.eliminarProducto(p.id);
          await cargarDatos();
          cerrarModal();
          aviso(`${p.nombre} se eliminó.`);
        });
        if (!bien) ocupar(boton, false);
      });
    });
  }

  // ---- Ajustes -----------------------------------------------------
  function abrirAjustes() {
    const enDemo = Datos.modo() === "local";
    abrirModal("Ajustes", `
      <form id="form-ajustes" novalidate>
        <label class="campo">
          <span class="campo__rotulo">Nombre de tu tienda</span>
          <input class="campo__entrada" name="negocio" type="text" maxlength="40" value="${esc(estado.negocio)}" autocomplete="organization">
        </label>
        <div class="campo">
          <span class="campo__rotulo" id="rotulo-dias">¿Con cuántos días de anticipación te avisamos?</span>
          <div class="contador">
            <button class="contador__boton" type="button" data-paso="-1" aria-label="Un día menos">−</button>
            <input class="campo__entrada contador__entrada" name="dias" type="text" inputmode="numeric" value="${estado.diasAlerta}" aria-labelledby="rotulo-dias">
            <button class="contador__boton" type="button" data-paso="1" aria-label="Un día más">+</button>
            <span class="contador__unidad">días antes</span>
          </div>
          <span class="campo__ayuda">Un producto aparece como “por vencer” cuando le quedan estos días o menos. Puedes elegir entre 1 y 60.</span>
        </div>
        <div class="ajustes__cuenta">
          ${enDemo
            ? `<p><strong>Estás probando FoodSaver.</strong> Lo que registres se guarda solo en este dispositivo.</p>
               <button class="btn-texto" type="button" data-accion="reiniciar-demo">Volver a los productos de ejemplo</button>
               ${Datos.hayNube()
                 ? `<button class="btn-texto" type="button" data-accion="salir">Entrar con mi cuenta</button>`
                 : `<p class="ajustes__nota">Para guardar en la nube, conecta Supabase en <code>js/config.js</code>.</p>`}`
            : `<p>Entraste como <strong>${esc(Datos.correo())}</strong>. Tus datos se guardan en la nube.</p>
               <button class="btn-texto" type="button" data-accion="salir">Cerrar sesión</button>`}
        </div>
        <div class="modal__pie">
          <button class="btn btn--linea" type="button" data-accion="cerrar-modal">Cancelar</button>
          <button class="btn btn--principal" type="submit">Guardar</button>
        </div>
      </form>`, (modal) => {
      const form = $("#form-ajustes", modal);
      const dias = $('input[name="dias"]', form);
      const acotar = (n) => Math.max(1, Math.min(60, n || 7));
      $$("[data-paso]", form).forEach((b) => b.addEventListener("click", () => {
        dias.value = acotar((parseInt(dias.value, 10) || 0) + Number(b.dataset.paso));
      }));
      form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        estado.negocio = limpiar($('input[name="negocio"]', form).value) || "Mi tienda";
        estado.diasAlerta = acotar(parseInt(dias.value, 10));
        guardarPreferencias();
        cerrarModal();
        if (await intentar(recalcular)) aviso("Ajustes guardados.");
      });
    });
  }

  function guardarPreferencias() {
    try {
      localStorage.setItem("foodsaver_preferencias", JSON.stringify({ negocio: estado.negocio, diasAlerta: estado.diasAlerta }));
    } catch (e) { /* sin almacenamiento */ }
  }

  function leerPreferencias() {
    try {
      const p = JSON.parse(localStorage.getItem("foodsaver_preferencias")) || {};
      if (typeof p.negocio === "string" && p.negocio.trim()) estado.negocio = p.negocio.trim().slice(0, 40);
      if (Number.isInteger(p.diasAlerta) && p.diasAlerta >= 1 && p.diasAlerta <= 60) estado.diasAlerta = p.diasAlerta;
    } catch (e) { /* preferencias por defecto */ }
  }

  // ---------------------------------------------------------------
  //  Clics y teclado (delegación de eventos)
  // ---------------------------------------------------------------
  let esperaBusqueda = null;

  document.addEventListener("click", (evento) => {
    if (evento.target.id === "capa-modal") { cerrarModal(); return; }

    const conVista = evento.target.closest("[data-vista]");
    if (conVista) { irA(conVista.dataset.vista); return; }

    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    const { accion, id, filtro } = boton.dataset;

    switch (accion) {
      case "nuevo": abrirFormularioProducto(); break;
      case "editar": abrirFormularioProducto(id); break;
      case "vender": abrirMovimiento(id, "venta"); break;
      case "baja": abrirMovimiento(id, "baja"); break;
      case "eliminar": abrirEliminar(id); break;
      case "ajustes": abrirAjustes(); break;
      case "cerrar-modal": cerrarModal(); break;
      case "filtrar":
        estado.filtro = filtro;
        intentar(recalcularLista);
        break;
      case "ver-filtro":
        estado.filtro = filtro;
        estado.busqueda = "";
        estado.orden = "vence";
        estado.vista = "productos";
        $("#vista").innerHTML = "";
        intentar(async () => { await recalcularLista(); pintar(); animarEntrada(); window.scrollTo({ top: 0 }); });
        break;
      case "limpiar-filtros":
        estado.filtro = "todos";
        estado.busqueda = "";
        $("#vista").innerHTML = "";
        intentar(recalcularLista);
        break;
      case "reiniciar-demo":
        Datos.reiniciarDemo();
        cerrarModal();
        intentar(async () => { await cargarDatos(); aviso("Listo: volvieron los productos de ejemplo."); });
        break;
      case "salir": salir(); break;
      default: break;
    }
  });

  document.addEventListener("input", (evento) => {
    if (evento.target.id === "campo-busqueda") {
      estado.busqueda = evento.target.value;
      clearTimeout(esperaBusqueda);
      esperaBusqueda = setTimeout(() => intentar(recalcularLista), 180);
    }
  });

  document.addEventListener("change", (evento) => {
    if (evento.target.id === "campo-orden") {
      estado.orden = evento.target.value;
      intentar(recalcularLista);
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !$("#capa-modal").hidden) cerrarModal();
  });

  // ---------------------------------------------------------------
  //  Acceso (cuenta) y arranque
  // ---------------------------------------------------------------
  let modoAcceso = "entrar";

  function mostrar(pantalla) {
    $("#pantalla-carga").hidden = pantalla !== "carga";
    $("#pantalla-acceso").hidden = pantalla !== "acceso";
    $("#app").hidden = pantalla !== "app";
  }

  function mensajeAcceso(texto, tipo = "error") {
    const caja = $("#acceso-mensaje");
    caja.hidden = !texto;
    caja.textContent = texto || "";
    caja.className = `acceso__mensaje acceso__mensaje--${tipo}`;
  }

  function ponerModoAcceso(modo) {
    modoAcceso = modo;
    const registrando = modo === "registrar";
    $("#acceso-titulo").textContent = registrando ? "Crea tu cuenta" : "Entra a tu tienda";
    $("#acceso-sub").textContent = registrando
      ? "Solo necesitas un correo y una contraseña."
      : "Escribe tu correo y tu contraseña.";
    $("#acceso-enviar").textContent = registrando ? "Crear cuenta" : "Entrar";
    $("#acceso-cambiar").textContent = registrando ? "Ya tengo cuenta. Entrar" : "¿Primera vez? Crea tu cuenta";
    $("#acceso-clave").autocomplete = registrando ? "new-password" : "current-password";
    mensajeAcceso("");
  }

  $("#acceso-cambiar").addEventListener("click", () => ponerModoAcceso(modoAcceso === "entrar" ? "registrar" : "entrar"));

  $("#acceso-demo").addEventListener("click", () => {
    Datos.usarDemo();
    entrarApp();
  });

  $("#form-acceso").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const correo = $("#acceso-correo").value.trim();
    const clave = $("#acceso-clave").value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { mensajeAcceso("Escribe un correo válido."); return; }
    if (clave.length < 6) { mensajeAcceso("La contraseña debe tener al menos 6 caracteres."); return; }
    const boton = $("#acceso-enviar");
    ocupar(boton, true, "Un momento…");
    try {
      if (modoAcceso === "registrar") {
        const r = await Datos.registrar(correo, clave);
        if (r.confirmar) {
          ponerModoAcceso("entrar");
          mensajeAcceso("Cuenta creada. Te enviamos un correo para confirmarla; ábrelo y luego entra aquí.", "ok");
          return;
        }
      } else {
        await Datos.entrar(correo, clave);
      }
      $("#acceso-clave").value = "";
      await entrarApp();
    } catch (error) {
      mensajeAcceso(error.message || "No se pudo entrar.");
    } finally {
      ocupar(boton, false);
      $("#acceso-enviar").textContent = modoAcceso === "registrar" ? "Crear cuenta" : "Entrar";
    }
  });

  async function salir() {
    cerrarModal();
    await Datos.salir();
    estado.productos = [];
    estado.movimientos = [];
    if (Datos.hayNube()) {
      ponerModoAcceso("entrar");
      mostrar("acceso");
    } else {
      Datos.usarDemo();
      await entrarApp();
    }
  }

  async function entrarApp() {
    const enDemo = Datos.modo() === "local";
    const avisoModo = $("#aviso-modo");
    avisoModo.hidden = !enDemo;
    avisoModo.innerHTML = enDemo
      ? `<span class="aviso-modo__sello">Modo de prueba</span><span>Estos son productos de ejemplo. Lo que cambies se guarda solo en este dispositivo.</span>`
      : "";
    $("#rail-cuenta").textContent = enDemo ? "Modo de prueba" : Datos.correo();
    $("#boton-salir-texto").textContent = enDemo ? "Entrar con mi cuenta" : "Cerrar sesión";
    $("#boton-salir").hidden = enDemo && !Datos.hayNube();
    estado.vista = "inicio";
    estado.filtro = "todos";
    estado.busqueda = "";
    estado.general = null;
    $("#vista").innerHTML = `<p class="cargando-vista">Cargando tus productos…</p>`;
    mostrar("app");
    const bien = await intentar(cargarDatos);
    if (bien) {
      animarEntrada();
    } else {
      $("#vista").innerHTML = vacio(ICONO.caja, "No pudimos cargar tus productos", "Revisa tu conexión a internet y vuelve a intentarlo.",
        `<button class="btn btn--principal" type="button" id="reintentar-datos">Reintentar</button>`);
      $("#reintentar-datos").addEventListener("click", entrarApp);
    }
  }

  async function arrancar() {
    leerPreferencias();
    try {
      const [, usuario] = await Promise.all([MotorJava.iniciar(), Datos.iniciar()]);
      const r = await MotorJava.llamar("categorias");
      estado.categorias = r.categorias.map((c) => c.nombre);

      if (usuario) {
        await entrarApp();
      } else if (Datos.hayNube()) {
        ponerModoAcceso("entrar");
        mostrar("acceso");
      } else {
        Datos.usarDemo();
        await entrarApp();
      }
    } catch (error) {
      console.error(error);
      $("#carga-texto").hidden = true;
      $(".carga__barra").hidden = true;
      $("#carga-error").hidden = false;
      $("#carga-error-texto").textContent = (error && error.message) || "No se pudo iniciar FoodSaver.";
    }
  }

  // Si la pestaña queda abierta hasta el otro día, se recalcula con la fecha nueva
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && estado.general && Datos.fechaLocal() !== estado.hoy) intentar(recalcular);
  });

  arrancar();
})();
