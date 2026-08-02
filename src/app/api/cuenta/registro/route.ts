// POST /api/cuenta/registro — alta de clienta (H07).
// Capa de transporte del alta: rate limit por IP, tope de cuerpo y cabeceras
// sin caché. La política (contraseña, correo, duplicado) vive en el módulo.
import { registrarCuenta } from "@/modules/cuenta/registro";
import {
  ipDeSolicitud,
  limitadorRegistro,
  MENSAJE_LIMITE_REGISTRO,
} from "@/shared/seguridad/rate-limit";
import { leerJsonLimitado, respuestaSegura } from "@/shared/seguridad/respuestas";

export async function POST(request: Request) {
  const ip = ipDeSolicitud(request);
  if (limitadorRegistro.bloqueado(ip)) {
    return respuestaSegura({ error: MENSAJE_LIMITE_REGISTRO, campo: "general" }, 429);
  }

  const cuerpo = await leerJsonLimitado(request);
  if (!cuerpo.ok) {
    return respuestaSegura({ error: cuerpo.error, campo: "general" }, cuerpo.status);
  }

  const resultado = await registrarCuenta(cuerpo.datos);
  if (!resultado.ok) {
    // El intento cuenta para la ventana aunque falle: es justo el patrón del
    // alta masiva (miles de POST inválidos tanteando correos).
    limitadorRegistro.registrarIntento(ip);
    return respuestaSegura(
      { error: resultado.error, campo: resultado.campo, duplicado: resultado.duplicado ?? false },
      resultado.status
    );
  }

  limitadorRegistro.registrarIntento(ip);
  return respuestaSegura(resultado.cuenta, 201);
}
