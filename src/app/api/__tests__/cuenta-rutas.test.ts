// Rutas del alta (H07): capa de transporte — rate limit por IP, tope de
// cuerpo y cabeceras sin caché. Cada caso usa su propia IP para no compartir
// la ventana del limitador (vive en memoria del proceso).
import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/shared/db/client";
import { CAMPO_TRAMPA } from "@/shared/validacion/schemas";
import { POST as postRegistro } from "../cuenta/registro/route";
import { POST as postDisponible } from "../cuenta/email-disponible/route";

const PREFIJO = "test-ruta-alta-";
const PASSWORD = "bicicleta-verde-77";

const peticion = (ruta: string, cuerpo: unknown, ip: string) =>
  new NextRequest(`http://localhost:3000${ruta}`, {
    method: "POST",
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });

const alta = (cuerpo: unknown, ip: string) => peticion("/api/cuenta/registro", cuerpo, ip);
const consulta = (cuerpo: unknown, ip: string) =>
  peticion("/api/cuenta/email-disponible", cuerpo, ip);

afterAll(async () => {
  await prisma.cuenta.deleteMany({ where: { email: { startsWith: PREFIJO } } });
});

describe("POST /api/cuenta/registro", () => {
  it("crea la cuenta (201) y responde sin caché ni sniffing", async () => {
    const res = await postRegistro(alta({ email: `${PREFIJO}ok@example.com`, password: PASSWORD }, "10.0.0.1"));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");

    const cuerpo = (await res.json()) as Record<string, unknown>;
    expect(cuerpo.email).toBe(`${PREFIJO}ok@example.com`);
    expect(cuerpo).not.toHaveProperty("hash_password"); // nunca sale el hash
  });

  it("duplicado → 409 con el campo señalado", async () => {
    const cuerpo = { email: `${PREFIJO}dup@example.com`, password: PASSWORD };
    await postRegistro(alta(cuerpo, "10.0.0.2"));
    const res = await postRegistro(alta(cuerpo, "10.0.0.2"));
    expect(res.status).toBe(409);
    const datos = (await res.json()) as { campo: string; duplicado: boolean };
    expect(datos).toMatchObject({ campo: "email", duplicado: true });
  });

  it("cuerpo enorme → 413 sin llegar a la base", async () => {
    const relleno = "x".repeat(9000);
    const res = await postRegistro(
      alta({ email: `${PREFIJO}grande@example.com`, password: PASSWORD, nombre: relleno }, "10.0.0.3")
    );
    expect(res.status).toBe(413);
    expect(await prisma.cuenta.count({ where: { email: `${PREFIJO}grande@example.com` } })).toBe(0);
  });

  it("cuerpo que no es JSON → 400", async () => {
    const res = await postRegistro(alta("{ esto no es json", "10.0.0.4"));
    expect(res.status).toBe(400);
  });

  it("campo trampa relleno → 400 y ninguna cuenta creada", async () => {
    const email = `${PREFIJO}bot@example.com`;
    const res = await postRegistro(alta({ email, password: PASSWORD, [CAMPO_TRAMPA]: "spam" }, "10.0.0.5"));
    expect(res.status).toBe(400);
    expect(await prisma.cuenta.count({ where: { email } })).toBe(0);
  });

  it("6.ª alta desde la misma IP → 429 (ASVS 2.2.1)", async () => {
    const ip = "10.0.0.6";
    for (let intento = 1; intento <= 5; intento++) {
      const res = await postRegistro(alta({ email: `${PREFIJO}masiva${intento}@example.com`, password: PASSWORD }, ip));
      expect(res.status).toBe(201);
    }
    const bloqueada = await postRegistro(alta({ email: `${PREFIJO}masiva6@example.com`, password: PASSWORD }, ip));
    expect(bloqueada.status).toBe(429);
    expect(await prisma.cuenta.count({ where: { email: `${PREFIJO}masiva6@example.com` } })).toBe(0);
  });
});

describe("POST /api/cuenta/email-disponible", () => {
  it("correo libre → { disponible: true } y sin caché", async () => {
    const res = await postDisponible(consulta({ email: `${PREFIJO}nadie@example.com` }, "10.1.0.1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ disponible: true });
  });

  it("correo con cuenta → { disponible: false } y NADA más", async () => {
    const email = `${PREFIJO}existe@example.com`;
    await postRegistro(alta({ email, password: PASSWORD }, "10.1.0.2"));
    const res = await postDisponible(consulta({ email }, "10.1.0.2"));
    expect(await res.json()).toEqual({ disponible: false });
  });

  it("correo inválido → 400 con el motivo", async () => {
    const res = await postDisponible(consulta({ email: "ana@mailinator.com" }, "10.1.0.3"));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain("temporal");
  });

  it("31.ª consulta desde la misma IP → 429 (freno a la enumeración)", async () => {
    const ip = "10.1.0.4";
    for (let intento = 1; intento <= 30; intento++) {
      const res = await postDisponible(consulta({ email: `${PREFIJO}barrido${intento}@example.com` }, ip));
      expect(res.status).toBe(200);
    }
    const bloqueada = await postDisponible(consulta({ email: `${PREFIJO}barrido31@example.com` }, ip));
    expect(bloqueada.status).toBe(429);
  });
});
