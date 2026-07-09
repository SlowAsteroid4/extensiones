// familia_tono es un "enum editable" (spec §2): la lista vive aquí, no en Postgres,
// para poder editarla sin migración. En piloto: 5 familias de muestra.
export const FAMILIAS_TONO = [
  "rubios",
  "castaños",
  "negros",
  "rojizos",
  "mechas",
] as const;

export type FamiliaTono = (typeof FAMILIAS_TONO)[number];

// Largos disponibles para variantes, en PULGADAS (resolución de la mesa en T4).
export const LARGOS_DISPONIBLES = [18, 20, 22, 24] as const;
export type LargoDisponible = (typeof LARGOS_DISPONIBLES)[number];
