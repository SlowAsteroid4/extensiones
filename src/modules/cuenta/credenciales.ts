// H08: verificación de credenciales para el authorize de Auth.js.
// Devuelve null ante CUALQUIER fallo (email inexistente o contraseña mala):
// el error hacia fuera es genérico y no revela qué campo falló.
import argon2 from "argon2";
import { prisma } from "@/shared/db/client";
import { credencialesSchema } from "@/shared/validacion/schemas";

export interface UsuarioVerificado {
  id: string;
  email: string;
  name: string;
  rol: "clienta" | "admin";
}

export async function verificarCredenciales(datos: unknown): Promise<UsuarioVerificado | null> {
  const parseado = credencialesSchema.safeParse(datos);
  if (!parseado.success) return null;

  const cuenta = await prisma.cuenta.findUnique({ where: { email: parseado.data.email } });
  if (!cuenta) return null;

  const valida = await argon2.verify(cuenta.hash_password, parseado.data.password);
  if (!valida) return null;

  return { id: cuenta.id, email: cuenta.email, name: cuenta.nombre, rol: cuenta.rol };
}
