// Integración a nivel Route Handler (Request→Response reales, DB de test).
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PRODUCTOS_SEED } from "../../../../prisma/seed-data";
import { GET as getProductos } from "../productos/route";
import { GET as getProducto } from "../productos/[slug]/route";
import { GET as getFacetas } from "../productos/facetas/route";
import { GET as getCategorias } from "../categorias/route";
import { GET as getTestimonios } from "../testimonios/route";

const req = (url: string) => new NextRequest(`http://localhost:3000${url}`);

describe("GET /api/productos", () => {
  it("AND estricto con 2 filtros → 200 con total correcto", async () => {
    const esperado = PRODUCTOS_SEED.filter(
      (p) => p.familia_tono === "castaños" && p.tipo === "keratina"
    ).length;
    const res = await getProductos(req("/api/productos?familia=casta%C3%B1os&tipo=keratina"));
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.total).toBe(esperado);
    expect(cuerpo.total).toBeGreaterThan(0);
  });

  it("largo no numérico → 400 con { error }", async () => {
    const res = await getProductos(req("/api/productos?largo=abc"));
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(typeof cuerpo.error).toBe("string");
  });

  it("0 resultados → 200 con lista vacía (no error)", async () => {
    const res = await getProductos(req("/api/productos?familia=negros&q=platino"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total: 0, productos: [] });
  });
});

describe("GET /api/productos/[slug]", () => {
  it("slug existente → 200 con las 3 variantes (agotadas incluidas)", async () => {
    const conAgotada = PRODUCTOS_SEED.find((p) => p.variantes.some((v) => v.existencias === 0))!;
    const res = await getProducto(req(`/api/productos/${conAgotada.slug}`), {
      params: Promise.resolve({ slug: conAgotada.slug }),
    });
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.variantes).toHaveLength(3);
    expect(cuerpo.variantes.some((v: { existencias: number }) => v.existencias === 0)).toBe(true);
  });

  it("slug inexistente → 404 con { error }", async () => {
    const res = await getProducto(req("/api/productos/no-existe-000"), {
      params: Promise.resolve({ slug: "no-existe-000" }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Producto no encontrado");
  });
});

describe("GET /api/productos/facetas · /api/categorias · /api/testimonios", () => {
  it("facetas → 200 con familias/tipos/largos", async () => {
    const res = await getFacetas();
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.familias).toHaveLength(5);
    expect(cuerpo.largos).toEqual([18, 20, 22, 24]);
  });

  it("categorias → 200 ordenadas", async () => {
    const res = await getCategorias();
    expect(res.status).toBe(200);
    expect((await res.json()).length).toBeGreaterThanOrEqual(3);
  });

  it("testimonios → 200 con 6 activos", async () => {
    const res = await getTestimonios();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(6);
  });
});
