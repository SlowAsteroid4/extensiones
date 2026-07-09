// Test de integridad del seed (convención T3): cuenta sobre el dataset fuente,
// el mismo que insertan los upserts — la evidencia de la base viva va aparte
// (query de conteos en el handoff).
import { describe, expect, it } from "vitest";
import { FAMILIAS_TONO, LARGOS_DISPONIBLES } from "../src/shared/validacion/familias";
import { CATEGORIAS_SEED, PRODUCTOS_SEED, TESTIMONIOS_SEED } from "./seed-data";

describe("integridad del seed", () => {
  it("tiene al menos 70 productos", () => {
    expect(PRODUCTOS_SEED.length).toBeGreaterThanOrEqual(70);
  });

  it("cubre exactamente las 5 familias de tono del piloto", () => {
    const familias = new Set(PRODUCTOS_SEED.map((p) => p.familia_tono));
    expect(familias.size).toBe(5);
    expect([...familias].sort()).toEqual([...FAMILIAS_TONO].sort());
  });

  it("cada producto tiene exactamente 3 variantes con largos distintos de {18, 20, 22, 24}", () => {
    for (const producto of PRODUCTOS_SEED) {
      expect(producto.variantes).toHaveLength(3);
      const largos = producto.variantes.map((v) => v.largo_pulgadas);
      expect(new Set(largos).size).toBe(3);
      for (const largo of largos) {
        expect(LARGOS_DISPONIBLES).toContain(largo);
      }
    }
  });

  it("todos los slugs de producto son únicos y con formato kebab-case (T4)", () => {
    const slugs = PRODUCTOS_SEED.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("todos los precios están entre $1,990 y $3,490 MXN (en centavos)", () => {
    const precios = PRODUCTOS_SEED.flatMap((p) => p.variantes.map((v) => v.precio_mxn));
    for (const precio of precios) {
      expect(precio).toBeGreaterThanOrEqual(199000);
      expect(precio).toBeLessThanOrEqual(349000);
      expect(Number.isInteger(precio)).toBe(true);
    }
  });

  it("las existencias están entre 0 y 15 e incluyen variantes agotadas (0)", () => {
    const existencias = PRODUCTOS_SEED.flatMap((p) => p.variantes.map((v) => v.existencias));
    for (const cantidad of existencias) {
      expect(cantidad).toBeGreaterThanOrEqual(0);
      expect(cantidad).toBeLessThanOrEqual(15);
    }
    expect(existencias.filter((cantidad) => cantidad === 0).length).toBeGreaterThan(0);
  });

  it("ids de producto, ids de variante y SKUs son únicos", () => {
    const idsProducto = PRODUCTOS_SEED.map((p) => p.id);
    const idsVariante = PRODUCTOS_SEED.flatMap((p) => p.variantes.map((v) => v.id));
    const skus = PRODUCTOS_SEED.flatMap((p) => p.variantes.map((v) => v.sku));
    expect(new Set(idsProducto).size).toBe(idsProducto.length);
    expect(new Set(idsVariante).size).toBe(idsVariante.length);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("toda categoria_id de producto existe en las categorías del seed", () => {
    const idsCategoria = new Set(CATEGORIAS_SEED.map((c) => c.id));
    for (const producto of PRODUCTOS_SEED) {
      expect(idsCategoria.has(producto.categoria_id)).toBe(true);
    }
  });

  it("hay exactamente 6 testimonios con orden único", () => {
    expect(TESTIMONIOS_SEED).toHaveLength(6);
    const ordenes = new Set(TESTIMONIOS_SEED.map((t) => t.orden));
    expect(ordenes.size).toBe(6);
  });
});
