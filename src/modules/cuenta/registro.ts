// H07: registro con email + contraseña. Duplicado → aviso sin crear y sin
// revelar nada más que el hecho (decisión reportada en el handoff T4).
//
// Controles OWASP que se aplican aquí (los de transporte —rate limit, tamaño
// del cuerpo, cabeceras— viven en la ruta):
//   · ASVS 2.1  política de contraseña en `@/shared/validacion/password`
//   · ASVS 2.1.7 contraste opcional contra filtraciones públicas (HIBP)
//   · ASVS 2.4.1 argon2id con parámetros explícitos (no los de la librería:
//                un cambio de default no puede debilitar el hash sin querer)
//   · ASVS 5.1  el campo trampa corta el alta automatizada sin CAPTCHA
import argon2 from "argon2";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/db/client";
import { passwordFiltrada } from "@/shared/seguridad/passwords-filtradas";
import { MENSAJE_PASSWORD_FILTRADA } from "@/shared/validacion/password";
import { CAMPO_TRAMPA, registroSchema } from "@/shared/validacion/schemas";

const MENSAJE_DUPLICADO = "Ese correo ya está registrado.";
const MENSAJE_GENERICO = "No pudimos crear tu cuenta. Inténtalo otra vez.";

// OWASP Password Storage Cheat Sheet: argon2id, ≥19 MiB, ≥2 pasadas. Se fijan
// los valores (64 MiB · 3 pasadas · 4 hilos) en vez de heredar los de la lib.
const OPCIONES_ARGON2 = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

export type CampoRegistro = "email" | "password" | "nombre" | "general";

export type ResultadoRegistro =
  | { ok: true; cuenta: { id: string; email: string; nombre: string; rol: string } }
  | { ok: false; status: number; error: string; campo: CampoRegistro; duplicado?: boolean };

function cayoEnLaTrampa(datos: unknown): boolean {
  if (typeof datos !== "object" || datos === null) return false;
  const valor = (datos as Record<string, unknown>)[CAMPO_TRAMPA];
  return typeof valor === "string" && valor.trim() !== "";
}

export async function registrarCuenta(datos: unknown): Promise<ResultadoRegistro> {
  // Antes de cualquier trabajo caro: si el campo trampa viene lleno, el alta
  // no es de una persona. Error genérico, sin pista de por qué falló.
  if (cayoEnLaTrampa(datos)) {
    return { ok: false, status: 400, error: MENSAJE_GENERICO, campo: "general" };
  }

  const parseado = registroSchema.safeParse(datos);
  if (!parseado.success) {
    const problema = parseado.error.issues[0];
    const campo = problema?.path[0];
    return {
      ok: false,
      status: 400,
      error: problema?.message ?? "Datos inválidos",
      campo: campo === "email" || campo === "password" || campo === "nombre" ? campo : "general",
    };
  }

  const { email, password } = parseado.data;
  const nombre = parseado.data.nombre ?? email.split("@")[0];

  if (await passwordFiltrada(password)) {
    return { ok: false, status: 400, error: MENSAJE_PASSWORD_FILTRADA, campo: "password" };
  }

  const existente = await prisma.cuenta.findUnique({ where: { email }, select: { id: true } });
  if (existente) {
    return { ok: false, status: 409, error: MENSAJE_DUPLICADO, campo: "email", duplicado: true };
  }

  try {
    const cuenta = await prisma.cuenta.create({
      data: {
        email,
        nombre,
        rol: "clienta",
        hash_password: await argon2.hash(password, OPCIONES_ARGON2),
      },
    });
    return {
      ok: true,
      cuenta: { id: cuenta.id, email: cuenta.email, nombre: cuenta.nombre, rol: cuenta.rol },
    };
  } catch (error) {
    // Carrera contra el unique de email: mismo aviso, sin duplicado.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, status: 409, error: MENSAJE_DUPLICADO, campo: "email", duplicado: true };
    }
    throw error;
  }
}
