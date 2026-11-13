package foodsaver;

/** Un producto del inventario con sus datos básicos. */
public class Producto {

    // Estados posibles de un producto
    public static final int VENCIDO = 0;
    public static final int POR_VENCER = 1;
    public static final int VIGENTE = 2;
    public static final int AGOTADO = 3;

    public static final String[] CLAVES_ESTADO = {"vencido", "por_vencer", "vigente", "agotado"};
    public static final String[] NOMBRES_ESTADO = {"Vencido", "Por vencer", "Vigente", "Agotado"};

    public String id;
    public String nombre;
    public String categoria;
    public int cantidad;
    public double precio;
    public String vence; // AAAA-MM-DD

    // Datos calculados por Inventario.clasificar()
    public int diasRestantes;
    public int estado;

    public Producto(String id, String nombre, String categoria, int cantidad, double precio, String vence) {
        this.id = id;
        this.nombre = nombre;
        this.categoria = categoria;
        this.cantidad = cantidad;
        this.precio = precio;
        this.vence = vence;
    }

    /** Valor en dinero de las unidades que quedan. */
    public double valor() {
        return cantidad * precio;
    }
}
