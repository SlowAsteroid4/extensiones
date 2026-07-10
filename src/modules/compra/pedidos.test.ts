// Integración H04/H05/H06 + 3.D.3/3.D.4/3.D.5 contra la DB de test.
// Usa productos DEDICADOS (no toca el stock del seed, del que dependen otros tests).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db/client";
import { proveedorFake } from "./pasarela/fake";
import type { PasarelaProvider } from "./pasarela/provider";
import { PATRON_FOLIO } from "./folio";
import { aplicarResultadoPago, crearPedido, obtenerPedidoPorFolio } from "./pedidos";

const EMAIL = "test-compra@example.com";
const PROD_ACTIVO = "prod_test_compra";
const PROD_INACTIVO = "prod_test_compra_inactivo";
const VAR_10 = "var_test_compra_10"; // stock 10, $1,990
const VAR_3 = "var_test_compra_3"; // stock 3, $2,490
const VAR_INACTIVA = "var_test_compra_inactiva";

async function limpiar() {
  await prisma.pedidoItem.deleteMany({ where: { pedido: { email_contacto: EMAIL } } });
  await prisma.pedido.deleteMany({ where: { email_contacto: EMAIL } });
  await prisma.varianteLargo.deleteMany({ where: { id: { in: [VAR_10, VAR_3, VAR_INACTIVA] } } });
  await prisma.producto.deleteMany({ where: { id: { in: [PROD_ACTIVO, PROD_INACTIVO] } } });
}

beforeAll(async () => {
  await limpiar();
  await prisma.producto.create({
    data: {
      id: PROD_ACTIVO,
      nombre_tono: "Tono Compra Test",
      slug: "tono-compra-test",
      familia_tono: "rubios",
      tipo: "clip",
      descripcion: "Producto para tests de compra.",
      fotos: [],
      categoria_id: "cat_clip",
      activo: true,
      variantes: {
        create: [
          { id: VAR_10, largo_pulgadas: 20, precio_mxn: 199000, existencias: 10, sku: "TST-COMPRA-20" },
          { id: VAR_3, largo_pulgadas: 22, precio_mxn: 249000, existencias: 3, sku: "TST-COMPRA-22" },
        ],
      },
    },
  });
  await prisma.producto.create({
    data: {
      id: PROD_INACTIVO,
      nombre_tono: "Tono Compra Inactivo",
      slug: "tono-compra-inactivo-test",
      familia_tono: "rubios",
      tipo: "clip",
      descripcion: "Producto inactivo para tests de compra.",
      fotos: [],
      categoria_id: "cat_clip",
      activo: false,
      variantes: {
        create: [
          {
            id: VAR_INACTIVA,
            largo_pulgadas: 20,
            precio_mxn: 199000,
            existencias: 5,
            sku: "TST-COMPRA-INACTIVA",
          },
        ],
      },
    },
  });
});

afterAll(limpiar);

async function stockDe(id: string): Promise<number> {
  const variante = await prisma.varianteLargo.findUniqueOrThrow({ where: { id } });
  return variante.existencias;
}

