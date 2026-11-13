package foodsaver;

import java.time.LocalDate;
import java.util.Scanner;

/**
 * FoodSaver en modo consola: el mismo programa de la página web, pero con un
 * menú de texto. Usa exactamente las mismas clases (Inventario, Validador, Fechas).
 *
 * Ejecutar:  java -cp java/foodsaver.jar foodsaver.MenuConsola
 */
public class MenuConsola {

    private static Scanner teclado = new Scanner(System.in);
    private static Inventario inventario = new Inventario(500);
    private static String hoy = LocalDate.now().toString();
    private static int diasAlerta = Puente.DIAS_ALERTA_POR_DEFECTO;
    private static int siguienteId = 1;

    // Acumuladores de la sesión
    private static double totalVendido = 0;
    private static double totalPerdido = 0;
    private static int ventasRealizadas = 0;

    public static void main(String[] args) {
        cargarEjemplos();
        int opcion;
        do {
            mostrarMenu();
            opcion = leerEntero("Elige una opción: ", 0, 8);
            switch (opcion) {
                case 1: registrarProducto(); break;
                case 2: listar("todos", "INVENTARIO COMPLETO"); break;
                case 3: verAlertas(); break;
                case 4: registrarVenta(); break;
                case 5: darDeBajaVencidos(); break;
                case 6: reportePerdidas(); break;
                case 7: buscar(); break;
                case 8: cambiarDiasAlerta(); break;
                case 0: System.out.println("\nHasta pronto. ¡Menos desperdicio, más ganancia!"); break;
                default: break;
            }
        } while (opcion != 0);
    }

    private static void mostrarMenu() {
        inventario.clasificar(hoy, diasAlerta);
        System.out.println();
        System.out.println("==============================================");
        System.out.println("  FOODSAVER  ·  Control de vencimientos");
        System.out.println("  Hoy: " + hoy + "   Productos: " + inventario.getTotal());
        System.out.println("  Vencidos: " + inventario.contarPorEstado(Producto.VENCIDO)
                + "   Por vencer: " + inventario.contarPorEstado(Producto.POR_VENCER));
        System.out.println("==============================================");
        System.out.println("  1. Registrar producto");
        System.out.println("  2. Ver inventario");
        System.out.println("  3. Ver vencidos y próximos a vencer");
        System.out.println("  4. Registrar venta");
        System.out.println("  5. Dar de baja productos vencidos");
        System.out.println("  6. Reporte de pérdidas");
        System.out.println("  7. Buscar producto");
        System.out.println("  8. Cambiar días de alerta (ahora: " + diasAlerta + ")");
        System.out.println("  0. Salir");
    }

    // ------------------------------------------------------------------
    //  Lectura validada: se repite la pregunta hasta que el dato sea correcto
    // ------------------------------------------------------------------

    private static String leerLinea(String mensaje) {
        System.out.print(mensaje);
        if (!teclado.hasNextLine()) {
            System.out.println();
            System.exit(0);
        }
        return teclado.nextLine().trim();
    }

    private static int leerEntero(String mensaje, int minimo, int maximo) {
        while (true) {
            String texto = leerLinea(mensaje);
            if (Validador.esEntero(texto)) {
                int numero = Integer.parseInt(texto);
                if (numero >= minimo && numero <= maximo) {
                    return numero;
                }
            }
            System.out.println("  ! Escribe un número entre " + minimo + " y " + maximo + ".");
        }
    }

    // ------------------------------------------------------------------
    //  Opciones del menú
    // ------------------------------------------------------------------

