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

  it("cuenta de prueba sin sandbox_init_point → cae a init_point", () => {
    expect(elegirUrlCheckout({ init_point: URLS.init_point }, true)).toBe(URLS.init_point);
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

  it("si /users/me falla → producción y reintenta la detección en la siguiente llamada", async () => {
    obtenerUsuarioMock.mockRejectedValueOnce(new Error("red caída"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const proveedor = crearProveedorMercadoPago();

    expect((await proveedor.crearPreferencia(DATOS)).init_point).toBe(URLS.init_point);

    obtenerUsuarioMock.mockResolvedValueOnce({ tags: ["test_user"] });
    expect((await proveedor.crearPreferencia(DATOS)).init_point).toBe(URLS.sandbox_init_point);
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
