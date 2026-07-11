// @vitest-environment jsdom
// T6 · H05: el carrito se limpia SOLO en pago exitoso — pendiente y rechazado
// lo conservan (B3: "el carrito NO se vació").
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProveedorCarrito } from "./carrito-contexto";
import { ConfirmacionCliente, type PedidoConfirmacion } from "./confirmacion-cliente";

const ITEMS_GUARDADOS = [
  {
    variante_id: "var_1",
    producto_slug: "negro-natural",
    nombre_tono: "Negro Natural",
    largo: '20"',
    precio_mxn: 249000,
    cantidad: 2,
    max_existencias: 5,
  },
];

function pedido(estado: PedidoConfirmacion["estado"]): PedidoConfirmacion {
  return {
    folio: "LS-TEST01",
    estado,
    total_mxn: 498000,
    items: [
      {
        cantidad: 2,
        precio_unitario_congelado: 249000,
        variante: { id: "var_1", largo_pulgadas: 20, producto: { nombre_tono: "Negro Natural" } },
      },
    ],
  };
}

function itemsEnStorage(): unknown[] {
  return JSON.parse(window.localStorage.getItem("ls-carrito-v1") ?? "[]");
}

describe("ConfirmacionCliente (B4) · limpieza del carrito", () => {
  beforeEach(() => {
    window.localStorage.setItem("ls-carrito-v1", JSON.stringify(ITEMS_GUARDADOS));
  });
  afterEach(cleanup);

  it("estado pendiente NO limpia el carrito", async () => {
    render(
      <ProveedorCarrito>
        <ConfirmacionCliente pedido={pedido("pendiente")} />
      </ProveedorCarrito>
    );
    await screen.findByText("¡Pedido confirmado!");
    await waitFor(() => expect(itemsEnStorage()).toHaveLength(1));
    expect(screen.getByText("Pago pendiente")).toBeDefined();
  });

  it("estado rechazado CONSERVA el carrito (H05)", async () => {
    render(
      <ProveedorCarrito>
        <ConfirmacionCliente pedido={pedido("rechazado")} />
      </ProveedorCarrito>
    );
    await screen.findByText("Pedido con pago rechazado");
    await waitFor(() => expect(itemsEnStorage()).toHaveLength(1));
  });

  it("estado pagado_sandbox SÍ limpia el carrito", async () => {
    render(
      <ProveedorCarrito>
        <ConfirmacionCliente pedido={pedido("pagado_sandbox")} />
      </ProveedorCarrito>
    );
    await screen.findByText("Pagado");
    await waitFor(() => expect(itemsEnStorage()).toHaveLength(0));
  });
});
