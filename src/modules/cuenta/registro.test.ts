// Integración H07 contra la DB de test.
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db/client";
import { MENSAJE_EMAIL } from "@/shared/validacion/email";
import { MENSAJE_PASSWORD_CORTA, MENSAJE_PASSWORD_PERSONAL } from "@/shared/validacion/password";
import { CAMPO_TRAMPA } from "@/shared/validacion/schemas";
import { registrarCuenta } from "./registro";

const PREFIJO = "test-registro-";
const email = (sufijo: string) => `${PREFIJO}${sufijo}@example.com`;
const PASSWORD = "bicicleta-verde-77";

afterAll(async () => {
  await prisma.cuenta.deleteMany({ where: { email: { startsWith: PREFIJO } } });
});

describe("registrarCuenta (H07)", () => {
  it("registro ok: crea clienta con hash argon2id y nombre derivado del email", async () => {
    const resultado = await registrarCuenta({ email: email("feliz"), password: PASSWORD });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.cuenta.rol).toBe("clienta");
    expect(resultado.cuenta.nombre).toBe(`${PREFIJO}feliz`);

    const enDb = await prisma.cuenta.findUnique({ where: { email: email("feliz") } });
    expect(enDb?.hash_password.startsWith("$argon2id$")).toBe(true);
    // Parámetros explícitos del OWASP Password Storage Cheat Sheet.
    expect(enDb?.hash_password).toContain("m=65536,t=3,p=4");
  });

  it("guarda el nombre que escribió la clienta cuando lo manda", async () => {
    const resultado = await registrarCuenta({
      email: email("connombre"),
      password: PASSWORD,
      nombre: "Ana Torres",
    });
    expect(resultado.ok && resultado.cuenta.nombre).toBe("Ana Torres");
  });

  it("duplicado: rechaza SIN crear (conteo antes/después idéntico)", async () => {
    await registrarCuenta({ email: email("dup"), password: PASSWORD });
    const antes = await prisma.cuenta.count();

    const resultado = await registrarCuenta({ email: email("dup"), password: "otro-pass-99-x" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(409);
    expect(resultado.error).toBe("Ese correo ya está registrado.");
    expect(resultado.duplicado).toBe(true);
    expect(resultado.campo).toBe("email");

    const despues = await prisma.cuenta.count();
    expect(despues).toBe(antes);
  });

  it("contraseña corta: rechazada con el mensaje del requisito exacto y el campo", async () => {
    const resultado = await registrarCuenta({ email: email("corta"), password: "Corta-12" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(400);
    expect(resultado.error).toBe(MENSAJE_PASSWORD_CORTA);
    expect(resultado.campo).toBe("password");
  });

  it("contraseña con el propio correo dentro: rechazada (OSINT)", async () => {
    const resultado = await registrarCuenta({
      email: email("osint"),
      password: `${PREFIJO}osint-2026`,
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBe(MENSAJE_PASSWORD_PERSONAL);
  });

  it("email con formato inválido: rechazado con mensaje claro", async () => {
    const resultado = await registrarCuenta({ email: "no-es-un-email", password: PASSWORD });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(400);
    expect(resultado.error).toBe(MENSAJE_EMAIL);
    expect(resultado.campo).toBe("email");
  });

  it("campo trampa relleno: no crea cuenta y el error no dice por qué", async () => {
    const antes = await prisma.cuenta.count();
    const resultado = await registrarCuenta({
      email: email("bot"),
      password: PASSWORD,
      [CAMPO_TRAMPA]: "https://spam.example",
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(400);
    expect(resultado.error).not.toContain("trampa");
    expect(await prisma.cuenta.count()).toBe(antes);
  });
});
