// T9 · Observabilidad (BLOQUE 4): Sentry para errores de CLIENTE (navegador).
// NEXT_PUBLIC_SENTRY_DSN se incrusta en el bundle — el DSN no es un secreto
// (solo permite ENVIAR eventos al proyecto), pero solo variables NEXT_PUBLIC_*
// llegan al navegador. Sin DSN el init es un no-op.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Solo errores; sin tracing ni session replay (cuota gratuita).
  tracesSampleRate: 0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
