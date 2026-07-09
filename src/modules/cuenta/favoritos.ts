// H10–H12: favoritos por cuenta, persistidos en DB (no en el cliente).
import { prisma } from "@/shared/db/client";

export function listarFavoritos(cuentaId: string) {
  return prisma.favorito.findMany({
    where: { cuenta_id: cuentaId },
    orderBy: { creado_en: "desc" },
    include: {
      producto: {
        select: {
          id: true,
          nombre_tono: true,
          slug: true,
          familia_tono: true,
          tipo: true,
          fotos: true,
          activo: true,
          variantes: {
            orderBy: { largo_pulgadas: "asc" },
            select: { largo_pulgadas: true, precio_mxn: true, existencias: true },
          },
        },
      },
    },
  });
}

export type ResultadoAgregarFavorito =
  | { ok: true; favorito: { cuenta_id: string; producto_id: string; creado_en: Date } }
  | { ok: false; status: number; error: string };

// Upsert → agregar dos veces tampoco truena (misma fila, sin duplicado).
export async function agregarFavorito(
  cuentaId: string,
  productoId: string
): Promise<ResultadoAgregarFavorito> {
  const producto = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!producto || !producto.activo) {
    return { ok: false, status: 404, error: "Producto no encontrado" };
  }

  const favorito = await prisma.favorito.upsert({
    where: { cuenta_id_producto_id: { cuenta_id: cuentaId, producto_id: productoId } },
    create: { cuenta_id: cuentaId, producto_id: productoId },
    update: {},
  });
  return { ok: true, favorito };
}

// H11: idempotente — quitar lo ya quitado responde igual, sin error.
export async function quitarFavorito(cuentaId: string, productoId: string) {
  const resultado = await prisma.favorito.deleteMany({
    where: { cuenta_id: cuentaId, producto_id: productoId },
  });
  return { eliminado: resultado.count > 0 };
}
