package foodsaver;

/**
 * Validación de datos de entrada. Cada función devuelve un texto vacío ""
 * cuando el dato es correcto, o el mensaje de error cuando no lo es.
 */
public class Validador {

    public static final int MAX_CANTIDAD = 100000;
    public static final double MAX_PRECIO = 100000000.0;

    public static final String[] CATEGORIAS = {
        "Lácteos", "Panadería", "Frutas y verduras", "Carnes y embutidos",
        "Bebidas", "Abarrotes", "Snacks", "Otros"
    };

    public static String validarNombre(String nombre) {
        if (nombre == null || nombre.trim().length() == 0) {
            return "Escribe el nombre del producto.";
        }
        String limpio = nombre.trim();
        if (limpio.length() < 2) {
            return "El nombre debe tener al menos 2 letras.";
        }
        if (limpio.length() > 60) {
            return "El nombre no puede pasar de 60 caracteres.";
        }
        // Debe contener al menos una letra (no solo números o símbolos)
        boolean tieneLetra = false;
        int i = 0;
        while (i < limpio.length() && !tieneLetra) {
            if (Character.isLetter(limpio.charAt(i))) {
                tieneLetra = true;
            }
            i++;
        }
        if (!tieneLetra) {
            return "El nombre debe incluir letras.";
        }
        return "";
    }

    public static String validarCategoria(String categoria) {
        if (categoria == null || categoria.trim().length() == 0) {
            return "Elige una categoría.";
        }
        for (int i = 0; i < CATEGORIAS.length; i++) {
            if (CATEGORIAS[i].equals(categoria.trim())) {
                return "";
            }
        }
        return "La categoría no es válida.";
    }

    /** ¿El texto es un número entero sin signo? (solo dígitos) */
    public static boolean esEntero(String texto) {
        if (texto == null) {
            return false;
        }
        texto = texto.trim();
        if (texto.length() == 0 || texto.length() > 9) {
            return false;
        }
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (c < '0' || c > '9') {
                return false;
            }
        }
        return true;
    }

    /** ¿El texto es un número decimal positivo? Acepta punto o coma como separador decimal. */
    public static boolean esDecimal(String texto) {
        if (texto == null) {
            return false;
        }
        texto = texto.trim();
        if (texto.length() == 0 || texto.length() > 14) {
            return false;
        }
        int separadores = 0;
        int digitos = 0;
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (c == '.' || c == ',') {
                separadores++;
            } else if (c >= '0' && c <= '9') {
                digitos++;
            } else {
                return false;
            }
        }
        return digitos > 0 && separadores <= 1;
    }

    public static double aDecimal(String texto) {
        return Double.parseDouble(texto.trim().replace(',', '.'));
    }

    public static String validarCantidad(String texto, boolean permitirCero) {
        if (texto == null || texto.trim().length() == 0) {
            return "Escribe la cantidad.";
        }
        if (!esEntero(texto)) {
            return "La cantidad debe ser un número entero, sin letras ni decimales.";
        }
        int cantidad = Integer.parseInt(texto.trim());
        if (cantidad == 0 && !permitirCero) {
            return "La cantidad debe ser mayor que cero.";
        }
        if (cantidad > MAX_CANTIDAD) {
            return "La cantidad máxima es " + MAX_CANTIDAD + " unidades.";
        }
        return "";
    }

    public static String validarPrecio(String texto) {
        if (texto == null || texto.trim().length() == 0) {
            return "Escribe el precio.";
        }
        if (!esDecimal(texto)) {
            return "El precio debe ser un número, por ejemplo 3500.";
        }
        double precio = aDecimal(texto);
        if (precio <= 0) {
            return "El precio debe ser mayor que cero.";
        }
        if (precio > MAX_PRECIO) {
            return "El precio es demasiado alto.";
        }
        return "";
    }

    public static String validarFecha(String texto) {
        if (texto == null || texto.trim().length() == 0) {
            return "Elige la fecha de vencimiento.";
        }
        if (!Fechas.esValida(texto)) {
            return "La fecha no existe. Revisa el día, el mes y el año.";
        }
        return "";
    }
}
