// M-CAT: lecturas de Producto/VarianteLargo/Categoria/Testimonio (spec §3).
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/db/client";

export interface FiltrosProductos {
  familia?: string;
  tipo?: string;
  largo?: number;
  q?: string;
  /** slug de la categoría */
  categoria?: string;
}

// Función pura (testeable sin DB). H02: AND ESTRICTO — cada filtro activo
// agrega una condición; el resultado cumple todas.
export function construirWhereProductos(filtros: FiltrosProductos): Prisma.ProductoWhereInput {
  const where: Prisma.ProductoWhereInput = { activo: true };
  if (filtros.familia) where.familia_tono = filtros.familia;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.categoria) where.categoria = { slug: filtros.categoria };
  if (filtros.largo !== undefined) {
    where.variantes = { some: { largo_pulgadas: filtros.largo } };
  }
  if (filtros.q) where.nombre_tono = { contains: filtros.q, mode: "insensitive" };
  return where;
}

export function listarCategorias() {
  return prisma.categoria.findMany({ orderBy: { orden: "asc" } });
}

// H01: cada producto expone fotos, tono, largos disponibles y precio.
export function listarProductos(filtros: FiltrosProductos) {
  return prisma.producto.findMany({
    where: construirWhereProductos(filtros),
    orderBy: [{ familia_tono: "asc" }, { nombre_tono: "asc" }],
    select: {
      id: true,
      nombre_tono: true,
      slug: true,
      familia_tono: true,
      tipo: true,
      fotos: true,
      categoria: { select: { id: true, nombre: true, slug: true } },
      variantes: {
        orderBy: { largo_pulgadas: "asc" },
        select: { id: true, largo_pulgadas: true, precio_mxn: true, existencias: true, sku: true },
      },
    },
  });
}

// H02: los filtros solo ofrecen valores EXISTENTES en el catálogo activo.
export async function obtenerFacetas() {
  const [familias, tipos, largos] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      distinct: ["familia_tono"],
      select: { familia_tono: true },
      orderBy: { familia_tono: "asc" },
    }),
    prisma.producto.findMany({
      where: { activo: true },
      distinct: ["tipo"],
      select: { tipo: true },
      orderBy: { tipo: "asc" },
    }),
    prisma.varianteLargo.findMany({
      where: { producto: { activo: true } },
      distinct: ["largo_pulgadas"],
      select: { largo_pulgadas: true },
      orderBy: { largo_pulgadas: "asc" },
    }),
  ]);

  return {
    familias: familias.map((f) => f.familia_tono),
    tipos: tipos.map((t) => t.tipo),
    largos: largos.map((l) => l.largo_pulgadas),
  };
}

// H03: ficha con TODAS sus variantes (agotadas incluidas — nunca se filtran).
// Inactivo o inexistente → null (la ruta lo convierte en 404).
export function obtenerProductoPorSlug(slug: string) {
  return prisma.producto.findFirst({
    where: { slug, activo: true },
    include: {
      categoria: true,
      variantes: { orderBy: { largo_pulgadas: "asc" } },
    },
  });
}

export function listarTestimonios() {
  return prisma.testimonio.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
  });
}
