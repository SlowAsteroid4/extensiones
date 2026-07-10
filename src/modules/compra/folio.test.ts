import { describe, expect, it } from "vitest";
import { ALFABETO_FOLIO, PATRON_FOLIO, generarFolio } from "./folio";

describe("generarFolio (3.D.2)", () => {
  it("produce LS- + 6 alfanuméricos en mayúscula", () => {
    for (let i = 0; i < 500; i++) {
      expect(generarFolio()).toMatch(PATRON_FOLIO);
    }
  });

  it("el alfabeto excluye los ambiguos O/0/I/1", () => {
    for (const ambiguo of ["O", "0", "I", "1"]) {
      expect(ALFABETO_FOLIO).not.toContain(ambiguo);
    }
    expect(ALFABETO_FOLIO).toHaveLength(32);
  });

  it("es determinista con fuente de aleatoriedad inyectada", () => {
    expect(generarFolio(() => 0)).toBe("LS-AAAAAA");
    expect(generarFolio((max) => max - 1)).toBe("LS-999999");
  });
});