    private static void registrarProducto() {
        System.out.println("\n--- REGISTRAR PRODUCTO ---");
        String nombre;
        String error;
        do {
            nombre = leerLinea("Nombre: ");
            error = Validador.validarNombre(nombre);
            if (error.length() > 0) {
                System.out.println("  ! " + error);
            }
        } while (error.length() > 0);

        System.out.println("Categorías:");
        for (int i = 0; i < Validador.CATEGORIAS.length; i++) {
            System.out.println("  " + (i + 1) + ". " + Validador.CATEGORIAS[i]);
        }
        String categoria = Validador.CATEGORIAS[leerEntero("Categoría (número): ", 1, Validador.CATEGORIAS.length) - 1];

        String cantidad;
        do {
            cantidad = leerLinea("Cantidad: ");
            error = Validador.validarCantidad(cantidad, false);
            if (error.length() > 0) {
                System.out.println("  ! " + error);
            }
        } while (error.length() > 0);

        String precio;
        do {
            precio = leerLinea("Precio por unidad: ");
            error = Validador.validarPrecio(precio);
            if (error.length() > 0) {
                System.out.println("  ! " + error);
            }
        } while (error.length() > 0);

        String vence;
        do {
            vence = leerLinea("Fecha de vencimiento (AAAA-MM-DD): ");
            error = Validador.validarFecha(vence);
            if (error.length() > 0) {
                System.out.println("  ! " + error);
            }
        } while (error.length() > 0);

        Producto nuevo = new Producto("P" + siguienteId, nombre, categoria,
                Integer.parseInt(cantidad), Validador.aDecimal(precio), vence);
        if (inventario.agregar(nuevo)) {
            siguienteId++;
            System.out.println("Producto registrado con el código " + nuevo.id + ".");
        } else {
            System.out.println("  ! El inventario está lleno.");
        }
    }

    private static void listar(String filtro, String titulo) {
        inventario.clasificar(hoy, diasAlerta);
        Producto[] lista = inventario.filtrar(filtro, "");
        Inventario.ordenar(lista, "vence");
        imprimirTabla(lista, titulo);
    }

    private static void imprimirTabla(Producto[] lista, String titulo) {
        System.out.println("\n--- " + titulo + " ---");
        if (lista.length == 0) {
            System.out.println("(No hay productos para mostrar)");
            return;
        }
        System.out.println(ajustar("Cód", 5) + ajustar("Producto", 26) + ajustar("Cant", 6)
                + ajustar("Precio", 12) + ajustar("Vence", 12) + "Estado");
        for (int i = 0; i < lista.length; i++) {
            Producto p = lista[i];
            String detalle = Producto.NOMBRES_ESTADO[p.estado];
            if (p.estado == Producto.VENCIDO) {
                detalle += " (hace " + (-p.diasRestantes) + " d)";
            } else if (p.estado == Producto.POR_VENCER) {
                detalle += p.diasRestantes == 0 ? " (hoy)" : " (en " + p.diasRestantes + " d)";
            }
            System.out.println(ajustar(p.id, 5) + ajustar(p.nombre, 26) + ajustar("" + p.cantidad, 6)
                    + ajustar(pesos(p.precio), 12) + ajustar(p.vence, 12) + detalle);
        }
    }

    private static void verAlertas() {
        listar("vencido", "PRODUCTOS VENCIDOS");
        listar("por_vencer", "PRÓXIMOS A VENCER (" + diasAlerta + " días o menos)");
    }

    private static void registrarVenta() {
        System.out.println("\n--- REGISTRAR VENTA ---");
        String id = leerLinea("Código del producto (ej. P1): ").toUpperCase();
        int posicion = inventario.buscarPorId(id);
        if (posicion == -1) {
            System.out.println("  ! No existe un producto con ese código.");
            return;
        }
        Producto p = inventario.get(posicion);
        System.out.println(p.nombre + " · disponibles: " + p.cantidad + " · precio: " + pesos(p.precio));
        int cantidad = leerEntero("Cantidad vendida: ", 1, Validador.MAX_CANTIDAD);
        String error = inventario.registrarVenta(id, cantidad, hoy);
        if (error.length() > 0) {
            System.out.println("  ! " + error);
        } else {
            double total = cantidad * p.precio;
            totalVendido += total;
            ventasRealizadas++;
            System.out.println("Venta registrada: " + pesos(total) + ". Quedan " + p.cantidad + " unidades.");
        }
    }

    private static void darDeBajaVencidos() {
        inventario.clasificar(hoy, diasAlerta);
        Producto[] vencidos = inventario.filtrar("vencido", "");
        if (vencidos.length == 0) {
            System.out.println("\nNo hay productos vencidos. ¡Bien!");
            return;
        }
        imprimirTabla(vencidos, "PRODUCTOS QUE SE DARÁN DE BAJA");
        String respuesta = leerLinea("¿Retirarlos del inventario? (s/n): ");
        if (respuesta.equalsIgnoreCase("s")) {
            double perdida = 0;
            for (int i = 0; i < vencidos.length; i++) {
                perdida += inventario.darDeBaja(vencidos[i].id);
            }
            totalPerdido += perdida;
            System.out.println("Se dieron de baja " + vencidos.length + " productos. Pérdida: " + pesos(perdida));
        } else {
            System.out.println("No se hizo ningún cambio.");
        }
    }

