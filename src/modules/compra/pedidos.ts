// M-COMPRA: creación de pedidos y transición de estados por webhook.
// Consume catálogo READ-ONLY. Decisiones cerradas 3.D:
//   · stock se VALIDA al crear; se DECREMENTA al confirmarse el pago (transacción)
//   · precios congelados al crear; total SIEMPRE server-side
//   · idempotencia: doble webhook no duplica decremento ni cambia un pedido pagado
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/db/client";
import { generarFolio } from "./folio";
import type { EstadoPagoPasarela, PasarelaProvider } from "./pasarela/provider";

export interface ItemCheckout {
  variante_id: string;
  cantidad: number;
}

export interface DatosCheckout {
  items: ItemCheckout[];
  email_contacto: string;
  telefono_contacto?: string;
  /** Solo desde el token de sesión, nunca del body (H05). */
  cuenta_id?: string;
}

export interface DetalleItemRechazado {
  variante_id: string;
  error: string;
}

export type ResultadoCheckout =
  | {
      ok: true;
      pedido: {
        folio: string;
        total_mxn: number;
        estado: string;
        init_point: string;
      };
    }
  | { ok: false; status: number; error: string; detalles?: DetalleItemRechazado[] };

const MAX_REINTENTOS_FOLIO = 5;

export async function crearPedido(
  datos: DatosCheckout,
  proveedor: PasarelaProvider
): Promise<ResultadoCheckout> {
  // Rechaza variantes repetidas: el carrito del cliente ya las consolida (H04).
  const idsVistos = new Set<string>();
  const repetidos: DetalleItemRechazado[] = [];
  for (const item of datos.items) {
    if (idsVistos.has(item.variante_id)) {
      repetidos.push({ variante_id: item.variante_id, error: "Variante repetida en el carrito" });
    }
    idsVistos.add(item.variante_id);
  }
  if (repetidos.length > 0) {
    return { ok: false, status: 400, error: "Hay items repetidos en el carrito", detalles: repetidos };
  }

  // Validación de stock y disponibilidad POR ITEM (3.D.3 / H04).
  const variantes = await prisma.varianteLargo.findMany({
    where: { id: { in: datos.items.map((i) => i.variante_id) } },
    include: { producto: { select: { activo: true, nombre_tono: true } } },
  });
  const porId = new Map(variantes.map((v) => [v.id, v]));

  const detalles: DetalleItemRechazado[] = [];
  for (const item of datos.items) {
    const variante = porId.get(item.variante_id);
    if (!variante) {
      detalles.push({ variante_id: item.variante_id, error: "La variante no existe" });
    } else if (!variante.producto.activo) {
      detalles.push({ variante_id: item.variante_id, error: "Producto no disponible" });
    } else if (item.cantidad > variante.existencias) {
      detalles.push({
        variante_id: item.variante_id,
        error:
          variante.existencias === 0
            ? "Agotado"
            : `Solo quedan ${variante.existencias} unidades`,
      });
    }
  }
  if (detalles.length > 0) {
    return { ok: false, status: 409, error: "Hay problemas con items del carrito", detalles };
  }

  // Precios congelados + total server-side (3.D.5).
  const items = datos.items.map((item) => {
    const variante = porId.get(item.variante_id)!;
    return {
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      precio_unitario_congelado: variante.precio_mxn,
      titulo: `${variante.producto.nombre_tono} · ${variante.largo_pulgadas}"`,
    };
  });
  const total_mxn = items.reduce((suma, i) => suma + i.cantidad * i.precio_unitario_congelado, 0);

  // Folio único con reintento ante colisión (32^6 combinaciones).
  let pedido = null;
  for (let intento = 0; intento < MAX_REINTENTOS_FOLIO && !pedido; intento++) {
    try {
      pedido = await prisma.pedido.create({
        data: {
          folio: generarFolio(),
          cuenta_id: datos.cuenta_id ?? null,
          email_contacto: datos.email_contacto,
          telefono_contacto: datos.telefono_contacto ?? null,
          total_mxn,
          estado: "pendiente",
          items: {
            create: items.map((item) => ({
              variante_id: item.variante_id,
              cantidad: item.cantidad,
              precio_unitario_congelado: item.precio_unitario_congelado,
            })),
          },
        },
      });
    } catch (error) {
      const colisionFolio =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!colisionFolio || intento === MAX_REINTENTOS_FOLIO - 1) throw error;
    }
  }
  if (!pedido) throw new Error("No se pudo generar un folio único");

  // Preferencia en la pasarela; si falla, el pedido no queda huérfano.
  try {
    const preferencia = await proveedor.crearPreferencia({
      folio: pedido.folio,
      email_comprador: datos.email_contacto,
      items: items.map((i) => ({
        titulo: i.titulo,
        cantidad: i.cantidad,
        precio_unitario_centavos: i.precio_unitario_congelado,
      })),
    });
    pedido = await prisma.pedido.update({
      where: { id: pedido.id },
      data: { pasarela_ref: preferencia.pasarela_ref },
    });
    return {
      ok: true,
      pedido: {
        folio: pedido.folio,
        total_mxn: pedido.total_mxn,
        estado: pedido.estado,
        init_point: preferencia.init_point,
      },
    };
  } catch (error) {
    await prisma.pedidoItem.deleteMany({ where: { pedido_id: pedido.id } });
    await prisma.pedido.delete({ where: { id: pedido.id } });
    console.error(`[pedidos] fallo al crear preferencia (${proveedor.nombre}):`, error);
    return { ok: false, status: 502, error: "No se pudo iniciar el pago, inténtalo de nuevo." };
  }
}

export type ResultadoTransicion =
  | "pagado"
  | "rechazado"
  | "ya_pagado"
  | "ignorado"
  | "no_encontrado";

// Webhook (3.D.3/3.D.4): decremento SOLO en la transición a pagado_sandbox, en la
// misma transacción; el guard `estado != pagado_sandbox` hace la operación
// idempotente ante reintentos y protege un pedido ya pagado.
export async function aplicarResultadoPago(
  folio: string,
  estado: EstadoPagoPasarela,
  pasarelaRef: string
): Promise<ResultadoTransicion> {
  if (estado === "otro") return "ignorado";

  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { folio },
      include: { items: true },
    });
    if (!pedido) return "no_encontrado";

    const transicion = await tx.pedido.updateMany({
      where: { id: pedido.id, estado: { not: "pagado_sandbox" } },
      data: {
        estado: estado === "aprobado" ? "pagado_sandbox" : "rechazado",
        pasarela_ref: pasarelaRef,
      },
    });
    if (transicion.count === 0) return "ya_pagado";

    if (estado === "aprobado") {
      for (const item of pedido.items) {
        await tx.varianteLargo.update({
          where: { id: item.variante_id },
          data: { existencias: { decrement: item.cantidad } },
        });
      }
      return "pagado";
    }
    return "rechazado"; // stock intacto (3.D.3)
  });
}

// H06: consulta pública por folio (solo lectura, sin datos de contacto).
export function obtenerPedidoPorFolio(folio: string) {
  return prisma.pedido.findUnique({
    where: { folio },
    select: {
      folio: true,
      estado: true,
      total_mxn: true,
      creado_en: true,
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
