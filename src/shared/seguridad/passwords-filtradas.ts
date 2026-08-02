// OWASP ASVS v4 §2.1.7 — contrastar la contraseña contra un corpus público de
// filtraciones. Se usa la API k-anonymity de Have I Been Pwned: se envían los
// PRIMEROS 5 caracteres del SHA-1 y el servicio devuelve todos los sufijos de
// ese prefijo; la comparación ocurre aquí. La contraseña (y su hash completo)
// NUNCA salen del servidor, y HIBP no puede saber cuál se consultó.
//
// Apagado por defecto: es una llamada de red en la ruta del alta. Se enciende
// con PWNED_PASSWORDS_CHECK=on (ver .env.example). Falla ABIERTO a propósito —
// que el servicio esté caído no puede impedir que una clienta se registre; la
// política local de `@/shared/validacion/password` ya se aplicó antes.
import { createHash } from "node:crypto";

const URL_RANGO = "https://api.pwnedpasswords.com/range/";
const TIEMPO_MAXIMO_MS = 1500;

export function chequeoFiltradasActivo(): boolean {
  return process.env.PWNED_PASSWORDS_CHECK === "on";
}

export async function passwordFiltrada(password: string): Promise<boolean> {
  if (!chequeoFiltradasActivo()) return false;

  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefijo = hash.slice(0, 5);
  const sufijo = hash.slice(5);

  try {
    const respuesta = await fetch(`${URL_RANGO}${prefijo}`, {
      // Add-Padding rellena la respuesta con sufijos falsos (conteo 0) para que
      // ni el tamaño de la respuesta delate el prefijo consultado.
      headers: { "Add-Padding": "true", "User-Agent": "extensiones-piloto" },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      cache: "no-store",
    });
    if (!respuesta.ok) return false;

    const cuerpo = await respuesta.text();
    for (const linea of cuerpo.split("\n")) {
      const [candidato, conteo] = linea.trim().split(":");
      if (candidato === sufijo) return Number(conteo) > 0; // el relleno viene con 0
    }
    return false;
  } catch {
    return false; // sin red o fuera de tiempo → no se bloquea el alta
  }
}
