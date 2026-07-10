// Integración a nivel Route Handler del ciclo completo de compra (Fase A):
// checkout → webhook firmado (secreto de fixture) → estados y stock.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/auth/config", () => ({ auth: vi.fn() }));

import { auth } from "@/shared/auth/config";
import { prisma } from "@/shared/db/client";
import { construirManifiesto, firmarManifiesto } from "@/modules/compra/pasarela/firma";
import { POST as postPedido } from "../pedidos/route";
import { GET as getPedido } from "../pedidos/[folio]/route";
import { POST as postWebhook } from "../webhooks/mercadopago/route";

const authMock = vi.mocked(auth as unknown as () => Promise<unknown>);
const EMAIL = "test-ruta-compra@example.com";
const PROD = "prod_test_ruta_compra";
const VAR = "var_test_ruta_compra";

async function limpiar() {
  await prisma.pedidoItem.deleteMany({ where: { pedido: { email_contacto: EMAIL } } });
  await prisma.pedido.deleteMany({ where: { email_contacto: EMAIL } });
  await prisma.varianteLargo.deleteMany({ where: { id: VAR } });
  await prisma.producto.deleteMany({ where: { id: PROD } });
}

beforeAll(async () => {
  await limpiar();
  await prisma.producto.create({
    data: {
      id: PROD,
      nombre_tono: "Tono Ruta Compra",
      slug: "tono-ruta-compra-test",
      familia_tono: "negros",
      tipo: "clip",
      descripcion: "Producto para tests de ruta de compra.",
      fotos: [],
      categoria_id: "cat_clip",
      activo: true,
      variantes: {
        create: [
          { id: VAR, largo_pulgadas: 20, precio_mxn: 199000, existencias: 8, sku: "TST-RUTA-20" },
        ],
      },
    },
  });
  authMock.mockResolvedValue(null); // invitada por defecto
});

afterAll(limpiar);

function requestPedido(cuerpo: unknown) {
  return new Request("http://localhost:3000/api/pedidos", {
    method: "POST",
    body: JSON.stringify(cuerpo),
    headers: { "content-type": "application/json" },
  });
}

// Request de webhook firmado EXACTAMENTE como lo firmaría MP (HMAC-SHA256 del
// manifest con el secreto de env — fixture en la suite).
function requestWebhook(dataId: string, opciones?: { firmaRota?: boolean }) {
  const ts = String(Math.floor(Date.now() / 1000));
  const requestId = `req-test-${Math.random().toString(36).slice(2)}`;
  let v1 = firmarManifiesto(
    construirManifiesto(dataId, requestId, ts),
    process.env.MERCADOPAGO_WEBHOOK_SECRET!
  );
  if (opciones?.firmaRota) {
    v1 = v1.slice(0, -4) + (v1.endsWith("aaaa") ? "bbbb" : "aaaa");
  }
  const url = `http://localhost:3000/api/webhooks/mercadopago?type=payment&data.id=${encodeURIComponent(dataId)}`;
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify({ type: "payment", data: { id: dataId } }),
    headers: {
      "content-type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    },
  });
}

async function stockActual(): Promise<number> {
  return (await prisma.varianteLargo.findUniqueOrThrow({ where: { id: VAR } })).existencias;
}

async function crearPedidoPorRuta(cantidad: number): Promise<{ folio: string; init_point: string }> {
  const res = await postPedido(
    requestPedido({ items: [{ variante_id: VAR, cantidad }], email_contacto: EMAIL })
  );
  expect(res.status).toBe(201);
  return res.json();
}

