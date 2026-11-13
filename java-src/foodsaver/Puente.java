package foodsaver;

/**
 * Puente entre la página web y la lógica en Java.
 * La página le envía textos y recibe textos en formato JSON.
 * Todos los cálculos (validar, clasificar, vender, pérdidas) se hacen aquí, en Java.
 *
 * Formato de entrada del inventario: una línea por producto con los campos
 * separados por tabulador:  id, nombre, categoría, cantidad, precio, vence
 */
public class Puente {

    public static final int DIAS_ALERTA_POR_DEFECTO = 7;
    public static final int DIAS_HISTORIAL = 14;
    public static final int MAX_ALERTAS = 6;

    // ------------------------------------------------------------------
    //  Funciones de apoyo
    // ------------------------------------------------------------------

    /** Parte un texto por un separador y devuelve un vector con los pedazos. */
    public static String[] partir(String texto, char separador) {
        if (texto == null || texto.length() == 0) {
            return new String[0];
        }
        int cantidad = 1;
        for (int i = 0; i < texto.length(); i++) {
            if (texto.charAt(i) == separador) {
                cantidad++;
            }
        }
        String[] partes = new String[cantidad];
        int inicio = 0;
        int posicion = 0;
        for (int i = 0; i < texto.length(); i++) {
            if (texto.charAt(i) == separador) {
                partes[posicion] = texto.substring(inicio, i);
                posicion++;
                inicio = i + 1;
            }
        }
        partes[posicion] = texto.substring(inicio);
        return partes;
    }

    private static int leerDiasAlerta(String texto) {
        int dias = DIAS_ALERTA_POR_DEFECTO;
        if (Validador.esEntero(texto)) {
            dias = Integer.parseInt(texto.trim());
            if (dias < 1) {
                dias = 1;
            } else if (dias > 60) {
                dias = 60;
            }
        }
        return dias;
    }

    private static String error(String mensaje) {
        return new Json().abrirObjeto().logico("ok", false).texto("error", mensaje).cerrarObjeto().toString();
    }

    /** Convierte las líneas de texto en un Inventario. Las líneas dañadas se descartan. */
    public static Inventario cargar(String datos) {
        String[] lineas = partir(datos == null ? "" : datos, '\n');
        Inventario inventario = new Inventario(lineas.length);
        for (int i = 0; i < lineas.length; i++) {
            String[] campos = partir(lineas[i], '\t');
            if (campos.length >= 6
                    && campos[0].length() > 0
                    && Validador.esEntero(campos[3])
                    && Validador.esDecimal(campos[4])
                    && Fechas.esValida(campos[5])) {
                inventario.agregar(new Producto(
                        campos[0],
                        campos[1],
                        campos[2],
                        Integer.parseInt(campos[3].trim()),
                        Validador.aDecimal(campos[4]),
                        campos[5].trim()));
            }
        }
        return inventario;
    }

    private static void escribirProducto(Json json, Producto p) {
        json.abrirObjeto()
                .texto("id", p.id)
                .texto("nombre", p.nombre)
                .texto("categoria", p.categoria)
                .entero("cantidad", p.cantidad)
                .decimal("precio", p.precio)
                .texto("vence", p.vence)
                .entero("dias", p.diasRestantes)
                .texto("estado", Producto.CLAVES_ESTADO[p.estado])
                .decimal("valor", p.valor())
                .cerrarObjeto();
    }

    // ------------------------------------------------------------------
    //  Funciones que llama la página
    // ------------------------------------------------------------------

    /** Lista de categorías disponibles. */
    public static String categorias() {
        Json json = new Json().abrirObjeto().logico("ok", true).abrirLista("categorias");
        for (int i = 0; i < Validador.CATEGORIAS.length; i++) {
            json.abrirObjeto().texto("nombre", Validador.CATEGORIAS[i]).cerrarObjeto();
        }
        return json.cerrarLista().cerrarObjeto().toString();
    }

