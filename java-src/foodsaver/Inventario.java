package foodsaver;

/**
 * El inventario del negocio. Guarda los productos en un VECTOR de tamaño fijo
 * y lleva un contador con cuántas posiciones están ocupadas.
 * Aquí vive toda la lógica: clasificar por vencimiento, vender, dar de baja,
 * calcular pérdidas, filtrar y ordenar.
 */
public class Inventario {

    private Producto[] productos;   // vector de productos
    private int total;              // contador de productos guardados

    public Inventario(int capacidad) {
        if (capacidad < 1) {
            capacidad = 1;
        }
        productos = new Producto[capacidad];
        total = 0;
    }

    public int getTotal() {
        return total;
    }

    public Producto get(int posicion) {
        return productos[posicion];
    }

    /** Agrega un producto al final del vector. Devuelve false si ya no hay espacio. */
    public boolean agregar(Producto nuevo) {
        if (total >= productos.length) {
            return false;
        }
        productos[total] = nuevo;
        total++;
        return true;
    }

    /** Búsqueda secuencial por id. Devuelve la posición o -1 si no existe. */
    public int buscarPorId(String id) {
        for (int i = 0; i < total; i++) {
            if (productos[i].id.equals(id)) {
                return i;
            }
        }
        return -1;
    }

    /** Elimina un producto y corre los demás una posición para no dejar huecos. */
    public boolean eliminar(String id) {
        int posicion = buscarPorId(id);
        if (posicion == -1) {
            return false;
        }
        for (int i = posicion; i < total - 1; i++) {
            productos[i] = productos[i + 1];
        }
        productos[total - 1] = null;
        total--;
        return true;
    }

    // ------------------------------------------------------------------
    //  Clasificación por fecha de vencimiento
    // ------------------------------------------------------------------

    /**
     * Decide el estado de un producto con condicionales anidadas:
     * sin unidades -> AGOTADO; fecha pasada -> VENCIDO;
     * dentro de los días de alerta -> POR_VENCER; si no -> VIGENTE.
     */
    public static int calcularEstado(int cantidad, int diasRestantes, int diasAlerta) {
        int estado;
        if (cantidad <= 0) {
            estado = Producto.AGOTADO;
        } else {
            if (diasRestantes < 0) {
                estado = Producto.VENCIDO;
            } else {
                if (diasRestantes <= diasAlerta) {
                    estado = Producto.POR_VENCER;
                } else {
                    estado = Producto.VIGENTE;
                }
            }
        }
        return estado;
    }

    /** Recorre todo el vector y calcula días restantes y estado de cada producto. */
    public void clasificar(String hoy, int diasAlerta) {
        for (int i = 0; i < total; i++) {
            Producto p = productos[i];
            p.diasRestantes = Fechas.diasEntre(hoy, p.vence);
            p.estado = calcularEstado(p.cantidad, p.diasRestantes, diasAlerta);
        }
    }

    // ------------------------------------------------------------------
    //  Contadores y acumuladores
    // ------------------------------------------------------------------

    /** Contador: cuántos productos están en un estado. */
    public int contarPorEstado(int estado) {
        int contador = 0;
        for (int i = 0; i < total; i++) {
            if (productos[i].estado == estado) {
                contador++;
            }
        }
        return contador;
    }

    /** Acumulador: suma de unidades de todo el inventario. */
    public int unidadesTotales() {
        int suma = 0;
        for (int i = 0; i < total; i++) {
            suma += productos[i].cantidad;
        }
        return suma;
    }

    /** Acumulador: dinero representado por los productos de un estado. */
    public double valorPorEstado(int estado) {
        double suma = 0;
        for (int i = 0; i < total; i++) {
            if (productos[i].estado == estado) {
                suma += productos[i].valor();
            }
        }
        return suma;
    }

    /** Pérdida económica actual: lo que valen los productos vencidos que siguen en estante. */
    public double perdidaPorVencidos() {
        return valorPorEstado(Producto.VENCIDO);
    }

