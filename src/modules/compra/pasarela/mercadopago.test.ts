// Unit del mapeo de estados (función pura). El adapter completo queda para la
// Fase B (requiere credenciales reales de sandbox).
import { describe, expect, it } from "vitest";
import { mapearEstadoMP } from "./mercadopago";

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
