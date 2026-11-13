import foodsaver.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Pruebas automáticas de la lógica. Ejecutar con: sh java-src/compilar.sh pruebas */
public class Pruebas {
    static int ok = 0, fallos = 0;

    static void verificar(boolean condicion, String nombre) {
        if (condicion) { ok++; } else { fallos++; System.out.println("FALLO: " + nombre); }
    }

    public static void main(String[] a) {
        // Fechas: comparar contra java.time en todo el rango 2000-2100
        LocalDate d = LocalDate.of(2000, 1, 1);
        LocalDate fin = LocalDate.of(2100, 12, 31);
        boolean fechasBien = true;
        while (!d.isAfter(fin)) {
            int esperado = (int) ChronoUnit.DAYS.between(LocalDate.of(2000, 1, 1), d);
            if (Fechas.aDias(d.toString()) != esperado || !Fechas.desdeDias(esperado).equals(d.toString())) {
                fechasBien = false;
                System.out.println("Fecha mal: " + d);
                break;
            }
            d = d.plusDays(1);
        }
        verificar(fechasBien, "fechas 2000-2100 iguales a java.time");
        verificar(Fechas.esBisiesto(2024) && !Fechas.esBisiesto(2100) && Fechas.esBisiesto(2000) && !Fechas.esBisiesto(2026), "bisiestos");
        verificar(!Fechas.esValida("2026-02-29") && Fechas.esValida("2028-02-29"), "29 de febrero");
        verificar(!Fechas.esValida("2026-13-01") && !Fechas.esValida("2026-04-31") && !Fechas.esValida("26-04-01")
                && !Fechas.esValida("2026/04/01") && !Fechas.esValida("") && !Fechas.esValida(null) && !Fechas.esValida("2026-0a-01"), "fechas inválidas");
        verificar(Fechas.diasEntre("2026-11-10", "2026-11-17") == 7 && Fechas.diasEntre("2026-11-10", "2026-11-09") == -1
                && Fechas.diasEntre("2026-12-31", "2027-01-01") == 1, "diasEntre");

        // Validador
        verificar(Validador.validarNombre("").length() > 0 && Validador.validarNombre("a").length() > 0
                && Validador.validarNombre("123").length() > 0 && Validador.validarNombre("Leche 1L").length() == 0, "nombre");
        verificar(Validador.validarCantidad("5", false).length() == 0 && Validador.validarCantidad("0", false).length() > 0
                && Validador.validarCantidad("0", true).length() == 0 && Validador.validarCantidad("-3", false).length() > 0
                && Validador.validarCantidad("2.5", false).length() > 0 && Validador.validarCantidad("abc", false).length() > 0
                && Validador.validarCantidad("9999999", false).length() > 0 && Validador.validarCantidad("99999999999", false).length() > 0, "cantidad");
        verificar(Validador.validarPrecio("3500").length() == 0 && Validador.validarPrecio("3500,50").length() == 0
                && Validador.validarPrecio("0").length() > 0 && Validador.validarPrecio("1.2.3").length() > 0
                && Validador.validarPrecio(".").length() > 0 && Validador.validarPrecio("-4").length() > 0
                && Validador.validarPrecio("").length() > 0, "precio");
        verificar(Validador.validarCategoria("Lácteos").length() == 0 && Validador.validarCategoria("Juguetes").length() > 0, "categoría");

        // Inventario
        Inventario inv = new Inventario(10);
        inv.agregar(new Producto("1", "Leche", "Lácteos", 10, 4000, "2026-11-12"));     // por vencer (2 d)
        inv.agregar(new Producto("2", "Pan", "Panadería", 5, 6000, "2026-11-08"));      // vencido
        inv.agregar(new Producto("3", "Arroz", "Abarrotes", 20, 3000, "2027-05-01"));   // vigente
        inv.agregar(new Producto("4", "Queso", "Lácteos", 0, 9000, "2026-11-01"));      // agotado
        inv.agregar(new Producto("5", "Ñame árabe", "Frutas y verduras", 3, 2000, "2026-11-10")); // vence hoy
        inv.agregar(new Producto("6", "Yogur", "Lácteos", 2, 2500, "2026-11-17"));      // límite: 7 días -> por vencer
        inv.agregar(new Producto("7", "Jugo", "Bebidas", 2, 5000, "2026-11-18"));       // 8 días -> vigente
        inv.clasificar("2026-11-10", 7);
        verificar(inv.contarPorEstado(Producto.VENCIDO) == 1 && inv.contarPorEstado(Producto.POR_VENCER) == 3
                && inv.contarPorEstado(Producto.VIGENTE) == 2 && inv.contarPorEstado(Producto.AGOTADO) == 1, "conteo por estado");
        verificar(inv.perdidaPorVencidos() == 30000 && inv.valorEnRiesgo() == 40000 + 6000 + 5000, "pérdida y riesgo");
        verificar(inv.unidadesTotales() == 42, "unidades");
        double[][] m = inv.matrizValores();
        verificar(m[0][1] == 45000 && m[1][0] == 30000 && m[5][2] == 60000 && m[0][0] == 0, "matriz");
        Producto[] f = inv.filtrar("todos", "NAME ARABE");
        verificar(f.length == 0, "búsqueda no confunde ñ con n");
        f = inv.filtrar("todos", "ñame ARABE");
        verificar(f.length == 1 && f[0].id.equals("5"), "búsqueda sin tildes");
        f = inv.filtrar("por_vencer", "lacteos");
        verificar(f.length == 2, "filtro + búsqueda por categoría");
        f = inv.filtrar("todos", "");
        Inventario.ordenar(f, "vence");
        verificar(f[0].id.equals("2") && f[1].id.equals("5") && f[2].id.equals("1") && f[6].id.equals("4"), "orden por vencimiento, agotado al final");
        Inventario.ordenar(f, "nombre");
        verificar(f[0].nombre.equals("Arroz") && f[6].nombre.equals("Yogur"), "orden por nombre");
        Inventario.ordenar(f, "valor");
        verificar(f[0].id.equals("3") && f[6].id.equals("4"), "orden por valor");

        verificar(inv.registrarVenta("1", 4, "2026-11-10").length() == 0 && inv.get(0).cantidad == 6, "venta normal");
        verificar(inv.registrarVenta("1", 7, "2026-11-10").length() > 0 && inv.get(0).cantidad == 6, "venta mayor al stock");
        verificar(inv.registrarVenta("2", 1, "2026-11-10").length() > 0, "no vender vencido");
        verificar(inv.registrarVenta("5", 3, "2026-11-10").length() == 0, "vender el día que vence");
        verificar(inv.registrarVenta("4", 1, "2026-11-10").length() > 0, "no vender agotado");
        verificar(inv.registrarVenta("99", 1, "2026-11-10").length() > 0, "producto inexistente");
        verificar(inv.darDeBaja("2") == 30000 && inv.get(1).cantidad == 0, "dar de baja");
        verificar(inv.eliminar("3") && inv.getTotal() == 6 && inv.buscarPorId("3") == -1 && inv.buscarPorId("7") == 5, "eliminar");
        Inventario lleno = new Inventario(1);
        verificar(lleno.agregar(new Producto("a", "x", "Otros", 1, 1, "2026-01-01"))
                && !lleno.agregar(new Producto("b", "y", "Otros", 1, 1, "2026-01-01")), "inventario lleno");

        // Puente
        String datos = "1\tLeche \"La Vaca\"\tLácteos\t10\t4000\t2026-11-12\n"
                + "2\tPan\tPanadería\t5\t6000.5\t2026-11-08\n"
                + "línea dañada\n"
                + "3\tArroz\tAbarrotes\t20\t3000\t2027-05-01";
        String r = Puente.analizar(datos, "2026-11-10", "7", "todos", "", "vence");
        verificar(r.startsWith("{\"ok\":true") && r.contains("\"total\":3") && r.contains("\"vencidos\":1")
                && r.contains("\"perdida\":30002.5") && r.contains("Leche \\\"La Vaca\\\""), "analizar: " + r);
        verificar(Puente.analizar("", "2026-11-10", "7", "todos", "", "vence").contains("\"total\":0"), "analizar vacío");
        verificar(Puente.analizar(null, "2026-11-10", "x", null, null, null).contains("\"diasAlerta\":7"), "analizar con nulos");
        verificar(Puente.analizar(datos, "hoy", "7", "", "", "").contains("\"ok\":false"), "analizar con hoy inválido");
        r = Puente.validarProducto(" Leche ", "Lácteos", "12", "4.200,5", "2026-11-20", "2026-11-10", "no");
        verificar(r.contains("\"ok\":false"), "precio con dos separadores se rechaza");
        r = Puente.validarProducto(" Leche ", "Lácteos", "12", "4200,5", "2026-11-09", "2026-11-10", "no");
        verificar(r.contains("\"ok\":true") && r.contains("\"nombre\":\"Leche\"") && r.contains("\"precio\":4200.5") && r.contains("ya pasó"), "validar ok con aviso: " + r);
        r = Puente.validarProducto("", "", "", "", "", "2026-11-10", "no");
        verificar(r.contains("\"ok\":false") && !r.contains("limpio"), "validar todo vacío");
        verificar(Puente.vender("10", "3", "4000", "2026-11-12", "2026-11-10").contains("\"nuevaCantidad\":7"), "puente vender");
        verificar(Puente.vender("10", "3", "4000", "2026-11-12", "2026-11-10").contains("\"total\":12000.0"), "puente total venta");
        verificar(Puente.vender("10", "11", "4000", "2026-11-12", "2026-11-10").contains("Solo quedan 10"), "puente vender de más");
        verificar(Puente.vender("10", "1", "4000", "2026-11-01", "2026-11-10").contains("ya venció"), "puente vender vencido");
        verificar(Puente.vender("10", "", "4000", "2026-11-12", "2026-11-10").contains("\"ok\":false"), "puente vender vacío");
        verificar(Puente.baja("5", "5", "6000").contains("\"total\":30000.0") && Puente.baja("5", "6", "6000").contains("\"ok\":false"), "puente baja");
        String mov = "venta\t3\t12000\t2026-11-10\nbaja\t5\t30000\t2026-11-08\nventa\t1\t4000\t2026-10-01\notro\t1\t1\t2026-11-10";
        r = Puente.historial(mov, "2026-11-10");
        verificar(r.contains("\"totalVentas\":16000.0") && r.contains("\"totalBajas\":30000.0") && r.contains("\"tasaDesperdicio\":65.22")
                && r.contains("{\"fecha\":\"2026-11-10\",\"ventas\":12000.0,\"bajas\":0.0}")
                && r.contains("{\"fecha\":\"2026-11-08\",\"ventas\":0.0,\"bajas\":30000.0}")
                && r.contains("{\"fecha\":\"2026-10-28\""), "historial: " + r);
        verificar(Puente.historial("", "2026-11-10").contains("\"tasaDesperdicio\":0.0"), "historial vacío");
        verificar(Puente.categorias().contains("Lácteos"), "categorías");
        verificar(MenuConsola.pesos(1250000).equals("$1.250.000") && MenuConsola.pesos(900).equals("$900") && MenuConsola.pesos(100000).equals("$100.000"), "formato pesos");

        System.out.println(ok + " pruebas correctas, " + fallos + " fallos");
        if (fallos > 0) { System.exit(1); }
    }
}