    /**
     * Analiza todo el inventario: clasifica cada producto, cuenta, acumula,
     * arma la matriz por categoría y devuelve la lista filtrada y ordenada.
     */
    public static String analizar(String datos, String hoy, String diasAlertaTexto,
                                  String filtro, String busqueda, String orden) {
        try {
            if (!Fechas.esValida(hoy)) {
                return error("La fecha de hoy no es válida.");
            }
            int diasAlerta = leerDiasAlerta(diasAlertaTexto);
            Inventario inventario = cargar(datos);
            inventario.clasificar(hoy, diasAlerta);

            Json json = new Json().abrirObjeto().logico("ok", true);

            // Resumen con contadores y acumuladores
            json.abrirObjeto("resumen")
                    .entero("total", inventario.getTotal())
                    .entero("unidades", inventario.unidadesTotales())
                    .entero("diasAlerta", diasAlerta)
                    .entero("vencidos", inventario.contarPorEstado(Producto.VENCIDO))
                    .entero("porVencer", inventario.contarPorEstado(Producto.POR_VENCER))
                    .entero("vigentes", inventario.contarPorEstado(Producto.VIGENTE))
                    .entero("agotados", inventario.contarPorEstado(Producto.AGOTADO))
                    .decimal("perdida", inventario.perdidaPorVencidos())
                    .decimal("enRiesgo", inventario.valorEnRiesgo())
                    .decimal("valorVigente", inventario.valorPorEstado(Producto.VIGENTE))
                    .decimal("valorTotal", inventario.valorTotal())
                    .cerrarObjeto();

            // Lista visible: filtrada y ordenada
            Producto[] visibles = inventario.filtrar(filtro, busqueda);
            Inventario.ordenar(visibles, orden);
            json.abrirLista("productos");
            for (int i = 0; i < visibles.length; i++) {
                escribirProducto(json, visibles[i]);
            }
            json.cerrarLista();

            // Alertas: los más urgentes entre vencidos y por vencer
            Producto[] todos = inventario.filtrar("todos", "");
            Inventario.ordenar(todos, "vence");
            json.abrirLista("alertas");
            int alertas = 0;
            int i = 0;
            while (i < todos.length && alertas < MAX_ALERTAS) {
                if (todos[i].estado == Producto.VENCIDO || todos[i].estado == Producto.POR_VENCER) {
                    escribirProducto(json, todos[i]);
                    alertas++;
                }
                i++;
            }
            json.cerrarLista();

            // Matriz categoría x estado
            double[][] matriz = inventario.matrizValores();
            int[] conteo = inventario.conteoPorCategoria();
            json.abrirLista("categorias");
            for (int fila = 0; fila < matriz.length; fila++) {
                if (conteo[fila] > 0) {
                    json.abrirObjeto()
                            .texto("nombre", Validador.CATEGORIAS[fila])
                            .entero("productos", conteo[fila])
                            .decimal("vencido", matriz[fila][Producto.VENCIDO])
                            .decimal("porVencer", matriz[fila][Producto.POR_VENCER])
                            .decimal("vigente", matriz[fila][Producto.VIGENTE])
                            .cerrarObjeto();
                }
            }
            json.cerrarLista();

            return json.cerrarObjeto().toString();
        } catch (Exception e) {
            return error("No se pudo analizar el inventario.");
        }
    }

