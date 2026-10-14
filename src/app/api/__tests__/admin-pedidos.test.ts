// T9 · Bitácora de pedidos (BLOQUE 3) a nivel Route Handler, con auth() mockeado:
// guard 401/403 · listado paginado con filtro · detalle CON contacto (a
// diferencia del GET público) · 404 · empty state del filtro.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/auth/config", () => ({ auth: vi.fn() }));

import { auth } from "@/shared/auth/config";
import { prisma } from "@/shared/db/client";
import { aplicarResultadoPago, crearPedido } from "@/modules/compra/pedidos";
import { proveedorFake } from "@/modules/compra/pasarela/fake";
import { GET as getPedidosAdmin } from "../admin/pedidos/route";
import { GET as getPedidoAdminDetalle } from "../admin/pedidos/[folio]/route";
import { GET as getPedidoPublico } from "../pedidos/[folio]/route";
import { GET as getErrorPrueba } from "../admin/error-prueba/route";

const authMock = vi.mocked(auth as unknown as () => Promise<unknown>);
const SESION_ADMIN = { user: { id: "cuenta_admin_test", rol: "admin" } };
const SESION_CLIENTA = { user: { id: "cuenta_clienta_test", rol: "clienta" } };

const EMAIL_PENDIENTE = "test-bitacora-pendiente@example.com";
const EMAIL_PAGADO = "test-bitacora-pagado@example.com";
const EMAIL_RECHAZADO = "test-bitacora-rechazado@example.com";
const EMAILS = [EMAIL_PENDIENTE, EMAIL_PAGADO, EMAIL_RECHAZADO];
const TELEFONO = "5512345678";
const PRECIO = 249000;

function peticion(query = "") {
  return new NextRequest(`http://localhost:3000/api/admin/pedidos${query}`, { method: "GET" });
}
const params = (valores: Record<string, string>) => ({
  params: Promise.resolve(valores) as Promise<never>,
});

let productoId: string;
let varianteId: string;
// Folios en orden de fecha DESC esperado: [rechazado, pagado, pendiente].
let folioPendiente: string;
let folioPagado: string;
let folioRechazado: string;

beforeAll(async () => {
  const categoria = await prisma.categoria.findFirstOrThrow();
  const producto = await prisma.producto.create({
    data: {
      nombre_tono: "Bitácora Test",
      slug: "bitacora-test-t9",
      familia_tono: "rubios",
      tipo: "bitacora-test",
      descripcion: "Producto temporal de los tests de bitácora.",
      fotos: ["/img/bitacora-test.jpg"],
      categoria_id: categoria.id,
      variantes: {
        create: [{ largo_pulgadas: 20, precio_mxn: PRECIO, existencias: 50, sku: "BIT-T9-20" }],
      },
    },
    include: { variantes: true },
  });
  productoId = producto.id;
  varianteId = producto.variantes[0].id;

  async function comprar(email: string, conTelefono: boolean, cantidad: number) {
    const resultado = await crearPedido(
      {
        items: [{ variante_id: varianteId, cantidad }],
        email_contacto: email,
        ...(conTelefono ? { telefono_contacto: TELEFONO } : {}),
      },
      proveedorFake
    );
    if (!resultado.ok) throw new Error(`checkout de prueba falló: ${resultado.error}`);
    return resultado.pedido.folio;
  }

  folioPendiente = await comprar(EMAIL_PENDIENTE, true, 2);
  folioPagado = await comprar(EMAIL_PAGADO, false, 1);
  folioRechazado = await comprar(EMAIL_RECHAZADO, false, 1);
  expect(await aplicarResultadoPago(folioPagado, "aprobado", "ref-bitacora-pagado")).toBe("pagado");
  expect(await aplicarResultadoPago(folioRechazado, "rechazado", "ref-bitacora-rechazado")).toBe(
    "rechazado"
  );

  // Fechas deterministas (desc): rechazado (hoy) > pagado (-1 min) > pendiente (-2 min).
  const ahora = Date.now();
  await prisma.pedido.update({
    where: { folio: folioPendiente },
    data: { creado_en: new Date(ahora - 2 * 60_000) },
  });
  await prisma.pedido.update({
    where: { folio: folioPagado },
    data: { creado_en: new Date(ahora - 60_000) },
  });
  await prisma.pedido.update({
    where: { folio: folioRechazado },
    data: { creado_en: new Date(ahora) },
  });
});

afterAll(async () => {
  const pedidos = await prisma.pedido.findMany({ where: { email_contacto: { in: EMAILS } } });
  await prisma.pedidoItem.deleteMany({
    where: { pedido_id: { in: pedidos.map((p) => p.id) } },
  });
  await prisma.pedido.deleteMany({ where: { email_contacto: { in: EMAILS } } });
  await prisma.varianteLargo.deleteMany({ where: { producto_id: productoId } });
  await prisma.producto.delete({ where: { id: productoId } });
});

beforeEach(() => authMock.mockResolvedValue(SESION_ADMIN));

describe("guardia de la bitácora (mismo criterio que el resto de /api/admin/*)", () => {
  it("sin sesión → 401 en lista, detalle y error de prueba", async () => {
    authMock.mockResolvedValue(null);
    const respuestas = [
      await getPedidosAdmin(peticion()),
      await getPedidoAdminDetalle(peticion(), params({ folio: folioPendiente })),
      await getErrorPrueba(),
    ];
    for (const res of respuestas) expect(res.status).toBe(401);
  });

  it("sesión de CLIENTA → 403", async () => {
    authMock.mockResolvedValue(SESION_CLIENTA);
    const respuestas = [
      await getPedidosAdmin(peticion()),
      await getPedidoAdminDetalle(peticion(), params({ folio: folioPendiente })),
      await getErrorPrueba(),
    ];
    for (const res of respuestas) {
      expect(res.status).toBe(403);
      expect((await res.json()).error).toContain("administradora");
    }
  });

  it("como admin, el error de prueba de Sentry SÍ se lanza (controlado)", async () => {
    await expect(getErrorPrueba()).rejects.toThrow("verificación de Sentry");
  });
});

