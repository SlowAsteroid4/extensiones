import { requiereAdmin } from "@/modules/admin/guardia";

// T9 · Verificación de Sentry (BLOQUE 4): dispara un error CONTROLADO de
// servidor para comprobar que llega al panel de Sentry. Solo rol admin —
// nadie sin sesión puede provocar errores a voluntad.
export async function GET() {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;
  throw new Error("Error de prueba T9: verificación de Sentry (inofensivo, disparado por admin)");
}
