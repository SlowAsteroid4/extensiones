// Rutas nativas de Auth.js (convención propia, reportada en el handoff):
//   GET  /api/auth/csrf                  → { csrfToken }
//   POST /api/auth/callback/credentials  → login (form-urlencoded con csrfToken)
//   GET  /api/auth/session               → sesión actual (o vacío)
//   POST /api/auth/signout               → logout
//
// El POST de login va envuelto con el rate limit de 3.D.5 para poder responder
// 429 antes de delegar en Auth.js.
import type { NextRequest } from "next/server";
import { handlers } from "@/shared/auth/config";
import { limitadorLogin } from "@/shared/seguridad/rate-limit";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  if (!request.nextUrl.pathname.endsWith("/callback/credentials")) {
    return handlers.POST(request);
  }

  let email = "";
  try {
    const formulario = await request.clone().formData();
    email = String(formulario.get("email") ?? "")
      .trim()
      .toLowerCase();
  } catch {
    // Cuerpo ilegible: se delega tal cual y Auth.js responde el error.
  }

  if (email && limitadorLogin.bloqueado(email)) {
    return Response.json(
      { error: "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  const respuesta = await handlers.POST(request);

  // Login exitoso ⇔ Auth.js emite la cookie de sesión; si no la hay, cuenta
  // como intento fallido para la ventana del limitador.
  if (email) {
    const huboSesion = respuesta.headers
      .getSetCookie()
      .some((cookie) => cookie.includes("session-token") && !cookie.includes("=;"));
    if (huboSesion) {
      limitadorLogin.limpiar(email);
    } else {
      limitadorLogin.registrarFallo(email);
    }
  }

  return respuesta;
}