    /** Dinero en riesgo: lo que se perdería si los productos por vencer no se venden a tiempo. */
    public double valorEnRiesgo() {
        return valorPorEstado(Producto.POR_VENCER);
    }

    public double valorTotal() {
        double suma = 0;
        for (int i = 0; i < total; i++) {
            suma += productos[i].valor();
        }
        return suma;
    }

    // ------------------------------------------------------------------
    //  Matriz categoría x estado
    // ------------------------------------------------------------------

    /** Posición de una categoría en Validador.CATEGORIAS. Las desconocidas van a "Otros". */
    public static int indiceCategoria(String categoria) {
        for (int i = 0; i < Validador.CATEGORIAS.length; i++) {
            if (Validador.CATEGORIAS[i].equals(categoria)) {
                return i;
            }
        }
        return Validador.CATEGORIAS.length - 1;
    }

    /**
     * Construye una MATRIZ donde cada fila es una categoría y cada columna un estado
     * (0 vencido, 1 por vencer, 2 vigente). Cada celda acumula el dinero correspondiente.
     */
    public double[][] matrizValores() {
        double[][] matriz = new double[Validador.CATEGORIAS.length][3];
        for (int i = 0; i < total; i++) {
            Producto p = productos[i];
            if (p.estado != Producto.AGOTADO) {
                int fila = indiceCategoria(p.categoria);
                matriz[fila][p.estado] += p.valor();
            }
        }
        return matriz;
    }

    /** Vector con la cantidad de productos que tiene cada categoría. */
    public int[] conteoPorCategoria() {
        int[] conteo = new int[Validador.CATEGORIAS.length];
        for (int i = 0; i < total; i++) {
            conteo[indiceCategoria(productos[i].categoria)]++;
        }
        return conteo;
    }

    // ------------------------------------------------------------------
    //  Ventas y bajas
    // ------------------------------------------------------------------

    /**
     * Revisa si una venta se puede hacer. Devuelve "" si todo está bien
     * o el mensaje de error.
     */
    public static String revisarVenta(int cantidadActual, int cantidadVendida, int diasRestantes) {
        if (cantidadVendida <= 0) {
            return "La cantidad vendida debe ser mayor que cero.";
        }
        if (cantidadActual <= 0) {
            return "Este producto está agotado.";
        }
        if (diasRestantes < 0) {
            return "Este producto ya venció y no se puede vender. Regístralo como pérdida.";
        }
        if (cantidadVendida > cantidadActual) {
            if (cantidadActual == 1) {
                return "Solo queda 1 unidad disponible.";
            } else {
                return "Solo quedan " + cantidadActual + " unidades disponibles.";
            }
        }
        return "";
    }

    /** Descuenta del inventario una venta. Devuelve "" o el mensaje de error. */
    public String registrarVenta(String id, int cantidadVendida, String hoy) {
        int posicion = buscarPorId(id);
        if (posicion == -1) {
            return "No se encontró el producto.";
        }
        Producto p = productos[posicion];
        String error = revisarVenta(p.cantidad, cantidadVendida, Fechas.diasEntre(hoy, p.vence));
        if (error.length() > 0) {
            return error;
        }
        p.cantidad -= cantidadVendida;
        return "";
    }

    /** Revisa si una baja (retiro por desperdicio) se puede hacer. */
    public static String revisarBaja(int cantidadActual, int cantidadBaja) {
        if (cantidadBaja <= 0) {
            return "La cantidad a retirar debe ser mayor que cero.";
        }
        if (cantidadBaja > cantidadActual) {
            return "No puedes retirar más unidades de las que hay (" + cantidadActual + ").";
        }
        return "";
    }

    /** Retira todas las unidades de un producto y devuelve la pérdida en dinero. */
    public double darDeBaja(String id) {
        int posicion = buscarPorId(id);
        if (posicion == -1) {
            return 0;
        }
        Producto p = productos[posicion];
        double perdida = p.valor();
        p.cantidad = 0;
        return perdida;
    }

