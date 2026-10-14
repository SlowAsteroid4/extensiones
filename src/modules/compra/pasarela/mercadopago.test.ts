// Unit del adapter de MercadoPago con el SDK mockeado (sin red, sin
// credenciales reales): mapeo de estados y elección de la URL del checkout.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { crearPreferenciaMock, obtenerUsuarioMock } = vi.hoisted(() => ({
  crearPreferenciaMock: vi.fn(),
  obtenerUsuarioMock: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {
    get = vi.fn();
  },
  Preference: class {
    create = crearPreferenciaMock;
  },
  User: class {
    get = obtenerUsuarioMock;
  },
}));

import { prisma } from "@/shared/db/client";
import { crearPedido } from "../pedidos";
import { crearProveedorMercadoPago, elegirUrlCheckout, mapearEstadoMP } from "./mercadopago";

const URLS = {
  init_point: "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=X",
  sandbox_init_point: "https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=X",
};

const DATOS = {
  folio: "LS-K3M8QP",
  email_comprador: "compradora@example.com",
  items: [{ titulo: 'Castaño Chocolate · 18"', cantidad: 1, precio_unitario_centavos: 289000 }],
};

describe("mapearEstadoMP", () => {
  it("approved → aprobado", () => {
    expect(mapearEstadoMP("approved")).toBe("aprobado");
  });

  it("rejected y cancelled → rechazado", () => {
    expect(mapearEstadoMP("rejected")).toBe("rechazado");
    expect(mapearEstadoMP("cancelled")).toBe("rechazado");
  });

  it("estados intermedios/desconocidos → otro (no se procesan en fase 1)", () => {
    for (const estado of ["pending", "in_process", "refunded", "charged_back", undefined, "???"]) {
      expect(mapearEstadoMP(estado)).toBe("otro");
    }
  });
});

describe("elegirUrlCheckout", () => {
  it("cuenta de prueba → checkout sandbox", () => {
    expect(elegirUrlCheckout(URLS, true)).toBe(URLS.sandbox_init_point);
  });

  it("cuenta real → checkout de producción (nunca el sandbox)", () => {
    expect(elegirUrlCheckout(URLS, false)).toBe(URLS.init_point);
  });

  it("cuenta de prueba sin sandbox_init_point → ninguna URL (nunca la de producción)", () => {
    expect(elegirUrlCheckout({ init_point: URLS.init_point }, true)).toBeUndefined();
  });
});

describe("crearProveedorMercadoPago · crearPreferencia", () => {
  const tokenOriginal = process.env.MERCADOPAGO_ACCESS_TOKEN;
  let contador = 0;

  // Token distinto por test: la detección de cuenta de prueba se guarda por token.
  beforeEach(() => {
    contador += 1;
    process.env.MERCADOPAGO_ACCESS_TOKEN = `token-falso-de-test-${contador}`;
    crearPreferenciaMock.mockReset().mockResolvedValue({ id: "pref-123", ...URLS });
    obtenerUsuarioMock.mockReset();
  });

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = tokenOriginal;
  });

  it("vendedor de prueba (tag test_user) → devuelve el checkout sandbox", async () => {
    obtenerUsuarioMock.mockResolvedValue({ tags: ["user_product_seller", "test_user", "normal"] });

    const preferencia = await crearProveedorMercadoPago().crearPreferencia(DATOS);

    expect(preferencia).toEqual({ pasarela_ref: "pref-123", init_point: URLS.sandbox_init_point });
  });

  it("vendedor real → devuelve el checkout de producción", async () => {
    obtenerUsuarioMock.mockResolvedValue({ tags: ["normal"] });

    const preferencia = await crearProveedorMercadoPago().crearPreferencia(DATOS);

    expect(preferencia.init_point).toBe(URLS.init_point);
  });

  it("si /users/me falla → rechaza SIN crear preferencia, y reintenta en la siguiente llamada", async () => {
    obtenerUsuarioMock.mockRejectedValueOnce(new Error("red caída"));
    const proveedor = crearProveedorMercadoPago();

    await expect(proveedor.crearPreferencia(DATOS)).rejects.toThrow("red caída");
    expect(crearPreferenciaMock).not.toHaveBeenCalled();

    obtenerUsuarioMock.mockResolvedValueOnce({ tags: ["test_user"] });
    expect((await proveedor.crearPreferencia(DATOS)).init_point).toBe(URLS.sandbox_init_point);
  });

  it("si /users/me responde sin tags → rechaza (no supone producción)", async () => {
    obtenerUsuarioMock.mockResolvedValue({ id: 1 });

    await expect(crearProveedorMercadoPago().crearPreferencia(DATOS)).rejects.toThrow("tags");
    expect(crearPreferenciaMock).not.toHaveBeenCalled();
  });

  it("cuenta de prueba y MP sin sandbox_init_point → rechaza (no entrega producción)", async () => {
    obtenerUsuarioMock.mockResolvedValue({ tags: ["test_user"] });
    crearPreferenciaMock.mockResolvedValue({ id: "pref-123", init_point: URLS.init_point });

    await expect(crearProveedorMercadoPago().crearPreferencia(DATOS)).rejects.toThrow(
      "sandbox_init_point"
    );
  });

  it("consulta /users/me una sola vez por token", async () => {
    obtenerUsuarioMock.mockResolvedValue({ tags: ["test_user"] });
    const proveedor = crearProveedorMercadoPago();

    await proveedor.crearPreferencia(DATOS);
    await crearProveedorMercadoPago().crearPreferencia(DATOS);

    expect(obtenerUsuarioMock).toHaveBeenCalledTimes(1);
  });

  it("manda a MP folio como external_reference y precios en pesos MXN", async () => {
    obtenerUsuarioMock.mockResolvedValue({ tags: ["test_user"] });

    await crearProveedorMercadoPago().crearPreferencia(DATOS);

    const { body } = crearPreferenciaMock.mock.calls[0][0];
    expect(body.external_reference).toBe("LS-K3M8QP");
    expect(body.items[0]).toMatchObject({ quantity: 1, currency_id: "MXN", unit_price: 2890 });
  });
});

describe("checkout con el adapter de MP cuando /users/me falla (integración, DB de test)", () => {
  const EMAIL = "test-mp-falla-cerrada@example.com";
  const tokenOriginal = process.env.MERCADOPAGO_ACCESS_TOKEN;

  afterEach(async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = tokenOriginal;
    await prisma.pedidoItem.deleteMany({ where: { pedido: { email_contacto: EMAIL } } });
    await prisma.pedido.deleteMany({ where: { email_contacto: EMAIL } });
  });

  it("falla cerrado: 502 y ningún pedido queda en la base", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token-falso-de-test-integracion";
    obtenerUsuarioMock.mockReset().mockRejectedValue(new Error("MP no responde"));
    crearPreferenciaMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const antes = await prisma.pedido.count({ where: { email_contacto: EMAIL } });

    const resultado = await crearPedido(
      { items: [{ variante_id: "var_cas_001_18", cantidad: 1 }], email_contacto: EMAIL },
      crearProveedorMercadoPago()
    );

    expect(resultado).toMatchObject({ ok: false, status: 502 });
    expect(await prisma.pedido.count({ where: { email_contacto: EMAIL } })).toBe(antes);
    expect(crearPreferenciaMock).not.toHaveBeenCalled();
  });
});
