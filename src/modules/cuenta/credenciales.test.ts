// Integración H08: verificación de credenciales (lo que corre dentro del
// authorize de Auth.js). Cualquier fallo → null, sin decir qué campo falló.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import argon2 from "argon2";
import { prisma } from "@/shared/db/client";
import { verificarCredenciales } from "./credenciales";

const EMAIL = "test-credenciales@example.com";
const PASSWORD = "clave-correcta-123";

beforeAll(async () => {
  await prisma.cuenta.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      nombre: "Cuenta de Prueba",
      rol: "clienta",
      hash_password: await argon2.hash(PASSWORD),
    },
    update: { hash_password: await argon2.hash(PASSWORD) },
  });
});

afterAll(async () => {
  await prisma.cuenta.deleteMany({ where: { email: EMAIL } });
});

describe("verificarCredenciales (H08)", () => {
  it("credenciales correctas → usuario con id y rol", async () => {
    const usuario = await verificarCredenciales({ email: EMAIL, password: PASSWORD });
    expect(usuario).not.toBeNull();
    expect(usuario!.email).toBe(EMAIL);
    expect(usuario!.rol).toBe("clienta");
    expect(usuario!.id).toBeTruthy();
  });

  it("contraseña incorrecta → null (mismo resultado que email inexistente)", async () => {
    expect(await verificarCredenciales({ email: EMAIL, password: "incorrecta" })).toBeNull();
  });

  it("email inexistente → null", async () => {
    expect(
      await verificarCredenciales({ email: "nadie@example.com", password: PASSWORD })
    ).toBeNull();
  });

  it("entrada malformada → null, no excepción", async () => {
    expect(await verificarCredenciales({ email: "no-email", password: "" })).toBeNull();
    expect(await verificarCredenciales(undefined)).toBeNull();
  });
});
