// POST /api/cuenta/email-disponible — ¿este correo ya tiene cuenta?
// Solo POST (el correo nunca viaja en la URL) y con rate limit por IP: es lo
// que impide barrer una lista de correos. Ver la nota de enumeración en
// `@/modules/cuenta/disponibilidad`.
import { consultarDisponibilidad } from "@/modules/cuenta/disponibilidad";
import {
  ipDeSolicitud,
  limitadorConsultaEmail,
  MENSAJE_LIMITE_CONSULTA,
} from "@/shared/seguridad/rate-limit";
import { leerJsonLimitado, respuestaSegura } from "@/shared/seguridad/respuestas";

export async function POST(request: Request) {
  const ip = ipDeSolicitud(request);
  if (limitadorConsultaEmail.bloqueado(ip)) {
    return respuestaSegura({ error: MENSAJE_LIMITE_CONSULTA }, 429);
  }
  limitadorConsultaEmail.registrarIntento(ip);

  const cuerpo = await leerJsonLimitado(request, 1024);
  if (!cuerpo.ok) return respuestaSegura({ error: cuerpo.error }, cuerpo.status);

  const resultado = await consultarDisponibilidad(cuerpo.datos);
  if (!resultado.ok) return respuestaSegura({ error: resultado.error }, resultado.status);

  return respuestaSegura({ disponible: resultado.disponible }, 200);
}
