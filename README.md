# FoodSaver — Control de vencimiento y desperdicio de alimentos

Página web para tiendas y minimercados: registra productos con cantidad, precio y fecha de vencimiento, avisa cuáles están vencidos o por vencer, descuenta las ventas y calcula cuánto dinero se pierde por producto que no se vendió a tiempo.

- **Lógica:** Java (carpeta `java-src/`), compilada en `java/foodsaver.jar`
- **Base de datos:** Supabase (PostgreSQL + cuentas de usuario)
- **Alojamiento:** Vercel (sitio estático, sin paso de compilación)

## Cómo funciona Java en una página de Vercel

Vercel no ejecuta servidores Java. Por eso el programa Java corre **dentro del navegador** con [CheerpJ](https://cheerpj.com), una máquina virtual de Java para la web. La página carga `java/foodsaver.jar` y llama a la clase `foodsaver.Puente`.

```
Pantalla (HTML/CSS/JS)  →  Puente.java  →  Inventario, Validador, Fechas (Java)
        ↑                                              │
        └──────────── respuesta en JSON ───────────────┘
Supabase guarda y entrega los datos; Java hace todos los cálculos.
```

El JavaScript solo dibuja la pantalla y habla con Supabase. Validar, clasificar por vencimiento, vender, registrar pérdidas, calcular totales, filtrar y ordenar se hace en Java.

El mismo código Java funciona también como **programa de consola con menú**:

```
java -cp java/foodsaver.jar foodsaver.MenuConsola
```

## Dónde está cada tema de la rúbrica

| Tema | Dónde verlo |
|---|---|
| Variables y tipos de datos | `Producto.java` (String, int, double), constantes en `Validador.java` |
| Operadores lógicos y relacionales | `Validador.java`, `Inventario.filtrar()`, `Inventario.revisarVenta()` |
| Condicional simple | `Inventario.agregar()`, `Validador.validarNombre()` |
| Condicional doble | `Inventario.revisarVenta()` (1 unidad / varias), `Inventario.vaAntes()` |
| Condicionales anidadas | `Fechas.esBisiesto()`, `Inventario.calcularEstado()` |
| Ciclos `for`, `while`, `do-while` | `Inventario.clasificar()`, `Fechas.desdeDias()`, `MenuConsola.main()` |
| Contadores y acumuladores | `Inventario.contarPorEstado()`, `unidadesTotales()`, `valorPorEstado()` |
| Vectores | `Producto[]` en `Inventario`, `CATEGORIAS`, `diasPorMes` |
| Matrices | `Inventario.matrizValores()` (categoría × estado), `Puente.historial()` (día × tipo) |
| Funciones y procedimientos | Todas las clases; p. ej. `Inventario.ordenar()` (ordenamiento por inserción) |
| Validación de datos | `Validador.java` y la lectura validada de `MenuConsola` |
| Menú funcional | `MenuConsola.java` (`switch` con 9 opciones) |

## Puesta en marcha

### 1. Crear la base de datos en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto.
2. Abre **SQL Editor → New query**, pega todo el contenido de `supabase/esquema.sql` y pulsa **Run**.
3. Abre **Project Settings → API** y copia el **Project URL** y la clave pública (**anon** / **publishable**).
4. Pega ambos datos en `js/config.js`:

```js
window.FOODSAVER_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU-CLAVE-PUBLICA",
  ...
};
```

La clave pública puede ir en el código: las reglas RLS de `esquema.sql` hacen que cada usuario vea solo sus datos. **Nunca** uses la clave `service_role`.

Si dejas esos campos vacíos, la página abre en **modo demostración** (datos de ejemplo guardados en el navegador).

### 2. Subir a Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com): **Add New → Project**, elige el repositorio.
3. En **Framework Preset** deja **Other**; no escribas comando de compilación ni carpeta de salida.
4. Pulsa **Deploy**.

### 3. Ajustar el correo de confirmación

Supabase envía un correo para confirmar cada cuenta nueva. En **Authentication → URL Configuration** pon en **Site URL** la dirección de tu página en Vercel, para que el enlace del correo lleve allí. Para una presentación en clase puedes desactivar la confirmación en **Authentication → Sign In / Providers → Email → Confirm email**.

## Probar en tu computador

La página necesita un servidor web (no abre con doble clic porque el motor Java descarga el `.jar` por HTTP):

```
npx serve .
```

## Cambiar el código Java

Necesitas un JDK 11 o superior.

```
sh java-src/compilar.sh            # compila y actualiza java/foodsaver.jar
sh java-src/compilar.sh pruebas    # además ejecuta las 45 pruebas automáticas
sh java-src/compilar.sh consola    # además abre el menú de consola
```

Después de compilar, sube de nuevo `java/foodsaver.jar` al repositorio.

## Carpetas

```
index.html            página
css/estilos.css       diseño (escritorio y celular)
js/config.js          datos de conexión a Supabase
js/motor-java.js      carga CheerpJ y el .jar
js/datos.js           lectura y guardado (Supabase o demostración)
js/app.js             pantalla e interacción
java-src/foodsaver/   código fuente Java
java/foodsaver.jar    Java compilado que usa la página
supabase/esquema.sql  tablas y reglas de seguridad
fonts/, vendor/       tipografías y librería de Supabase (sin depender de CDN)
```

## Reglas del negocio

- **Vencido:** la fecha ya pasó. No se puede vender; se retira y suma a las pérdidas.
- **Por vencer:** faltan los días de alerta o menos (7 por defecto, se cambia en Ajustes). Vence hoy cuenta como por vencer.
- **Vigente:** faltan más días que la alerta.
- **Agotado:** quedan 0 unidades.
- **Pérdida actual:** cantidad × precio de los productos vencidos que siguen en el estante.
- **Por salvar:** cantidad × precio de los productos por vencer.
- **Desperdicio:** dinero perdido ÷ (dinero vendido + dinero perdido).

## Diseño

Paleta: azul marino `#112250`, zafiro `#3B507D`, taupe cálido `#BEB7A7`, champaña `#E7E2CE` y marfil `#F5F4F0`. El rojo, el ámbar y el verde se usan solo para indicar el estado de los productos. La página tiene tres secciones: **Inicio** (qué hacer hoy), **Productos** (inventario) y **Reportes** (ventas y pérdidas).

## Licencias

CheerpJ es de Leaning Technologies y se puede usar gratis en proyectos personales; para uso comercial revisa su licencia. Tipografías Gabarito y Figtree: SIL Open Font License.