    /**
     * Valida los datos del formulario de producto.
     * permitirCero = "si" cuando se está editando (un producto puede quedar en cero).
     */
    public static String validarProducto(String nombre, String categoria, String cantidad,
                                         String precio, String vence, String hoy, String permitirCero) {
        try {
            String errorNombre = Validador.validarNombre(nombre);
            String errorCategoria = Validador.validarCategoria(categoria);
            String errorCantidad = Validador.validarCantidad(cantidad, "si".equals(permitirCero));
            String errorPrecio = Validador.validarPrecio(precio);
            String errorFecha = Validador.validarFecha(vence);

            boolean todoBien = errorNombre.length() == 0 && errorCategoria.length() == 0
                    && errorCantidad.length() == 0 && errorPrecio.length() == 0
                    && errorFecha.length() == 0;

            Json json = new Json().abrirObjeto().logico("ok", todoBien);
            json.abrirObjeto("errores")
                    .texto("nombre", errorNombre)
                    .texto("categoria", errorCategoria)
                    .texto("cantidad", errorCantidad)
                    .texto("precio", errorPrecio)
                    .texto("vence", errorFecha)
                    .cerrarObjeto();

            String aviso = "";
            if (todoBien) {
                // Datos limpios, listos para guardar
                json.abrirObjeto("limpio")
                        .texto("nombre", nombre.trim())
                        .texto("categoria", categoria.trim())
                        .entero("cantidad", Integer.parseInt(cantidad.trim()))
                        .decimal("precio", Validador.aDecimal(precio))
                        .texto("vence", vence.trim())
                        .cerrarObjeto();
                if (Fechas.esValida(hoy)) {
                    int dias = Fechas.diasEntre(hoy, vence);
                    if (dias < 0) {
                        aviso = "Ojo: esta fecha ya pasó, el producto quedará como vencido.";
                    } else if (dias == 0) {
                        aviso = "Ojo: este producto vence hoy.";
                    }
                }
            }
            json.texto("aviso", aviso);
            return json.cerrarObjeto().toString();
        } catch (Exception e) {
            return error("No se pudieron validar los datos.");
        }
    }

    /** Revisa una venta y calcula la nueva cantidad y el total cobrado. */
    public static String vender(String cantidadActual, String cantidadVendida,
                                String precio, String vence, String hoy) {
        try {
            String errorCantidad = Validador.validarCantidad(cantidadVendida, false);
            if (errorCantidad.length() > 0) {
                return error(errorCantidad);
            }
            if (!Validador.esEntero(cantidadActual) || !Validador.esDecimal(precio)
                    || !Fechas.esValida(vence) || !Fechas.esValida(hoy)) {
                return error("Los datos del producto no son válidos.");
            }
            int actual = Integer.parseInt(cantidadActual.trim());
            int vendida = Integer.parseInt(cantidadVendida.trim());
            String motivo = Inventario.revisarVenta(actual, vendida, Fechas.diasEntre(hoy, vence));
            if (motivo.length() > 0) {
                return error(motivo);
            }
            return new Json().abrirObjeto()
                    .logico("ok", true)
                    .entero("cantidad", vendida)
                    .entero("nuevaCantidad", actual - vendida)
                    .decimal("total", vendida * Validador.aDecimal(precio))
                    .cerrarObjeto().toString();
        } catch (Exception e) {
            return error("No se pudo registrar la venta.");
        }
    }

    /** Revisa una baja por desperdicio y calcula la pérdida en dinero. */
    public static String baja(String cantidadActual, String cantidadBaja, String precio) {
        try {
            String errorCantidad = Validador.validarCantidad(cantidadBaja, false);
            if (errorCantidad.length() > 0) {
                return error(errorCantidad);
            }
            if (!Validador.esEntero(cantidadActual) || !Validador.esDecimal(precio)) {
                return error("Los datos del producto no son válidos.");
            }
            int actual = Integer.parseInt(cantidadActual.trim());
            int retirada = Integer.parseInt(cantidadBaja.trim());
            String motivo = Inventario.revisarBaja(actual, retirada);
            if (motivo.length() > 0) {
                return error(motivo);
            }
            return new Json().abrirObjeto()
                    .logico("ok", true)
                    .entero("cantidad", retirada)
                    .entero("nuevaCantidad", actual - retirada)
                    .decimal("total", retirada * Validador.aDecimal(precio))
                    .cerrarObjeto().toString();
        } catch (Exception e) {
            return error("No se pudo registrar la baja.");
        }
    }

