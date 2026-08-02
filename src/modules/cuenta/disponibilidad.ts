// H07 · comprobación de correo en vivo para el formulario de alta: dice si un
// correo ya tiene cuenta ANTES de que la clienta escriba la contraseña.
//
// Nota de seguridad, explícita porque es una decisión, no un descuido: este
// endpoint es un oráculo de enumeración de usuarias. Se acepta porque el alta
// YA lo era (el 409 dice "ese correo ya está registrado", cerrado en T4) y
// porque la alternativa —enterarse al final, tras escribir la contraseña— es
// peor para la clienta. Lo que sí se hace es encarecerlo:
//   · rate limit por IP en la ruta (30 consultas / 10 min → 429)
//   · POST, nunca GET: el correo no acaba en la barra, ni en el historial, ni
//     en los logs de acceso del proxy (OWASP ASVS 8.3.1)
//   · respuesta `no-store` y sin dato alguno de la cuenta: solo un booleano
//   · el correo mal formado ni siquiera llega a la base de datos
import { prisma } from "@/shared/db/client";
import { revisarEmail } from "@/shared/validacion/email";

export type ResultadoDisponibilidad =
  | { ok: true; disponible: boolean; email: string }
  | { ok: false; status: number; error: string };

export async function consultarDisponibilidad(datos: unknown): Promise<ResultadoDisponibilidad> {
  const entrada =
    typeof datos === "object" && datos !== null ? (datos as Record<string, unknown>).email : undefined;

  const revision = revisarEmail(entrada);
  if (!revision.ok) return { ok: false, status: 400, error: revision.motivo };

  const cuenta = await prisma.cuenta.findUnique({
    where: { email: revision.email },
    select: { id: true },
  });

  return { ok: true, disponible: cuenta === null, email: revision.email };
}
