/*
 * MOTOR JAVA
 * ----------
 * Carga CheerpJ (una máquina virtual de Java que corre dentro del navegador),
 * abre java/foodsaver.jar y expone las funciones de la clase foodsaver.Puente.
 *
 * Toda la lógica del negocio está escrita en Java (carpeta java-src/).
 * Este archivo solo hace de mensajero: envía textos y recibe JSON.
 */
const MotorJava = (() => {
  let puente = null;
  let arranque = null;
  let cola = Promise.resolve();

  function cargarScript(url) {
    return new Promise((resolver, rechazar) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolver;
      s.onerror = () => rechazar(new Error("No se pudo descargar el motor Java. Revisa tu conexión a internet."));
      document.head.appendChild(s);
    });
  }

  function iniciar() {
    if (window.__motorPrueba) return Promise.resolve();
    if (!arranque) {
      arranque = (async () => {
        const config = window.FOODSAVER_CONFIG || {};
        await cargarScript(config.cheerpjLoader || "https://cjrtnc.leaningtech.com/4.3/loader.js");
        if (typeof cheerpjInit !== "function") {
          throw new Error("El motor Java no se cargó correctamente.");
        }
        await cheerpjInit({ version: 8, status: "none" });
        // CheerpJ ve los archivos del sitio dentro de la carpeta virtual /app/
        const rutaJar = "/app" + new URL("java/foodsaver.jar", document.baseURI).pathname;
        const libreria = await cheerpjRunLibrary(rutaJar);
        puente = await libreria.foodsaver.Puente;
      })();
      arranque.catch(() => { arranque = null; });
    }
    return arranque;
  }

  async function ejecutar(metodo, textos) {
    let crudo;
    if (window.__motorPrueba) {
      crudo = await window.__motorPrueba(metodo, textos);
    } else {
      await iniciar();
      crudo = await puente[metodo](...textos);
      if (typeof crudo !== "string") crudo = String(await crudo.toString());
    }
    return JSON.parse(crudo);
  }

  /** Llama una función de Puente.java. Las llamadas se atienden de una en una. */
  function llamar(metodo, ...args) {
    const textos = args.map((a) => (a === null || a === undefined ? "" : String(a)));
    const resultado = cola.then(() => ejecutar(metodo, textos));
    cola = resultado.catch(() => {});
    return resultado;
  }

  return { iniciar, llamar };
})();
