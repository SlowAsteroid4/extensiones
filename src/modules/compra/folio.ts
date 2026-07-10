// Folio corto (3.D.2): LS- + 6 alfanuméricos en mayúscula sin ambiguos (O/0/I/1).
import { randomInt } from "node:crypto";

// 24 letras (sin O ni I) + 8 dígitos (sin 0 ni 1) = 32 símbolos → 32^6 ≈ 1.07e9 folios.
export const ALFABETO_FOLIO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PATRON_FOLIO = /^LS-[A-HJ-NP-Z2-9]{6}$/;

export function generarFolio(aleatorio: (max: number) => number = randomInt): string {
  let sufijo = "";
  for (let i = 0; i < 6; i++) {
    sufijo += ALFABETO_FOLIO[aleatorio(ALFABETO_FOLIO.length)];
  }
  return `LS-${sufijo}`;
}
