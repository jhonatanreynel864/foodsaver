/*
 * CAPA DE DATOS
 * -------------
 * Guarda y lee productos y movimientos. Tiene dos modos:
 *   "nube"  -> Supabase (cada usuario ve solo sus datos)
 *   "local" -> demostración, guarda en el navegador (localStorage)
 * Aquí no hay lógica de negocio: eso lo hace Java.
 */
const Datos = (() => {
  const CLAVE_PRODUCTOS = "foodsaver_demo_productos";
  const CLAVE_MOVIMIENTOS = "foodsaver_demo_movimientos";

  let cliente = null;
  let modo = "local";
  let usuario = null;

  // ---------------------------------------------------------------
  //  Utilidades
  // ---------------------------------------------------------------

  function fechaLocal(desplazamientoDias = 0) {
    const d = new Date();
    d.setDate(d.getDate() + desplazamientoDias);
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  function nuevoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function traducirError(error) {
    const texto = (error && error.message) || String(error || "");
    const mapa = [
      ["Invalid login credentials", "Correo o contraseña incorrectos."],
      ["Email not confirmed", "Aún no confirmas tu correo. Revisa tu bandeja de entrada."],
      ["User already registered", "Ya existe una cuenta con ese correo. Entra con tu contraseña."],
      ["Password should be at least", "La contraseña debe tener al menos 6 caracteres."],
      ["Unable to validate email address", "Ese correo no parece válido."],
      ["Signups not allowed", "El registro de cuentas está desactivado en este proyecto."],
      ["rate limit", "Demasiados intentos. Espera un momento y vuelve a probar."],
      ["Failed to fetch", "No hay conexión con el servidor. Revisa tu internet."],
      ["NetworkError", "No hay conexión con el servidor. Revisa tu internet."],
      ["JWT", "Tu sesión venció. Vuelve a entrar."],
      ["does not exist", "Falta crear las tablas en Supabase. Ejecuta supabase/esquema.sql."],
      ["schema cache", "Falta crear las tablas en Supabase. Ejecuta supabase/esquema.sql."],
      ["row-level security", "No tienes permiso para hacer este cambio."],
    ];
    for (const [clave, mensaje] of mapa) {
      if (texto.toLowerCase().includes(clave.toLowerCase())) return new Error(mensaje);
    }
    return new Error(texto || "Ocurrió un error inesperado.");
  }

  function revisar(respuesta) {
    if (respuesta.error) throw traducirError(respuesta.error);
    return respuesta.data;
  }

  // Convierte filas de la base de datos al formato que usa la página
  const aProducto = (f) => ({
    id: f.id,
    nombre: f.nombre,
    categoria: f.categoria,
    cantidad: Number(f.cantidad),
    precio: Number(f.precio),
    vence: f.fecha_vencimiento,
  });

  const aMovimiento = (f) => ({
    id: f.id,
    productoNombre: f.producto_nombre,
    categoria: f.categoria,
    tipo: f.tipo,
    cantidad: Number(f.cantidad),
    total: Number(f.total),
    fecha: f.fecha,
  });

  // ---------------------------------------------------------------
  //  Modo local (demostración)
  // ---------------------------------------------------------------

  function leerLocal(clave) {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave));
      return Array.isArray(guardado) ? guardado : null;
    } catch (e) {
      return null;
    }
  }

  let memoria = {}; // respaldo si el navegador bloquea localStorage

  function escribirLocal(clave, valor) {
    memoria[clave] = valor;
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }

  function obtenerLocal(clave) {
    return leerLocal(clave) || memoria[clave] || null;
  }

  function sembrarDemo() {
    const p = (nombre, categoria, cantidad, precio, dias) =>
      ({ id: nuevoId(), nombre, categoria, cantidad, precio, vence: fechaLocal(dias) });
    const productos = [
      p("Pan tajado integral", "Panadería", 6, 5800, -2),
      p("Queso campesino 250 g", "Lácteos", 4, 9800, -5),
      p("Yogur de fresa 150 g", "Lácteos", 9, 2500, 0),
      p("Leche entera 1 L", "Lácteos", 12, 4200, 1),
      p("Jamón de cerdo 230 g", "Carnes y embutidos", 5, 11900, 2),
      p("Aguacate hass", "Frutas y verduras", 14, 3200, 3),
      p("Arepas de maíz x10", "Panadería", 8, 4500, 5),
      p("Jugo de naranja 1 L", "Bebidas", 7, 6500, 9),
      p("Huevos AA x12", "Otros", 10, 9400, 16),
      p("Papas de limón 105 g", "Snacks", 22, 3900, 48),
      p("Arroz blanco 500 g", "Abarrotes", 30, 2900, 210),
      p("Gaseosa cola 1.5 L", "Bebidas", 18, 5200, 96),
      p("Mantequilla 125 g", "Lácteos", 0, 6300, 20),
    ];
    const m = (productoNombre, categoria, tipo, cantidad, precio, dias) =>
      ({ id: nuevoId(), productoNombre, categoria, tipo, cantidad, total: cantidad * precio, fecha: fechaLocal(dias) });
    const movimientos = [
      m("Leche entera 1 L", "Lácteos", "venta", 6, 4200, 0),
      m("Arepas de maíz x10", "Panadería", "venta", 3, 4500, 0),
      m("Mantequilla 125 g", "Lácteos", "venta", 4, 6300, -1),
      m("Banano x kg", "Frutas y verduras", "baja", 5, 2800, -1),
      m("Gaseosa cola 1.5 L", "Bebidas", "venta", 8, 5200, -2),
      m("Huevos AA x12", "Otros", "venta", 5, 9400, -3),
      m("Pan blandito x8", "Panadería", "baja", 3, 5200, -4),
      m("Jugo de naranja 1 L", "Bebidas", "venta", 4, 6500, -5),
      m("Papas de limón 105 g", "Snacks", "venta", 9, 3900, -6),
      m("Yogur griego 150 g", "Lácteos", "baja", 6, 3800, -8),
      m("Arroz blanco 500 g", "Abarrotes", "venta", 12, 2900, -9),
      m("Jamón de cerdo 230 g", "Carnes y embutidos", "venta", 3, 11900, -11),
      m("Leche entera 1 L", "Lácteos", "venta", 10, 4200, -12),
    ];
    escribirLocal(CLAVE_PRODUCTOS, productos);
    escribirLocal(CLAVE_MOVIMIENTOS, movimientos);
  }

  const local = {
    async listarProductos() {
      if (!obtenerLocal(CLAVE_PRODUCTOS)) sembrarDemo();
      return obtenerLocal(CLAVE_PRODUCTOS);
    },
    async crearProducto(datos) {
      const lista = await local.listarProductos();
      const nuevo = { id: nuevoId(), ...datos };
      escribirLocal(CLAVE_PRODUCTOS, [...lista, nuevo]);
      return nuevo;
    },
    async actualizarProducto(id, cambios) {
      const lista = await local.listarProductos();
      escribirLocal(CLAVE_PRODUCTOS, lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    },
    async eliminarProducto(id) {
      const lista = await local.listarProductos();
      escribirLocal(CLAVE_PRODUCTOS, lista.filter((p) => p.id !== id));
    },
    async listarMovimientos() {
      if (!obtenerLocal(CLAVE_MOVIMIENTOS)) sembrarDemo();
      return obtenerLocal(CLAVE_MOVIMIENTOS);
    },
    async crearMovimiento(mov) {
      const lista = await local.listarMovimientos();
      escribirLocal(CLAVE_MOVIMIENTOS, [{ id: nuevoId(), ...mov }, ...lista]);
    },
  };

  // ---------------------------------------------------------------
  //  Modo nube (Supabase)
  // ---------------------------------------------------------------

  const nube = {
    async listarProductos() {
      const filas = revisar(await cliente.from("productos").select("*").order("fecha_vencimiento"));
      return filas.map(aProducto);
    },
    async crearProducto(d) {
      const fila = revisar(await cliente.from("productos").insert({
        nombre: d.nombre, categoria: d.categoria, cantidad: d.cantidad,
        precio: d.precio, fecha_vencimiento: d.vence,
      }).select().single());
      return aProducto(fila);
    },
    async actualizarProducto(id, c) {
      const cambios = {};
      if (c.nombre !== undefined) cambios.nombre = c.nombre;
      if (c.categoria !== undefined) cambios.categoria = c.categoria;
      if (c.cantidad !== undefined) cambios.cantidad = c.cantidad;
      if (c.precio !== undefined) cambios.precio = c.precio;
      if (c.vence !== undefined) cambios.fecha_vencimiento = c.vence;
      revisar(await cliente.from("productos").update(cambios).eq("id", id));
    },
    async eliminarProducto(id) {
      revisar(await cliente.from("productos").delete().eq("id", id));
    },
    async listarMovimientos() {
      const filas = revisar(await cliente.from("movimientos").select("*")
        .order("creado_en", { ascending: false }).limit(1000));
      return filas.map(aMovimiento);
    },
    async crearMovimiento(m) {
      revisar(await cliente.from("movimientos").insert({
        producto_id: m.productoId || null, producto_nombre: m.productoNombre,
        categoria: m.categoria, tipo: m.tipo, cantidad: m.cantidad,
        precio_unitario: m.precioUnitario, total: m.total, fecha: m.fecha,
      }));
    },
  };

  // ---------------------------------------------------------------
  //  Interfaz pública
  // ---------------------------------------------------------------

  const almacen = () => (modo === "nube" ? nube : local);

  return {
    fechaLocal,

    /** ¿Hay un proyecto de Supabase configurado en js/config.js? */
    hayNube() {
      const c = window.FOODSAVER_CONFIG || {};
      return Boolean(c.supabaseUrl && c.supabaseAnonKey && window.supabase);
    },

    /** Prepara el cliente y devuelve el usuario si ya había una sesión abierta. */
    async iniciar() {
      if (!this.hayNube()) { modo = "local"; return null; }
      const c = window.FOODSAVER_CONFIG;
      try {
        cliente = window.supabase.createClient(c.supabaseUrl.trim(), c.supabaseAnonKey.trim());
        const { data } = await cliente.auth.getSession();
        if (data && data.session) {
          usuario = data.session.user;
          modo = "nube";
          return usuario;
        }
      } catch (e) {
        console.error("Supabase no respondió:", e);
      }
      return null;
    },

    async entrar(correo, clave) {
      try {
        const data = revisar(await cliente.auth.signInWithPassword({ email: correo, password: clave }));
        usuario = data.user;
        modo = "nube";
        return usuario;
      } catch (e) { throw traducirError(e); }
    },

    /** Crea la cuenta. Devuelve { usuario, confirmar } — confirmar=true si falta validar el correo. */
    async registrar(correo, clave) {
      try {
        const data = revisar(await cliente.auth.signUp({ email: correo, password: clave }));
        if (data.session) {
          usuario = data.user;
          modo = "nube";
          return { usuario, confirmar: false };
        }
        return { usuario: null, confirmar: true };
      } catch (e) { throw traducirError(e); }
    },

    async salir() {
      if (modo === "nube" && cliente) {
        try { await cliente.auth.signOut(); } catch (e) { /* se cierra igual en este dispositivo */ }
      }
      usuario = null;
      modo = "local";
    },

    usarDemo() { modo = "local"; usuario = null; },
    reiniciarDemo() { sembrarDemo(); },
    modo: () => modo,
    correo: () => (usuario && usuario.email) || "",

    listarProductos: () => almacen().listarProductos(),
    crearProducto: (d) => almacen().crearProducto(d),
    actualizarProducto: (id, c) => almacen().actualizarProducto(id, c),
    eliminarProducto: (id) => almacen().eliminarProducto(id),
    listarMovimientos: () => almacen().listarMovimientos(),
    crearMovimiento: (m) => almacen().crearMovimiento(m),
  };
})();
