// Revisión de correo para el alta — OWASP ASVS v4 §5.1 (validación de entrada)
// + higiene OSINT del dato de contacto. Sirve al cliente (pintar el estado del
// campo) y al servidor (decidir), sin depender de node ni del DOM.
//
// Qué se comprueba y por qué:
//   1. Forma estricta local@dominio.tld — se rechazan el dominio de una sola
//      etiqueta, la IP literal (ana@[192.168.0.1]) y los puntos dobles.
//   2. Dominio SOLO ASCII: un dominio con Unicode abre la puerta al homógrafo
//      (gmaіl.com con "і" cirílica se lee idéntico). El piloto vende en México,
//      así que se rechaza con un mensaje claro en vez de intentar adivinar.
//   3. Buzones que no reciben correo (no-reply@…): la cuenta quedaría sin
//      forma de recuperarse.
//   4. Dominios desechables de las listas públicas: son el canal habitual del
//      alta masiva automatizada y dejan cuentas huérfanas al expirar el buzón.
//
// Lo que NO se hace: consultar MX ni verificar existencia del buzón. Eso es una
// llamada de red por pulsación y filtraría la lista de clientas a un tercero.

export const MENSAJE_EMAIL = "El correo no tiene un formato válido";
export const MENSAJE_EMAIL_LARGO = "El correo es demasiado largo";
export const MENSAJE_EMAIL_DOMINIO = "El dominio del correo no parece válido";
export const MENSAJE_EMAIL_UNICODE =
  "Escribe el dominio con letras normales (sin acentos ni otros alfabetos)";
export const MENSAJE_EMAIL_SIN_BUZON = "Ese correo no recibe mensajes: usa uno personal";
export const MENSAJE_EMAIL_DESECHABLE =
  "Ese correo es temporal. Usa uno permanente para no perder el acceso a tu cuenta";

const LARGO_MAXIMO_EMAIL = 254; // RFC 5321 §4.5.3.1
const LARGO_MAXIMO_LOCAL = 64;

const LOCAL_VALIDO = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMINIO_VALIDO = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/;

// Buzones automáticos: aceptar el alta condenaría la cuenta a no recuperarse.
const LOCALES_SIN_BUZON = new Set([
  "no-reply",
  "noreply",
  "no_reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "abuse",
  "bounce",
  "bounces",
]);

// Dominios de correo temporal más vistos en las listas públicas (disposable-
// email-domains). Es una lista corta a propósito: bloquear de más molesta a
// clientas reales, y el registro no es el único control (hay rate limit).
export const DOMINIOS_DESECHABLES: ReadonlySet<string> = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "burnermail.io",
  "correotemporal.org",
  "discard.email",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "grr.la",
  "guerrillamail.com",
  "guerrillamail.info",
  "harakirimail.com",
  "inboxkitten.com",
  "luxusmail.org",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.org",
  "tempmail.com",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "tmpmail.org",
  "trashmail.com",
  "yopmail.com",
  "yopmail.net",
]);

export type RevisionEmail = { ok: true; email: string } | { ok: false; motivo: string };

/** Trim + minúsculas: es la forma en que se guarda y con la que se compara. */
export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

/** Dominio registrable aproximado (últimas dos etiquetas) para cazar subdominios. */
function dominioBase(dominio: string): string {
  const etiquetas = dominio.split(".");
  return etiquetas.slice(-2).join(".");
}

export function esDesechable(dominio: string): boolean {
  return DOMINIOS_DESECHABLES.has(dominio) || DOMINIOS_DESECHABLES.has(dominioBase(dominio));
}

export function revisarEmail(valor: unknown): RevisionEmail {
  if (typeof valor !== "string") return { ok: false, motivo: MENSAJE_EMAIL };

  const email = normalizarEmail(valor);
  if (email.length === 0) return { ok: false, motivo: MENSAJE_EMAIL };
  if (email.length > LARGO_MAXIMO_EMAIL) return { ok: false, motivo: MENSAJE_EMAIL_LARGO };

  const arroba = email.lastIndexOf("@");
  if (arroba <= 0 || arroba === email.length - 1) return { ok: false, motivo: MENSAJE_EMAIL };

  const local = email.slice(0, arroba);
  const dominio = email.slice(arroba + 1);

  // Unicode ANTES que la forma: el mensaje del homógrafo es más útil que
  // "formato inválido" cuando la clienta copió el correo de otra app.
  if (/[^\u0020-\u007e]/.test(dominio)) return { ok: false, motivo: MENSAJE_EMAIL_UNICODE };

  if (local.length > LARGO_MAXIMO_LOCAL || !LOCAL_VALIDO.test(local)) {
    return { ok: false, motivo: MENSAJE_EMAIL };
  }
  if (!DOMINIO_VALIDO.test(dominio)) return { ok: false, motivo: MENSAJE_EMAIL_DOMINIO };

  if (LOCALES_SIN_BUZON.has(local)) return { ok: false, motivo: MENSAJE_EMAIL_SIN_BUZON };
  if (esDesechable(dominio)) return { ok: false, motivo: MENSAJE_EMAIL_DESECHABLE };

  return { ok: true, email };
}
