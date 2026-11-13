package foodsaver;

/**
 * Utilidades de fechas escritas "a mano" (sin librerías) para practicar
 * condicionales anidadas, ciclos y funciones.
 * Las fechas se manejan como texto con formato AAAA-MM-DD.
 */
public class Fechas {

    /** Un año es bisiesto si es divisible por 4, salvo los siglos que no son divisibles por 400. */
    public static boolean esBisiesto(int anio) {
        boolean bisiesto;
        if (anio % 4 == 0) {
            if (anio % 100 == 0) {
                if (anio % 400 == 0) {
                    bisiesto = true;
                } else {
                    bisiesto = false;
                }
            } else {
                bisiesto = true;
            }
        } else {
            bisiesto = false;
        }
        return bisiesto;
    }

    /** Devuelve cuántos días tiene un mes (1 a 12) de un año dado. */
    public static int diasDelMes(int mes, int anio) {
        int[] diasPorMes = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        if (mes < 1 || mes > 12) {
            return 0;
        }
        if (mes == 2 && esBisiesto(anio)) {
            return 29;
        }
        return diasPorMes[mes - 1];
    }

    /**
     * Convierte el texto AAAA-MM-DD en un vector {anio, mes, dia}.
     * Devuelve null si el texto no es una fecha real.
     */
    public static int[] descomponer(String texto) {
        if (texto == null) {
            return null;
        }
        texto = texto.trim();
        if (texto.length() != 10 || texto.charAt(4) != '-' || texto.charAt(7) != '-') {
            return null;
        }
        // Todos los demás caracteres deben ser dígitos
        for (int i = 0; i < texto.length(); i++) {
            if (i != 4 && i != 7) {
                char c = texto.charAt(i);
                if (c < '0' || c > '9') {
                    return null;
                }
            }
        }
        int anio = Integer.parseInt(texto.substring(0, 4));
        int mes = Integer.parseInt(texto.substring(5, 7));
        int dia = Integer.parseInt(texto.substring(8, 10));

        if (anio < 2000 || anio > 2100) {
            return null;
        }
        if (mes < 1 || mes > 12) {
            return null;
        }
        if (dia < 1 || dia > diasDelMes(mes, anio)) {
            return null;
        }
        return new int[] {anio, mes, dia};
    }

    public static boolean esValida(String texto) {
        return descomponer(texto) != null;
    }

    /**
     * Cuenta los días transcurridos desde el 1 de enero de 2000 hasta la fecha dada.
     * Usa dos ciclos con acumulador: uno recorre años y otro recorre meses.
     */
    public static int aDias(String texto) {
        int[] partes = descomponer(texto);
        if (partes == null) {
            return -1;
        }
        int total = 0;
        for (int a = 2000; a < partes[0]; a++) {
            total += esBisiesto(a) ? 366 : 365;
        }
        for (int m = 1; m < partes[1]; m++) {
            total += diasDelMes(m, partes[0]);
        }
        total += partes[2] - 1;
        return total;
    }

    /** Días que faltan desde "hoy" hasta "vence". Negativo significa que ya venció. */
    public static int diasEntre(String hoy, String vence) {
        return aDias(vence) - aDias(hoy);
    }

    /** Operación inversa de aDias(): convierte un número de día en texto AAAA-MM-DD. */
    public static String desdeDias(int dias) {
        int anio = 2000;
        boolean seguir = true;
        while (seguir) {
            int diasDelAnio = esBisiesto(anio) ? 366 : 365;
            if (dias >= diasDelAnio) {
                dias -= diasDelAnio;
                anio++;
            } else {
                seguir = false;
            }
        }
        int mes = 1;
        while (dias >= diasDelMes(mes, anio)) {
            dias -= diasDelMes(mes, anio);
            mes++;
        }
        int dia = dias + 1;
        return anio + "-" + (mes < 10 ? "0" : "") + mes + "-" + (dia < 10 ? "0" : "") + dia;
    }
}
