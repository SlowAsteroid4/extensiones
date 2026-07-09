import { describe, expect, it } from "vitest";
import { formatearPrecioMXN, pesosACentavos } from "./formatear";

describe("formatearPrecioMXN", () => {
  it("formatea pesos exactos sin decimales", () => {
    expect(formatearPrecioMXN(199000)).toBe("$1,990");
    expect(formatearPrecioMXN(349000)).toBe("$3,490");
  });

  it("formatea montos con centavos a dos decimales", () => {
    expect(formatearPrecioMXN(199050)).toBe("$1,990.50");
    expect(formatearPrecioMXN(1)).toBe("$0.01");
  });

  it("formatea el cero", () => {
    expect(formatearPrecioMXN(0)).toBe("$0");
  });

  it("usa separador de miles para montos grandes", () => {
    expect(formatearPrecioMXN(12345600)).toBe("$123,456");
  });

  it("rechaza montos no enteros", () => {
    expect(() => formatearPrecioMXN(199000.5)).toThrow(TypeError);
    expect(() => formatearPrecioMXN(NaN)).toThrow(TypeError);
  });

  it("rechaza montos negativos", () => {
    expect(() => formatearPrecioMXN(-100)).toThrow(RangeError);
  });
});

describe("pesosACentavos", () => {
  it("convierte pesos enteros y con decimales", () => {
    expect(pesosACentavos(1990)).toBe(199000);
    expect(pesosACentavos(1990.5)).toBe(199050);
  });

  it("redondea residuos de punto flotante", () => {
    expect(pesosACentavos(0.1 + 0.2)).toBe(30);
  });

  it("rechaza valores no finitos", () => {
    expect(() => pesosACentavos(Infinity)).toThrow(TypeError);
    expect(() => pesosACentavos(NaN)).toThrow(TypeError);
  });
});
