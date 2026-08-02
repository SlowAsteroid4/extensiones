// Utilidades de las rutas de cuenta (OWASP ASVS §12 / §14.4):
//   · toda respuesta que toca credenciales sale con `no-store` — ni el
//     navegador ni un proxy intermedio deben guardar el correo consultado
//   · `nosniff` y `no-referrer` cierran el sniffing de tipo y la fuga del
//     correo por el header Referer
//   · el cuerpo se lee con tope de bytes: un POST de 50 MB no debe llegar a
//     JSON.parse ni a argon2 (denegación de servicio barata)

const CABECERAS_SEGURAS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
} as const;

export function respuestaSegura(cuerpo: unknown, status: number): Response {
  return Response.json(cuerpo, { status, headers: CABECERAS_SEGURAS });
}

export const TAMANO_MAXIMO_CUERPO = 4 * 1024;

export type CuerpoLeido = { ok: true; datos: unknown } | { ok: false; status: number; error: string };

export async function leerJsonLimitado(
  request: Request,
  maximoBytes = TAMANO_MAXIMO_CUERPO
): Promise<CuerpoLeido> {
  const declarado = Number(request.headers.get("content-length") ?? "0");
  if (declarado > maximoBytes) {
    return { ok: false, status: 413, error: "El cuerpo de la petición es demasiado grande" };
  }

  let texto: string;
  try {
    texto = await request.text();
  } catch {
    return { ok: false, status: 400, error: "El cuerpo debe ser JSON válido" };
  }

  if (new TextEncoder().encode(texto).byteLength > maximoBytes) {
    return { ok: false, status: 413, error: "El cuerpo de la petición es demasiado grande" };
  }

  try {
    return { ok: true, datos: JSON.parse(texto) };
  } catch {
    return { ok: false, status: 400, error: "El cuerpo debe ser JSON válido" };
  }
}
