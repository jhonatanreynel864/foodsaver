package foodsaver;

/** Pequeño ayudante para escribir texto JSON, el formato con el que Java le responde a la página. */
public class Json {

    private StringBuilder sb = new StringBuilder();
    private boolean necesitaComa = false;

    private void coma() {
        if (necesitaComa) {
            sb.append(',');
        }
        necesitaComa = true;
    }

    public static String escapar(String texto) {
        if (texto == null) {
            return "";
        }
        StringBuilder limpio = new StringBuilder();
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (c == '"') {
                limpio.append("\\\"");
            } else if (c == '\\') {
                limpio.append("\\\\");
            } else if (c == '\n') {
                limpio.append("\\n");
            } else if (c == '\r') {
                limpio.append("\\r");
            } else if (c == '\t') {
                limpio.append("\\t");
            } else if (c < 32) {
                limpio.append(' ');
            } else {
                limpio.append(c);
            }
        }
        return limpio.toString();
    }

    /** Redondea a dos decimales para manejar dinero. */
    public static double redondear(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }

    public Json abrirObjeto() { coma(); sb.append('{'); necesitaComa = false; return this; }
    public Json abrirObjeto(String clave) { clave(clave); sb.append('{'); necesitaComa = false; return this; }
    public Json cerrarObjeto() { sb.append('}'); necesitaComa = true; return this; }
    public Json abrirLista(String clave) { clave(clave); sb.append('['); necesitaComa = false; return this; }
    public Json cerrarLista() { sb.append(']'); necesitaComa = true; return this; }

    private void clave(String clave) {
        coma();
        sb.append('"').append(escapar(clave)).append("\":");
    }

    public Json texto(String clave, String valor) {
        clave(clave);
        sb.append('"').append(escapar(valor)).append('"');
        return this;
    }

    public Json entero(String clave, int valor) {
        clave(clave);
        sb.append(valor);
        return this;
    }

    public Json decimal(String clave, double valor) {
        clave(clave);
        sb.append(redondear(valor));
        return this;
    }

    public Json logico(String clave, boolean valor) {
        clave(clave);
        sb.append(valor ? "true" : "false");
        return this;
    }

    public String toString() {
        return sb.toString();
    }
}