describe("GET /api/admin/pedidos · listado", () => {
  it("lista con orden por fecha DESC y campos del resumen", async () => {
    const res = await getPedidosAdmin(peticion());
    expect(res.status).toBe(200);
    const datos = await res.json();
    expect(datos.total).toBeGreaterThanOrEqual(3);

    const mios = datos.pedidos.filter((p: { folio: string }) =>
      [folioPendiente, folioPagado, folioRechazado].includes(p.folio)
    );
    expect(mios.map((p: { folio: string }) => p.folio)).toEqual([
      folioRechazado,
      folioPagado,
      folioPendiente,
    ]);

    const pendiente = mios[2];
    expect(pendiente).toMatchObject({
      estado: "pendiente",
      total_mxn: 2 * PRECIO,
      piezas: 2,
    });
    expect(pendiente.creado_en).toBeDefined();
    // El resumen NO expone datos de contacto (solo el detalle los da).
    expect(pendiente.email_contacto).toBeUndefined();
  });

  it("filtro por estado devuelve SOLO ese estado", async () => {
    const res = await getPedidosAdmin(peticion("?estado=pagado_sandbox"));
    const datos = await res.json();
    expect(datos.pedidos.length).toBeGreaterThanOrEqual(1);
    for (const p of datos.pedidos) expect(p.estado).toBe("pagado_sandbox");
    expect(datos.pedidos.some((p: { folio: string }) => p.folio === folioPagado)).toBe(true);
    expect(datos.pedidos.some((p: { folio: string }) => p.folio === folioPendiente)).toBe(false);
  });

  it("paginación: por_pagina=1 corta y la página 2 trae otro folio", async () => {
    const pagina1 = await (await getPedidosAdmin(peticion("?por_pagina=1"))).json();
    const pagina2 = await (await getPedidosAdmin(peticion("?por_pagina=1&pagina=2"))).json();
    expect(pagina1.pedidos).toHaveLength(1);
    expect(pagina1.por_pagina).toBe(1);
    expect(pagina2.pedidos).toHaveLength(1);
    expect(pagina2.pedidos[0].folio).not.toBe(pagina1.pedidos[0].folio);
    expect(pagina2.total).toBe(pagina1.total);
  });

  it("empty state: sin resultados → 200 con lista vacía (nunca error)", async () => {
    // Página más allá del total: mismo contrato de respuesta que una tienda
    // sin ventas (pedidos: []) — es lo que la UI pinta como empty state.
    const res = await getPedidosAdmin(peticion("?estado=rechazado&pagina=99"));
    const datos = await res.json();
    expect(res.status).toBe(200);
    expect(datos.pedidos).toEqual([]);
  });

  it("filtros inválidos → 400 (estado desconocido, pagina 0, por_pagina fuera de rango)", async () => {
    expect((await getPedidosAdmin(peticion("?estado=enviado"))).status).toBe(400);
    expect((await getPedidosAdmin(peticion("?pagina=0"))).status).toBe(400);
    expect((await getPedidosAdmin(peticion("?por_pagina=999"))).status).toBe(400);
  });
});

describe("GET /api/admin/pedidos/[folio] · detalle", () => {
  it("expone contacto, items con precio congelado y total — y el GET público NO", async () => {
    const res = await getPedidoAdminDetalle(peticion(), params({ folio: folioPendiente }));
    expect(res.status).toBe(200);
    const detalle = await res.json();
    expect(detalle).toMatchObject({
      folio: folioPendiente,
      estado: "pendiente",
      total_mxn: 2 * PRECIO,
      email_contacto: EMAIL_PENDIENTE,
      telefono_contacto: TELEFONO,
      cuenta: null,
    });
    expect(detalle.items).toHaveLength(1);
    expect(detalle.items[0]).toMatchObject({
      cantidad: 2,
      precio_unitario_congelado: PRECIO,
    });
    expect(detalle.items[0].variante.producto.nombre_tono).toBe("Bitácora Test");

    // Contraste de seguridad (BLOQUE 2.4): la consulta pública por folio
    // NUNCA trae contacto.
    const publica = await (
      await getPedidoPublico(peticion(), params({ folio: folioPendiente }))
    ).json();
    expect(publica.email_contacto).toBeUndefined();
    expect(publica.telefono_contacto).toBeUndefined();
  });

  it("pedido sin teléfono → telefono_contacto null (la UI ofrece el correo)", async () => {
    const res = await getPedidoAdminDetalle(peticion(), params({ folio: folioPagado }));
    const detalle = await res.json();
    expect(detalle.estado).toBe("pagado_sandbox");
    expect(detalle.telefono_contacto).toBeNull();
    expect(detalle.email_contacto).toBe(EMAIL_PAGADO);
  });

  it("acepta folio en minúsculas (la ruta lo normaliza)", async () => {
    const res = await getPedidoAdminDetalle(
      peticion(),
      params({ folio: folioRechazado.toLowerCase() })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).folio).toBe(folioRechazado);
  });

  it("folio inexistente → 404", async () => {
    const res = await getPedidoAdminDetalle(peticion(), params({ folio: "LS-NOPE99" }));
    expect(res.status).toBe(404);
  });
});
