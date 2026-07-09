// Unit: construirWhereProductos (función pura).
// Integración: consultas contra la base de test seedeada (extensiones_test);
// los conteos esperados se calculan del MISMO dataset que se seedea.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTOS_SEED } from "../../../prisma/seed-data";
import { prisma } from "@/shared/db/client";
import {
  construirWhereProductos,
  listarCategorias,
  listarProductos,
  listarTestimonios,
  obtenerFacetas,
  obtenerProductoPorSlug,
} from "./consultas";

describe("construirWhereProductos (unit, H02 AND estricto)", () => {
  it("sin filtros: solo activo=true", () => {
    expect(construirWhereProductos({})).toEqual({ activo: true });
  });

  it("2 filtros → 2 condiciones además de activo", () => {
    expect(construirWhereProductos({ familia: "rubios", tipo: "clip" })).toEqual({
      activo: true,
      familia_tono: "rubios",
      tipo: "clip",
    });
  });

  it("3 filtros + búsqueda + categoría → todas las condiciones presentes", () => {
    expect(
      construirWhereProductos({
        familia: "rubios",
        tipo: "clip",
        largo: 20,
        q: "miel",
        categoria: "extensiones-de-clip",
      })
    ).toEqual({
      activo: true,
      familia_tono: "rubios",
      tipo: "clip",
      categoria: { slug: "extensiones-de-clip" },
      variantes: { some: { largo_pulgadas: 20 } },
      nombre_tono: { contains: "miel", mode: "insensitive" },
    });
  });
});

describe("catálogo (integración con DB de test)", () => {
  it("listarCategorias: ordenadas por orden", async () => {
    const categorias = await listarCategorias();
    expect(categorias.length).toBeGreaterThanOrEqual(3);
    const ordenes = categorias.map((c) => c.orden);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
  });

  it("filtro AND con 2 filtros: familia+tipo, conteo igual al dataset", async () => {
    const esperado = PRODUCTOS_SEED.filter(
      (p) => p.familia_tono === "rubios" && p.tipo === "clip"
    ).length;
    const productos = await listarProductos({ familia: "rubios", tipo: "clip" });
    expect(productos.length).toBe(esperado);
    expect(productos.length).toBeGreaterThan(0);
    for (const p of productos) {
      expect(p.familia_tono).toBe("rubios");
      expect(p.tipo).toBe("clip");
    }
  });

  it("filtro AND con 3 filtros: familia+tipo+largo, cada resultado cumple TODOS", async () => {
    const esperado = PRODUCTOS_SEED.filter(
      (p) =>
        p.familia_tono === "rubios" &&
        p.tipo === "clip" &&
        p.variantes.some((v) => v.largo_pulgadas === 20)
    ).length;
    const productos = await listarProductos({ familia: "rubios", tipo: "clip", largo: 20 });
    expect(productos.length).toBe(esperado);
    for (const p of productos) {
      expect(p.familia_tono).toBe("rubios");
      expect(p.tipo).toBe("clip");
      expect(p.variantes.some((v) => v.largo_pulgadas === 20)).toBe(true);
    }
  });

  it("búsqueda por nombre de tono (case-insensitive), conteo igual al dataset", async () => {
    const esperado = PRODUCTOS_SEED.filter((p) =>
      p.nombre_tono.toLowerCase().includes("miel")
    ).length;
    const productos = await listarProductos({ q: "MIEL" });
    expect(productos.length).toBe(esperado);
    expect(productos.length).toBeGreaterThan(0);
  });

  it("combinación sin resultados → lista vacía, no error (H02)", async () => {
    const productos = await listarProductos({ familia: "negros", q: "platino" });
    expect(productos).toEqual([]);
  });

  it("facetas: exactamente los valores existentes en el catálogo activo", async () => {
    const familiasDataset = [...new Set(PRODUCTOS_SEED.map((p) => p.familia_tono))].sort();
    const tiposDataset = [...new Set(PRODUCTOS_SEED.map((p) => p.tipo))].sort();
    const largosDataset = [
      ...new Set(PRODUCTOS_SEED.flatMap((p) => p.variantes.map((v) => v.largo_pulgadas))),
    ].sort((a, b) => a - b);

    const facetas = await obtenerFacetas();
    expect([...facetas.familias].sort()).toEqual(familiasDataset);
    expect([...facetas.tipos].sort()).toEqual(tiposDataset);
    expect(facetas.largos).toEqual(largosDataset);
  });

  it("ficha por slug: incluye TODAS las variantes, agotadas marcadas (H03)", async () => {
    // prod_rub_001 tiene una variante con existencias 0 por construcción del seed.
    const conAgotada = PRODUCTOS_SEED.find((p) => p.variantes.some((v) => v.existencias === 0));
    expect(conAgotada).toBeDefined();

    const producto = await obtenerProductoPorSlug(conAgotada!.slug);
    expect(producto).not.toBeNull();
    expect(producto!.variantes).toHaveLength(3);
    expect(producto!.variantes.some((v) => v.existencias === 0)).toBe(true);
  });

  it("testimonios: solo activos, ordenados por orden", async () => {
    const testimonios = await listarTestimonios();
    expect(testimonios).toHaveLength(6);
    expect(testimonios.every((t) => t.activo)).toBe(true);
    expect(testimonios.map((t) => t.orden)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("producto inactivo (integración, H03)", () => {
  const ID_INACTIVO = "prod_test_inactivo";

  beforeAll(async () => {
    await prisma.producto.upsert({
      where: { id: ID_INACTIVO },
      create: {
        id: ID_INACTIVO,
        nombre_tono: "Tono de Prueba Inactivo",
        slug: "tono-de-prueba-inactivo-test",
        familia_tono: "rubios",
        tipo: "clip",
        descripcion: "Solo para el test de inactivo → 404.",
        fotos: [],
        categoria_id: "cat_clip",
        activo: false,
      },
      update: { activo: false },
    });
  });

  afterAll(async () => {
    await prisma.producto.deleteMany({ where: { id: ID_INACTIVO } });
  });

  it("obtenerProductoPorSlug devuelve null para producto inactivo", async () => {
    expect(await obtenerProductoPorSlug("tono-de-prueba-inactivo-test")).toBeNull();
  });

  it("el producto inactivo NO aparece en el listado", async () => {
    const productos = await listarProductos({ q: "Tono de Prueba Inactivo" });
    expect(productos).toEqual([]);
  });
});
