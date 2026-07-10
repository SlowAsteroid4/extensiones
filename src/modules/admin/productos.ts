// M-ADMIN · H15/H16/H17/H19: CRUD de productos y variantes.
import type { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/db/client";
import { slugificar } from "@/shared/texto/slug";
import type {
  productoCrearSchema,
  productoEditarSchema,
  varianteRapidaSchema,
} from "@/shared/validacion/schemas";
import { generarFolio } from "@/modules/compra/folio";

// Sufijo aleatorio corto para ids/slug/sku de productos creados en el panel
// (reusa el alfabeto sin ambiguos del folio).
function sufijoAleatorio(): string {
  return generarFolio().slice(3).toLowerCase();
}

export function listarProductosAdmin(q?: string) {
  return prisma.producto.findMany({
    where: q ? { nombre_tono: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: [{ familia_tono: "asc" }, { nombre_tono: "asc" }],
    include: {
      categoria: { select: { id: true, nombre: true, slug: true } },
      variantes: { orderBy: { largo_pulgadas: "asc" } },
    },
  });
}

export type DatosProductoCrear = z.infer<typeof productoCrearSchema>;

export async function crearProducto(datos: DatosProductoCrear) {
  const categoria = await prisma.categoria.findUnique({ where: { id: datos.categoria_id } });
  if (!categoria) {
    return { ok: false as const, status: 400, error: "La categoría no existe" };
  }

  const sufijo = sufijoAleatorio();
  const id = `prod_adm_${sufijo}`;
  const { variantes, ...base } = datos;

  const producto = await prisma.producto.create({
    data: {
      id,
      ...base,
      slug: `${slugificar(base.nombre_tono)}-${sufijo}`,
      variantes: {
        create: variantes.map((v, indice) => ({
          ...v,
          sku: v.sku ?? `ADM-${sufijo.toUpperCase()}-${v.largo_pulgadas}-${indice + 1}`,
        })),
      },
    },
    include: { variantes: { orderBy: { largo_pulgadas: "asc" } } },
  });
  return { ok: true as const, producto };
}

export type DatosProductoEditar = z.infer<typeof productoEditarSchema>;

export async function editarProducto(id: string, datos: DatosProductoEditar) {
  const existente = await prisma.producto.findUnique({ where: { id } });
  if (!existente) return { ok: false as const, status: 404, error: "Producto no encontrado" };

  const { variantes, ...base } = datos;
  try {
    const producto = await prisma.$transaction(async (tx) => {
      if (variantes?.eliminar?.length) {
        await tx.varianteLargo.deleteMany({
          where: { id: { in: variantes.eliminar }, producto_id: id },
        });
      }
      if (variantes?.actualizar?.length) {
        for (const { id: varianteId, ...cambios } of variantes.actualizar) {
          await tx.varianteLargo.update({
            where: { id: varianteId, producto_id: id },
            data: cambios,
          });
        }
      }
      if (variantes?.crear?.length) {
        const sufijo = sufijoAleatorio().toUpperCase();
        await tx.varianteLargo.createMany({
          data: variantes.crear.map((v, indice) => ({
            ...v,
            producto_id: id,
            sku: v.sku ?? `ADM-${sufijo}-${v.largo_pulgadas}-${indice + 1}`,
          })),
        });
      }
      return tx.producto.update({
        where: { id },
        data: base,
        include: { variantes: { orderBy: { largo_pulgadas: "asc" } } },
      });
    });
    return { ok: true as const, producto };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003: la variante tiene pedidos (FK) — no se borra historia de compra.
      if (error.code === "P2003") {
        return {
          ok: false as const,
          status: 409,
          error: "La variante tiene pedidos asociados; pon existencias en 0 en lugar de eliminarla.",
        };
      }
      // P2025: variante a actualizar no existe o no es de este producto.
      if (error.code === "P2025") {
        return { ok: false as const, status: 404, error: "Variante no encontrada en este producto" };
      }
    }
    throw error;
  }
}

export type DatosVarianteRapida = z.infer<typeof varianteRapidaSchema>;

// H17: existencias/precio rápido. La validación zod ocurre ANTES de llegar aquí,
// así que un valor inválido jamás sobreescribe.
export async function actualizarVariante(id: string, datos: DatosVarianteRapida) {
  try {
    const variante = await prisma.varianteLargo.update({ where: { id }, data: datos });
    return { ok: true as const, variante };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false as const, status: 404, error: "Variante no encontrada" };
    }
    throw error;
  }
}