describe("POST /api/pedidos (H04/H05)", () => {
  it("checkout invitada → 201 con folio, total server-side e init_point", async () => {
    const pedido = await crearPedidoPorRuta(2);
    expect(pedido.folio).toMatch(/^LS-[A-HJ-NP-Z2-9]{6}$/);
    expect(pedido).toMatchObject({ total_mxn: 398000, estado: "pendiente" });
    // Delta autorizado (encargo 10): init_point fake → confirmación local.
    expect(pedido.init_point).toContain(`/pedido/${pedido.folio}?pago=simulado`);
  });

  it("cantidad > stock → 409 con detalle por item", async () => {
    const res = await postPedido(
      requestPedido({ items: [{ variante_id: VAR, cantidad: 99 }], email_contacto: EMAIL })
    );
    expect(res.status).toBe(409);
    const cuerpo = await res.json();
    expect(cuerpo.detalles).toEqual([{ variante_id: VAR, error: "Solo quedan 8 unidades" }]);
  });

  it("body inválido (cantidad 0, carrito vacío, email malo) → 400", async () => {
    const casos = [
      { items: [{ variante_id: VAR, cantidad: 0 }], email_contacto: EMAIL },
      { items: [], email_contacto: EMAIL },
      { items: [{ variante_id: VAR, cantidad: 1 }], email_contacto: "no-email" },
    ];
    for (const caso of casos) {
      expect((await postPedido(requestPedido(caso))).status).toBe(400);
    }
  });
});

describe("POST /api/webhooks/mercadopago (3.D.3/3.D.4, spec §7)", () => {
  it("firma VÁLIDA + pago aprobado → pagado_sandbox y stock decrementado", async () => {
    const { folio } = await crearPedidoPorRuta(2);
    const antes = await stockActual();

    const res = await postWebhook(requestWebhook(`fake-pago-aprobado-${folio}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ procesado: true, resultado: "pagado" });

    expect((await prisma.pedido.findUnique({ where: { folio } }))?.estado).toBe("pagado_sandbox");
    expect(await stockActual()).toBe(antes - 2);
  });

  it("firma INVÁLIDA → 401 sin efectos (estado y stock intactos)", async () => {
    const { folio } = await crearPedidoPorRuta(1);
    const antes = await stockActual();

    const res = await postWebhook(
      requestWebhook(`fake-pago-aprobado-${folio}`, { firmaRota: true })
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Firma inválida" });

    expect((await prisma.pedido.findUnique({ where: { folio } }))?.estado).toBe("pendiente");
    expect(await stockActual()).toBe(antes);
  });

  it("webhook DUPLICADO → mismo 200, sin doble decremento (conteos antes/después/otra vez)", async () => {
    const { folio } = await crearPedidoPorRuta(1);
    const antes = await stockActual();

    await postWebhook(requestWebhook(`fake-pago-aprobado-${folio}`));
    const despues = await stockActual();
    expect(despues).toBe(antes - 1);

    const res = await postWebhook(requestWebhook(`fake-pago-aprobado-${folio}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ procesado: false, resultado: "ya_pagado" });
    expect(await stockActual()).toBe(despues); // idéntico: sin doble decremento
  });

  it("pago rechazado → estado rechazado, stock INTACTO", async () => {
    const { folio } = await crearPedidoPorRuta(3);
    const antes = await stockActual();

    const res = await postWebhook(requestWebhook(`fake-pago-rechazado-${folio}`));
    expect(await res.json()).toEqual({ procesado: true, resultado: "rechazado" });

    expect((await prisma.pedido.findUnique({ where: { folio } }))?.estado).toBe("rechazado");
    expect(await stockActual()).toBe(antes);
  });

  it("pago desconocido o tipo no-payment → 200 sin procesar", async () => {
    const resDesconocido = await postWebhook(requestWebhook("id-que-no-existe"));
    expect(resDesconocido.status).toBe(200);
    expect((await resDesconocido.json()).procesado).toBe(false);
  });
});

describe("GET /api/pedidos/[folio] (H06)", () => {
  it("devuelve el pedido con items y estado; folio en minúsculas también resuelve", async () => {
    const { folio } = await crearPedidoPorRuta(1);
    const res = await getPedido(new Request(`http://localhost:3000/api/pedidos/${folio}`), {
      params: Promise.resolve({ folio: folio.toLowerCase() }),
    });
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.folio).toBe(folio);
    expect(cuerpo.items).toHaveLength(1);
  });

  it("folio inexistente → 404", async () => {
    const res = await getPedido(new Request("http://localhost:3000/api/pedidos/LS-NOPE22"), {
      params: Promise.resolve({ folio: "LS-NOPE22" }),
    });
    expect(res.status).toBe(404);
  });
});
