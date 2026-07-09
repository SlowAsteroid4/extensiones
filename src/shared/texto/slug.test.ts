import { describe, expect, it } from "vitest";
import { slugificar } from "./slug";

describe("slugificar", () => {
  it("convierte a minúsculas con guiones", () => {
    expect(slugificar("Rubio Dorado Miel")).toBe("rubio-dorado-miel");
  });

  it("elimina diacríticos (ñ, acentos)", () => {
    expect(slugificar("Castaño Café Moka")).toBe("castano-cafe-moka");
    expect(slugificar("Negro Ónix")).toBe("negro-onix");
  });

  it("colapsa símbolos y espacios múltiples en un guion", () => {
    expect(slugificar("Mechas  Chocolate & Miel")).toBe("mechas-chocolate-miel");
  });

  it("recorta guiones en los extremos", () => {
    expect(slugificar("  ¡Rubio!  ")).toBe("rubio");
  });
});