describe("crearPedido (H04/H05)", () => {
  it("invitada: crea pendiente con folio LS-XXXXXX, total server-side e init_point", async () => {
    const resultado = await crearPedido(
      {
        items: [
          { variante_id: VAR_10, cantidad: 2 },
          { variante_id: VAR_3, cantidad: 1 },
        ],
        email_contacto: EMAIL,
      },
      proveedorFake
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.pedido.folio).toMatch(PATRON_FOLIO);
    expect(resultado.pedido.total_mxn).toBe(2 * 199000 + 249000); // 647000, calculado en servidor
    expect(resultado.pedido.estado).toBe("pendiente");
    expect(resultado.pedido.init_point).toContain("fake");

    const enDb = await prisma.pedido.findUnique({
      where: { folio: resultado.pedido.folio },
      include: { items: true },
    });
    expect(enDb?.cuenta_id).toBeNull(); // invitada
    expect(enDb?.pasarela_ref).toBe(`fake-pref-${resultado.pedido.folio}`);
    expect(enDb?.items).toHaveLength(2);
    // crear NO decrementa stock (3.D.3)
    expect(await stockDe(VAR_10)).toBe(10);
  });

  it("con sesión: cuenta_id viene del token, no del body", async () => {
    const cuenta = await prisma.cuenta.upsert({
      where: { email: "test-compra-cuenta@example.com" },
      create: {
        email: "test-compra-cuenta@example.com",
        nombre: "Compradora Test",
        rol: "clienta",
        hash_password: "x",
      },
      update: {},
    });
    const resultado = await crearPedido(
      {
        items: [{ variante_id: VAR_10, cantidad: 1 }],
        email_contacto: EMAIL,
        cuenta_id: cuenta.id,
      },
      proveedorFake
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const enDb = await prisma.pedido.findUnique({ where: { folio: resultado.pedido.folio } });
    expect(enDb?.cuenta_id).toBe(cuenta.id);
    await prisma.cuenta.deleteMany({ where: { email: "test-compra-cuenta@example.com" } });
  });

  it("congela el precio: cambiar el precio de la variante NO altera el pedido (3.D.5)", async () => {
    const resultado = await crearPedido(
      { items: [{ variante_id: VAR_3, cantidad: 1 }], email_contacto: EMAIL },
      proveedorFake
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    await prisma.varianteLargo.update({ where: { id: VAR_3 }, data: { precio_mxn: 999900 } });
    const pedido = await obtenerPedidoPorFolio(resultado.pedido.folio);
    expect(pedido?.items[0].precio_unitario_congelado).toBe(249000); // congelado
    expect(pedido?.total_mxn).toBe(249000);
    await prisma.varianteLargo.update({ where: { id: VAR_3 }, data: { precio_mxn: 249000 } });
  });

  it("cantidad > stock → 409 con detalle POR ITEM (los válidos no aparecen)", async () => {
    const resultado = await crearPedido(
      {
        items: [
          { variante_id: VAR_10, cantidad: 1 }, // ok
          { variante_id: VAR_3, cantidad: 4 }, // solo hay 3
        ],
        email_contacto: EMAIL,
      },
      proveedorFake
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(409);
    expect(resultado.detalles).toEqual([
      { variante_id: VAR_3, error: "Solo quedan 3 unidades" },
    ]);
  });

  it("variante de producto inactivo y variante inexistente → detalle por item", async () => {
    const resultado = await crearPedido(
      {
        items: [
          { variante_id: VAR_INACTIVA, cantidad: 1 },
          { variante_id: "var_no_existe", cantidad: 1 },
        ],
        email_contacto: EMAIL,
      },
      proveedorFake
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(409);
    expect(resultado.detalles).toEqual([
      { variante_id: VAR_INACTIVA, error: "Producto no disponible" },
      { variante_id: "var_no_existe", error: "La variante no existe" },
    ]);
  });

  it("items repetidos → 400 con detalle", async () => {
    const resultado = await crearPedido(
      {
        items: [
          { variante_id: VAR_10, cantidad: 1 },
          { variante_id: VAR_10, cantidad: 2 },
        ],
        email_contacto: EMAIL,
      },
      proveedorFake
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(400);
    expect(resultado.detalles?.[0].error).toContain("repetida");
  });

  it("si la pasarela falla, el pedido NO queda huérfano", async () => {
    const proveedorRoto: PasarelaProvider = {
      nombre: "roto",
      crearPreferencia: async () => {
        throw new Error("pasarela caída");
      },
      obtenerPago: async () => null,
    };
    const antes = await prisma.pedido.count({ where: { email_contacto: EMAIL } });
    const resultado = await crearPedido(
      { items: [{ variante_id: VAR_10, cantidad: 1 }], email_contacto: EMAIL },
      proveedorRoto
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.status).toBe(502);
    expect(await prisma.pedido.count({ where: { email_contacto: EMAIL } })).toBe(antes);
  });
});

describe("aplicarResultadoPago (3.D.3/3.D.4)", () => {
  async function pedidoNuevo(cantidad = 2) {
    const resultado = await crearPedido(
      { items: [{ variante_id: VAR_10, cantidad }], email_contacto: EMAIL },
      proveedorFake
    );
    if (!resultado.ok) throw new Error("no se pudo crear pedido de prueba");
    return resultado.pedido.folio;
  }

  it("aprobado: pendiente → pagado_sandbox con decremento exacto y en transacción", async () => {
    const folio = await pedidoNuevo(2);
    const antes = await stockDe(VAR_10);

    const resultado = await aplicarResultadoPago(folio, "aprobado", `fake-pago-aprobado-${folio}`);
    expect(resultado).toBe("pagado");

    const pedido = await prisma.pedido.findUnique({ where: { folio } });
    expect(pedido?.estado).toBe("pagado_sandbox");
    expect(pedido?.pasarela_ref).toBe(`fake-pago-aprobado-${folio}`);
    expect(await stockDe(VAR_10)).toBe(antes - 2);
  });

  it("webhook DUPLICADO: sin doble decremento ni cambio de estado (idempotencia)", async () => {
    const folio = await pedidoNuevo(1);
    const antes = await stockDe(VAR_10);

    expect(await aplicarResultadoPago(folio, "aprobado", "ref-1")).toBe("pagado");
    const despues = await stockDe(VAR_10);
    expect(despues).toBe(antes - 1);

    expect(await aplicarResultadoPago(folio, "aprobado", "ref-1")).toBe("ya_pagado");
    expect(await stockDe(VAR_10)).toBe(despues); // sin doble decremento
  });

  it("rechazado: estado cambia y el stock queda INTACTO", async () => {
    const folio = await pedidoNuevo(3);
    const antes = await stockDe(VAR_10);

    expect(await aplicarResultadoPago(folio, "rechazado", "ref-r")).toBe("rechazado");
    expect((await prisma.pedido.findUnique({ where: { folio } }))?.estado).toBe("rechazado");
    expect(await stockDe(VAR_10)).toBe(antes);
  });

  it("un rechazado ya pagado NO se degrada; un rechazado puede reintentarse y pagar", async () => {
    const folio = await pedidoNuevo(1);
    await aplicarResultadoPago(folio, "rechazado", "ref-1");
    const antes = await stockDe(VAR_10);

    // Reintento aprobado tras rechazo (H05): transiciona y decrementa una vez.
    expect(await aplicarResultadoPago(folio, "aprobado", "ref-2")).toBe("pagado");
    expect(await stockDe(VAR_10)).toBe(antes - 1);

    // Un rechazo tardío NO degrada el pedido pagado.
    expect(await aplicarResultadoPago(folio, "rechazado", "ref-3")).toBe("ya_pagado");
    expect((await prisma.pedido.findUnique({ where: { folio } }))?.estado).toBe("pagado_sandbox");
  });

  it("estados no procesables → ignorado · folio desconocido → no_encontrado", async () => {
    const folio = await pedidoNuevo(1);
    expect(await aplicarResultadoPago(folio, "otro", "ref-x")).toBe("ignorado");
    expect(await aplicarResultadoPago("LS-ZZZZZZ", "aprobado", "ref-x")).toBe("no_encontrado");
  });
});

describe("obtenerPedidoPorFolio (H06)", () => {
  it("devuelve folio, items, total y estado — sin datos de contacto", async () => {
    const creado = await crearPedido(
      { items: [{ variante_id: VAR_10, cantidad: 1 }], email_contacto: EMAIL },
      proveedorFake
    );
    if (!creado.ok) throw new Error("setup falló");

    const pedido = await obtenerPedidoPorFolio(creado.pedido.folio);
    expect(pedido?.folio).toBe(creado.pedido.folio);
    expect(pedido?.estado).toBe("pendiente");
    expect(pedido?.total_mxn).toBe(199000);
    expect(pedido?.items[0].variante.producto.nombre_tono).toBe("Tono Compra Test");
    expect(pedido).not.toHaveProperty("email_contacto");
    expect(pedido).not.toHaveProperty("telefono_contacto");
  });

  it("folio inexistente → null", async () => {
    expect(await obtenerPedidoPorFolio("LS-ABCDEF")).toBeNull();
  });
});
