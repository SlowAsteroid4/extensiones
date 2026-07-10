// Spec §7: /api/admin/* solo rol admin — 401 sin sesión, 403 con sesión clienta.
import { auth } from "@/shared/auth/config";

export type ResultadoGuardia =
  | { ok: true; cuentaId: string }
  | { ok: false; respuesta: Response };

export async function requiereAdmin(): Promise<ResultadoGuardia> {
  const sesion = await auth();
  if (!sesion?.user?.id) {
    return {
      ok: false,
      respuesta: Response.json({ error: "Inicia sesión para continuar." }, { status: 401 }),
    };
  }
  if (sesion.user.rol !== "admin") {
    return {
      ok: false,
      respuesta: Response.json({ error: "Requiere rol de administradora." }, { status: 403 }),
    };
  }
  return { ok: true, cuentaId: sesion.user.id };
}

// H15: errores POR CAMPO a partir de los issues de zod.
export function erroresPorCampo(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    campo: issue.path.map(String).join(".") || "(raíz)",
    mensaje: issue.message,
  }));
}
