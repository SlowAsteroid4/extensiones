// T8 — Única fuente de la URL base pública. Antes cada llamador repetía
// `process.env.APP_URL ?? "http://localhost:3000"`, lo que dejaba localhost
// hardcodeado en tres sitios (incluidos back_urls/notification_url de MP).
//
// Orden de resolución:
//   1. APP_URL           — la que se fija a mano en Vercel (producción y el
//                          dominio propio cuando llegue: solo cambia esta).
//   2. VERCEL_URL        — la inyecta Vercel en cada despliegue (previews);
//                          viene SIN protocolo, siempre https.
//   3. http://localhost:3000 — desarrollo local.
export function urlApp(): string {
  const explicita = process.env.APP_URL?.trim();
  if (explicita) return explicita.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
