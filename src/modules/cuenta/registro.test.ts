// Integración H07 contra la DB de test.
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db/client";
import { MENSAJE_EMAIL, MENSAJE_PASSWORD } from "@/shared/validacion/schemas";
import { registrarCuenta } from "./registro";

const PREFIJO = "test-registro-";
const email = (sufijo: string) => `${PREFIJO}${sufijo}@example.com`;

afterAll(async () => {
  await prisma.cuenta.deleteMany({ where: { email: { startsWith: PREFIJO } } });
});

describe("registrarCuenta (H07)", () => {
  it("registro ok: crea clienta con hash argon2id y nombre derivado del email", async () => {
    const resultado = await registrarCuenta({ email: email("feliz"), password: "12345678" });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.cuenta.rol).toBe("clienta");
    expect(resultado.cuenta.nombre).toBe(`${PREFIJO}feliz`);

    const enDb = await prisma.cuenta.findUnique({ where: { email: email("feliz") } });
    expect(enDb?.hash_password.startsWith("$argon2id$")).toBe(true);
  });

  it("duplicado: rechaza SIN crear (conteo antes/después idéntico)", async () => {
    await registrarCuenta({ email: email("dup"), password: "12345678" });
    const antes = await prisma.cuenta.count();

    const resultado = await registrarCuenta({ email: email("dup"), password: "otroPass99" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(409);
    expect(resultado.error).toBe("Ese correo ya está registrado.");

    const despues = await prisma.cuenta.count();
    expect(despues).toBe(antes);
  });

  it("contraseña <8: rechazada con el mensaje del requisito exacto", async () => {
    const resultado = await registrarCuenta({ email: email("corta"), password: "1234567" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(400);
    expect(resultado.error).toBe(MENSAJE_PASSWORD);
  });

  it("email con formato inválido: rechazado con mensaje claro", async () => {
    const resultado = await registrarCuenta({ email: "no-es-un-email", password: "12345678" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(400);
    expect(resultado.error).toBe(MENSAJE_EMAIL);
  });
});