    // ------------------------------------------------------------------
    //  Búsqueda, filtro y ordenamiento
    // ------------------------------------------------------------------

    /** Pasa a minúsculas y quita tildes para comparar textos sin importar cómo se escribieron. */
    public static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String minusculas = texto.trim().toLowerCase();
        StringBuilder limpio = new StringBuilder();
        for (int i = 0; i < minusculas.length(); i++) {
            char c = minusculas.charAt(i);
            switch (c) {
                case 'á': c = 'a'; break;
                case 'é': c = 'e'; break;
                case 'í': c = 'i'; break;
                case 'ó': c = 'o'; break;
                case 'ú': c = 'u'; break;
                case 'ü': c = 'u'; break;
                default: break;
            }
            limpio.append(c);
        }
        return limpio.toString();
    }

    /**
     * Devuelve un nuevo vector solo con los productos que cumplen el filtro.
     * filtroEstado: "todos", "vencido", "por_vencer", "vigente" o "agotado".
     * busqueda: texto que debe aparecer en el nombre o la categoría ("" = sin búsqueda).
     */
    public Producto[] filtrar(String filtroEstado, String busqueda) {
        String buscado = normalizar(busqueda);
        boolean sinFiltro = filtroEstado == null || filtroEstado.length() == 0 || filtroEstado.equals("todos");

        // Primer recorrido: contar cuántos cumplen para crear el vector del tamaño exacto
        boolean[] cumple = new boolean[total];
        int cuantos = 0;
        for (int i = 0; i < total; i++) {
            Producto p = productos[i];
            boolean pasaEstado = sinFiltro || Producto.CLAVES_ESTADO[p.estado].equals(filtroEstado);
            boolean pasaBusqueda = buscado.length() == 0
                    || normalizar(p.nombre).indexOf(buscado) >= 0
                    || normalizar(p.categoria).indexOf(buscado) >= 0;
            if (pasaEstado && pasaBusqueda) {
                cumple[i] = true;
                cuantos++;
            }
        }
        // Segundo recorrido: copiar
        Producto[] resultado = new Producto[cuantos];
        int j = 0;
        for (int i = 0; i < total; i++) {
            if (cumple[i]) {
                resultado[j] = productos[i];
                j++;
            }
        }
        return resultado;
    }

    /** ¿El producto a debe ir antes que b según el criterio? */
    private static boolean vaAntes(Producto a, Producto b, String criterio) {
        if (criterio.equals("nombre")) {
            // La ñ va después de la n: se cambia por "n{" porque '{' es mayor que 'z'
            String claveA = normalizar(a.nombre).replace("ñ", "n{");
            String claveB = normalizar(b.nombre).replace("ñ", "n{");
            return claveA.compareTo(claveB) < 0;
        } else if (criterio.equals("valor")) {
            return a.valor() > b.valor();
        } else if (criterio.equals("cantidad")) {
            return a.cantidad < b.cantidad;
        } else {
            // "vence": primero lo más urgente; los agotados siempre al final
            boolean aAgotado = a.estado == Producto.AGOTADO;
            boolean bAgotado = b.estado == Producto.AGOTADO;
            if (aAgotado != bAgotado) {
                return bAgotado;
            }
            return a.diasRestantes < b.diasRestantes;
        }
    }

    /** Ordenamiento por inserción (estable) sobre el vector recibido. */
    public static void ordenar(Producto[] vector, String criterio) {
        if (criterio == null) {
            criterio = "vence";
        }
        for (int i = 1; i < vector.length; i++) {
            Producto actual = vector[i];
            int j = i - 1;
            while (j >= 0 && vaAntes(actual, vector[j], criterio)) {
                vector[j + 1] = vector[j];
                j--;
            }
            vector[j + 1] = actual;
        }
    }
}
