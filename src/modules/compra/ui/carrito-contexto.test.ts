// T6 · Carrito (H04): consolidación por variante_id y tope de stock.
// La API rechaza items repetidos por variante con 400: el carrito DEBE
// consolidar antes de enviar.
import { describe, expect, it } from "vitest";
import { consolidarItem, type ItemCarrito } from "./carrito-contexto";

const base: ItemCarrito = {
  variante_id: "var_1",
  producto_slug: "negro-natural",
  nombre_tono: "Negro Natural",
  largo: '20"',
  precio_mxn: 249000,
  cantidad: 1,
  max_existencias: 5,
};

describe("consolidarItem (carrito en cliente)", () => {
  it("agregar la misma variante dos veces → UNA línea con cantidad 2", () => {
    const conUno = consolidarItem([], base);
    const conDos = consolidarItem(conUno, base);
    expect(conDos).toHaveLength(1);
    expect(conDos[0].cantidad).toBe(2);
  });

  it("respeta el stock máximo por variante al consolidar", () => {
    let items = consolidarItem([], { ...base, cantidad: 4 });
    items = consolidarItem(items, { ...base, cantidad: 4 });
    expect(items).toHaveLength(1);
    expect(items[0].cantidad).toBe(5); // tope = max_existencias
  });

  it("también aplica el tope cuando el primer agregado ya excede el stock", () => {
    const items = consolidarItem([], { ...base, cantidad: 9 });
    expect(items[0].cantidad).toBe(5);
  });

  it("variantes distintas quedan en líneas separadas", () => {
    const conUno = consolidarItem([], base);
    const conOtra = consolidarItem(conUno, { ...base, variante_id: "var_2", largo: '22"' });
    expect(conOtra).toHaveLength(2);
  });

  it("consolidar refresca el tope conocido de la variante (stock puede cambiar)", () => {
    const conUno = consolidarItem([], { ...base, max_existencias: 5, cantidad: 3 });
    const actualizado = consolidarItem(conUno, { ...base, max_existencias: 3, cantidad: 1 });
    expect(actualizado[0].cantidad).toBe(3);
    expect(actualizado[0].max_existencias).toBe(3);
  });
});
