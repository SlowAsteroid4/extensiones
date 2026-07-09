// Integración H10–H12 contra la DB de test.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db/client";
import { agregarFavorito, listarFavoritos, quitarFavorito } from "./favoritos";

const EMAIL = "test-favoritos@example.com";
const PRODUCTO = "prod_rub_001";
let cuentaId: string;

beforeAll(async () => {
  const cuenta = await prisma.cuenta.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, nombre: "Fav Test", rol: "clienta", hash_password: "x" },
    update: {},
  });
  cuentaId = cuenta.id;
  await prisma.favorito.deleteMany({ where: { cuenta_id: cuentaId } });
});

afterAll(async () => {
  await prisma.favorito.deleteMany({ where: { cuenta_id: cuentaId } });
  await prisma.cuenta.deleteMany({ where: { email: EMAIL } });
});

describe("favoritos (H10-H12)", () => {
  it("agregar favorito y listarlo con datos del producto", async () => {
    const resultado = await agregarFavorito(cuentaId, PRODUCTO);
    expect(resultado.ok).toBe(true);

    const lista = await listarFavoritos(cuentaId);
    expect(lista).toHaveLength(1);
    expect(lista[0].producto.id).toBe(PRODUCTO);
    expect(lista[0].producto.variantes.length).toBeGreaterThan(0);
  });

  it("agregar dos veces no duplica (PK compuesta + upsert)", async () => {
    await agregarFavorito(cuentaId, PRODUCTO);
    await agregarFavorito(cuentaId, PRODUCTO);
    expect(await listarFavoritos(cuentaId)).toHaveLength(1);
  });

  it("producto inexistente → 404", async () => {
    const resultado = await agregarFavorito(cuentaId, "prod_no_existe");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(404);
  });

  it("quitar favorito es idempotente (H11): quitar dos veces no truena", async () => {
    await agregarFavorito(cuentaId, PRODUCTO);
    const primera = await quitarFavorito(cuentaId, PRODUCTO);
    expect(primera.eliminado).toBe(true);
    const segunda = await quitarFavorito(cuentaId, PRODUCTO);
    expect(segunda.eliminado).toBe(false); // ya no estaba: misma respuesta, sin error
    expect(await listarFavoritos(cuentaId)).toHaveLength(0);
  });

  it("persisten en DB por cuenta_id (H12): visibles en una 'sesión' nueva", async () => {
    await agregarFavorito(cuentaId, PRODUCTO);
    // Nueva lectura independiente (equivale a otra sesión/dispositivo):
    const fila = await prisma.favorito.findUnique({
      where: { cuenta_id_producto_id: { cuenta_id: cuentaId, producto_id: PRODUCTO } },
    });
    expect(fila).not.toBeNull();
    await quitarFavorito(cuentaId, PRODUCTO);
  });
});
