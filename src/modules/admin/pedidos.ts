// T9 · Bitácora de ventas del panel. A diferencia de la consulta pública por
// folio (H06, sin datos de contacto), el detalle admin SÍ expone email y
// teléfono: la clienta coordina la entrega por WhatsApp.
import { prisma } from "@/shared/db/client";
import type { EstadoPedido } from "@/generated/prisma/client";

export const POR_PAGINA_DEFAULT = 20;
export const POR_PAGINA_MAX = 50;

export interface FiltrosPedidosAdmin {
  estado?: EstadoPedido;
  pagina?: number;
  por_pagina?: number;
}

export async function listarPedidosAdmin(filtros: FiltrosPedidosAdmin = {}) {
  const porPagina = Math.min(filtros.por_pagina ?? POR_PAGINA_DEFAULT, POR_PAGINA_MAX);
  const pagina = Math.max(filtros.pagina ?? 1, 1);
  const where = filtros.estado ? { estado: filtros.estado } : {};

  const [total, pedidos] = await prisma.$transaction([
    prisma.pedido.count({ where }),
    prisma.pedido.findMany({
      where,
      orderBy: { creado_en: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        folio: true,
        creado_en: true,
        total_mxn: true,
        estado: true,
        items: { select: { cantidad: true } },
      },
    }),
  ]);

  return {
    total,
    pagina,
    por_pagina: porPagina,
    pedidos: pedidos.map((p) => ({
      folio: p.folio,
      creado_en: p.creado_en,
      total_mxn: p.total_mxn,
      estado: p.estado,
      piezas: p.items.reduce((suma, i) => suma + i.cantidad, 0),
    })),
  };
}

export function obtenerPedidoAdminPorFolio(folio: string) {
  return prisma.pedido.findUnique({
    where: { folio },
    select: {
      folio: true,
      estado: true,
      total_mxn: true,
      creado_en: true,
      email_contacto: true,
      telefono_contacto: true,
      cuenta: { select: { nombre: true } },
      items: {
        select: {
          cantidad: true,
          precio_unitario_congelado: true,
          variante: {
            select: {
              id: true,
              largo_pulgadas: true,
              sku: true,
              producto: { select: { nombre_tono: true, slug: true, fotos: true } },
            },
          },
        },
      },
    },
  });
}
