/*
 * CONFIGURACIÓN DE FOODSAVER
 * --------------------------
 * Pega aquí los datos de tu proyecto de Supabase
 * (Supabase > Project Settings > API):
 *
 *   supabaseUrl      -> "Project URL"
 *   supabaseAnonKey  -> clave pública "anon" / "publishable"
 *
 * Esta clave es pública por diseño: la seguridad la dan las reglas RLS
 * del archivo supabase/esquema.sql. NUNCA pegues aquí la clave "service_role".
 *
 * Si dejas los dos campos vacíos, la página funciona en modo demostración
 * y guarda los datos solo en el navegador.
 */
window.FOODSAVER_CONFIG = {
  supabaseUrl: "https://kmsjybyofkgqcceivuii.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc2p5YnlvZmtncWNjZWl2dWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MjUwMjcsImV4cCI6MjExMDEwMTAyN30.Ms4bJKu0OxGGdFD_M_1caD8DqMTnZ4tj0EsMe0Ql4uQ",

  // Versión del motor Java para navegador (CheerpJ)
  cheerpjLoader: "https://cjrtnc.leaningtech.com/4.3/loader.js"
};