    /**
     * Resume el historial de movimientos (ventas y bajas).
     * Entrada: una línea por movimiento:  tipo, cantidad, total, fecha(AAAA-MM-DD)
     * Usa una matriz de DIAS_HISTORIAL filas x 2 columnas (0 ventas, 1 bajas).
     */
    public static String historial(String movimientos, String hoy) {
        try {
            if (!Fechas.esValida(hoy)) {
                return error("La fecha de hoy no es válida.");
            }
            int diaHoy = Fechas.aDias(hoy);
            double[][] porDia = new double[DIAS_HISTORIAL][2];

            double totalVentas = 0;
            double totalBajas = 0;
            int unidadesVendidas = 0;
            int unidadesPerdidas = 0;
            int registrosVentas = 0;
            int registrosBajas = 0;

            String[] lineas = partir(movimientos == null ? "" : movimientos, '\n');
            for (int i = 0; i < lineas.length; i++) {
                String[] campos = partir(lineas[i], '\t');
                if (campos.length < 4 || !Validador.esEntero(campos[1])
                        || !Validador.esDecimal(campos[2]) || !Fechas.esValida(campos[3])) {
                    continue; // línea dañada: se salta
                }
                int cantidad = Integer.parseInt(campos[1].trim());
                double total = Validador.aDecimal(campos[2]);
                int columna;
                if (campos[0].equals("venta")) {
                    columna = 0;
                    totalVentas += total;
                    unidadesVendidas += cantidad;
                    registrosVentas++;
                } else if (campos[0].equals("baja")) {
                    columna = 1;
                    totalBajas += total;
                    unidadesPerdidas += cantidad;
                    registrosBajas++;
                } else {
                    continue;
                }
                // ¿Cae dentro de los últimos días? La fila 0 es el día más antiguo.
                int haceCuanto = diaHoy - Fechas.aDias(campos[3]);
                if (haceCuanto >= 0 && haceCuanto < DIAS_HISTORIAL) {
                    porDia[DIAS_HISTORIAL - 1 - haceCuanto][columna] += total;
                }
            }

            // Porcentaje de lo movido que terminó en desperdicio
            double tasa = 0;
            if (totalVentas + totalBajas > 0) {
                tasa = totalBajas * 100.0 / (totalVentas + totalBajas);
            }

            // Mayor valor de la matriz (sirve para dibujar las barras a escala)
            double mayor = 0;
            for (int fila = 0; fila < DIAS_HISTORIAL; fila++) {
                for (int columna = 0; columna < 2; columna++) {
                    if (porDia[fila][columna] > mayor) {
                        mayor = porDia[fila][columna];
                    }
                }
            }

            Json json = new Json().abrirObjeto().logico("ok", true)
                    .decimal("totalVentas", totalVentas)
                    .decimal("totalBajas", totalBajas)
                    .entero("unidadesVendidas", unidadesVendidas)
                    .entero("unidadesPerdidas", unidadesPerdidas)
                    .entero("registrosVentas", registrosVentas)
                    .entero("registrosBajas", registrosBajas)
                    .decimal("tasaDesperdicio", tasa)
                    .decimal("mayorDia", mayor);
            json.abrirLista("dias");
            for (int fila = 0; fila < DIAS_HISTORIAL; fila++) {
                json.abrirObjeto()
                        .texto("fecha", Fechas.desdeDias(diaHoy - (DIAS_HISTORIAL - 1 - fila)))
                        .decimal("ventas", porDia[fila][0])
                        .decimal("bajas", porDia[fila][1])
                        .cerrarObjeto();
            }
            json.cerrarLista();
            return json.cerrarObjeto().toString();
        } catch (Exception e) {
            return error("No se pudo calcular el historial.");
        }
    }
}
