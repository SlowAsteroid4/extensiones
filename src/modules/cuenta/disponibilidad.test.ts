// Integración H07 · comprobación de correo en vivo, contra la DB de test.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db/client";
import { MENSAJE_EMAIL_DESECHABLE } from "@/shared/validacion/email";
import { consultarDisponibilidad } from "./disponibilidad";
import { registrarCuenta } from "./registro";

const PREFIJO = "test-dispo-";
const OCUPADO = `${PREFIJO}ocupado@example.com`;

beforeAll(async () => {
  await registrarCuenta({ email: OCUPADO, password: "bicicleta-verde-77" });
});

afterAll(async () => {
  await prisma.cuenta.deleteMany({ where: { email: { startsWith: PREFIJO } } });
});

describe("consultarDisponibilidad (H07)", () => {
  it("correo libre → disponible", async () => {
    const resultado = await consultarDisponibilidad({ email: `${PREFIJO}libre@example.com` });
    expect(resultado).toEqual({ ok: true, disponible: true, email: `${PREFIJO}libre@example.com` });
  });

  it("correo con cuenta → no disponible (mayúsculas incluidas)", async () => {
    const resultado = await consultarDisponibilidad({ email: OCUPADO.toUpperCase() });
    expect(resultado.ok && resultado.disponible).toBe(false);
  });

  it("correo mal formado → 400 sin tocar la base", async () => {
    const resultado = await consultarDisponibilidad({ email: "no-es-email" });
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.status).toBe(400);
  });

  it("correo desechable → 400 con el motivo, antes de consultar", async () => {
    const resultado = await consultarDisponibilidad({ email: "ana@mailinator.com" });
    expect(!resultado.ok && resultado.error).toBe(MENSAJE_EMAIL_DESECHABLE);
  });

  it("cuerpo sin email → 400", async () => {
    expect((await consultarDisponibilidad({})).ok).toBe(false);
    expect((await consultarDisponibilidad(null)).ok).toBe(false);
  });

  it("nunca devuelve datos de la cuenta, solo el booleano", async () => {
    const resultado = await consultarDisponibilidad({ email: OCUPADO });
    expect(Object.keys(resultado).sort()).toEqual(["disponible", "email", "ok"]);
  });
});
