// @vitest-environment jsdom
// T9 · Bitácora (BLOQUE 3), lado UI: empty state con mensaje cuando aún no
// hay ventas · filas con folio/fecha/total/estado · detalle con WhatsApp
// solo si hay teléfono.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PedidoDetalle, PedidosLista } from "./pedidos-admin";

const LISTA_VACIA = { total: 0, pagina: 1, por_pagina: 20, pedidos: [] };
const LISTA_CON_VENTAS = {
  total: 2,
  pagina: 1,
  por_pagina: 20,
  pedidos: [
    {
      folio: "LS-AAAA11",
      creado_en: "2026-08-30T18:00:00.000Z",
      total_mxn: 498000,
      estado: "pagado_sandbox",
      piezas: 2,
    },
    {
      folio: "LS-BBBB22",
      creado_en: "2026-08-29T12:00:00.000Z",
      total_mxn: 249000,
      estado: "pendiente",
      piezas: 1,
    },
  ],
};

const DETALLE = {
  folio: "LS-AAAA11",
  creado_en: "2026-08-30T18:00:00.000Z",
  total_mxn: 498000,
  estado: "pagado_sandbox",
  email_contacto: "compradora@example.com",
  telefono_contacto: "5512345678",
  cuenta: { nombre: "Compradora Test" },
  items: [
    {
      cantidad: 2,
      precio_unitario_congelado: 249000,
      variante: {
        id: "var_1",
        largo_pulgadas: 20,
        sku: "NEG-20",
        producto: { nombre_tono: "Negro Natural", slug: "negro-natural", fotos: [] },
      },
    },
  ],
};

function mockFetch(respuesta: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => respuesta });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(cleanup);

describe("PedidosLista", () => {
  it("sin ventas → empty state con mensaje (nunca pantalla en blanco)", async () => {
    mockFetch(LISTA_VACIA);
    render(<PedidosLista />);
    await screen.findByText("Aún no hay ventas");
    expect(
      screen.getByText("Cuando alguien compre en la tienda, su pedido aparecerá aquí.")
    ).toBeDefined();
  });

  it("con ventas → filas con folio, estado y acceso al detalle", async () => {
    mockFetch(LISTA_CON_VENTAS);
    render(<PedidosLista />);
    // Cada pedido aparece en la card mobile y en la tabla desktop (2 vistas CSS).
    expect(await screen.findAllByText("LS-AAAA11")).toHaveLength(2);
    expect(screen.getAllByText("Pagado").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pago pendiente").length).toBeGreaterThanOrEqual(1);
    const enlaces = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
      .filter((href) => href?.startsWith("/admin/pedidos/"));
    expect(enlaces).toContain("/admin/pedidos/LS-AAAA11");
    expect(enlaces).toContain("/admin/pedidos/LS-BBBB22");
  });

  it("el filtro de estado pide a la API con ?estado=", async () => {
    const fetchMock = mockFetch(LISTA_VACIA);
    render(<PedidosLista />);
    await screen.findByText("Aún no hay ventas");
    fireEvent.click(screen.getByRole("button", { name: "Pagados" }));
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((llamada) => String(llamada[0]));
      expect(urls.some((u) => u.includes("estado=pagado_sandbox"))).toBe(true);
    });
  });
});

describe("PedidoDetalle", () => {
  it("muestra items, total, contacto y el botón de WhatsApp (hay teléfono)", async () => {
    mockFetch(DETALLE);
    render(<PedidoDetalle folio="LS-AAAA11" />);
    await screen.findByText("Contacto de la compradora");
    expect(screen.getByText("compradora@example.com")).toBeDefined();
    expect(screen.getByText("Compradora Test")).toBeDefined();
    expect(screen.getByText(/Negro Natural/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Coordinar entrega por WhatsApp" })).toBeDefined();
  });

  it("sin teléfono → sin botón de WhatsApp, con guía al correo", async () => {
    mockFetch({ ...DETALLE, telefono_contacto: null });
    render(<PedidoDetalle folio="LS-AAAA11" />);
    await screen.findByText("Contacto de la compradora");
    expect(screen.queryByRole("button", { name: "Coordinar entrega por WhatsApp" })).toBeNull();
    expect(screen.getByText("No dejó teléfono — contáctala por correo.")).toBeDefined();
  });
});