    private static void reportePerdidas() {
        inventario.clasificar(hoy, diasAlerta);
        System.out.println("\n--- REPORTE DE PÉRDIDAS ---");
        System.out.println("Vencido en estante (pérdida actual): " + pesos(inventario.perdidaPorVencidos()));
        System.out.println("En riesgo (por vencer):              " + pesos(inventario.valorEnRiesgo()));
        System.out.println("Dado de baja en esta sesión:         " + pesos(totalPerdido));
        System.out.println("Vendido en esta sesión:              " + pesos(totalVendido)
                + " (" + ventasRealizadas + " ventas)");

        // Recorrido de la matriz categoría x estado
        double[][] matriz = inventario.matrizValores();
        System.out.println();
        System.out.println(ajustar("Categoría", 22) + ajustar("Vencido", 14) + ajustar("Por vencer", 14) + "Vigente");
        for (int fila = 0; fila < matriz.length; fila++) {
            double sumaFila = 0;
            for (int columna = 0; columna < matriz[fila].length; columna++) {
                sumaFila += matriz[fila][columna];
            }
            if (sumaFila > 0) {
                System.out.println(ajustar(Validador.CATEGORIAS[fila], 22)
                        + ajustar(pesos(matriz[fila][0]), 14)
                        + ajustar(pesos(matriz[fila][1]), 14)
                        + pesos(matriz[fila][2]));
            }
        }
    }

    private static void buscar() {
        String texto = leerLinea("\nTexto a buscar: ");
        inventario.clasificar(hoy, diasAlerta);
        Producto[] encontrados = inventario.filtrar("todos", texto);
        Inventario.ordenar(encontrados, "nombre");
        imprimirTabla(encontrados, "RESULTADOS PARA \"" + texto + "\"");
    }

    private static void cambiarDiasAlerta() {
        diasAlerta = leerEntero("\n¿Con cuántos días de anticipación quieres la alerta? (1-60): ", 1, 60);
        System.out.println("Listo: se avisará " + diasAlerta + " días antes del vencimiento.");
    }

    // ------------------------------------------------------------------
    //  Ayudas de formato
    // ------------------------------------------------------------------

    /** Rellena o recorta un texto para que ocupe un ancho fijo en la tabla. */
    private static String ajustar(String texto, int ancho) {
        if (texto.length() > ancho - 1) {
            texto = texto.substring(0, ancho - 1);
        }
        StringBuilder sb = new StringBuilder(texto);
        while (sb.length() < ancho) {
            sb.append(' ');
        }
        return sb.toString();
    }

    /** Formatea dinero con puntos de miles: 1250000 -> $1.250.000 */
    public static String pesos(double valor) {
        long entero = Math.round(valor);
        String digitos = "" + Math.abs(entero);
        StringBuilder sb = new StringBuilder();
        int contador = 0;
        for (int i = digitos.length() - 1; i >= 0; i--) {
            sb.insert(0, digitos.charAt(i));
            contador++;
            if (contador % 3 == 0 && i > 0) {
                sb.insert(0, '.');
            }
        }
        return (entero < 0 ? "-$" : "$") + sb.toString();
    }

    /** Productos de ejemplo con fechas relativas a hoy para poder probar el menú. */
    private static void cargarEjemplos() {
        int base = Fechas.aDias(hoy);
        String[] nombres = {"Leche entera 1 L", "Pan tajado", "Yogur de fresa", "Queso campesino", "Arroz 500 g", "Jugo de naranja 1 L"};
        String[] categorias = {"Lácteos", "Panadería", "Lácteos", "Lácteos", "Abarrotes", "Bebidas"};
        int[] cantidades = {12, 6, 9, 4, 30, 8};
        double[] precios = {4200, 5800, 2500, 9800, 2900, 6500};
        int[] diasParaVencer = {3, -2, 1, -5, 180, 12};
        for (int i = 0; i < nombres.length; i++) {
            inventario.agregar(new Producto("P" + siguienteId, nombres[i], categorias[i],
                    cantidades[i], precios[i], Fechas.desdeDias(base + diasParaVencer[i])));
            siguienteId++;
        }
    }
}
