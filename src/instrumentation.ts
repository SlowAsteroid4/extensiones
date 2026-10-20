// T9 · Observabilidad (BLOQUE 4): Sentry para errores de SERVIDOR.
// Sin SENTRY_DSN el init es un no-op: la app funciona igual sin cuenta de
// Sentry — el dueño la activa cargando el DSN en Vercel y redesplegando.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Solo errores; sin tracing (0 = no consume cuota de performance del
    // plan gratuito). Los errores no se muestrean: van todos.
    tracesSampleRate: 0,
    enableLogs: false,
    // Evita adjuntar datos personales por default (emails, IPs).
    sendDefaultPii: false,
  });
}

// Captura los errores que atrapa el servidor de Next (rutas API incluidas).
export const onRequestError = Sentry.captureRequestError;
