// H07: registro con email + contraseña. Duplicado → aviso sin crear y sin
// revelar nada más que el hecho (decisión reportada en el handoff T4).
import argon2 from "argon2";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/db/client";
import { registroSchema } from "@/shared/validacion/schemas";

const MENSAJE_DUPLICADO = "Ese correo ya está registrado.";

export type ResultadoRegistro =
  | { ok: true; cuenta: { id: string; email: string; nombre: string; rol: string } }
  | { ok: false; status: number; error: string };

export async function registrarCuenta(datos: unknown): Promise<ResultadoRegistro> {
  const parseado = registroSchema.safeParse(datos);
  if (!parseado.success) {
    return {
      ok: false,
      status: 400,
      error: parseado.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const { email, password } = parseado.data;
  const nombre = parseado.data.nombre ?? email.split("@")[0];

  const existente = await prisma.cuenta.findUnique({ where: { email } });
  if (existente) {
    return { ok: false, status: 409, error: MENSAJE_DUPLICADO };
  }

  try {
    const cuenta = await prisma.cuenta.create({
      data: {
        email,
        nombre,
        rol: "clienta",
        hash_password: await argon2.hash(password),
      },
    });
    return {
      ok: true,
      cuenta: { id: cuenta.id, email: cuenta.email, nombre: cuenta.nombre, rol: cuenta.rol },
    };
  } catch (error) {
    // Carrera contra el unique de email: mismo aviso, sin duplicado.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, status: 409, error: MENSAJE_DUPLICADO };
    }
    throw error;
  }
}
