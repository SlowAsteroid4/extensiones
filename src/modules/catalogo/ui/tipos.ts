// Tipos del payload del API de catálogo (contrato T4, probado) + helpers de
// presentación compartidos por home, categoría y ficha.

export interface VarianteAPI {
  id: string;
  largo_pulgadas: number;
  precio_mxn: number; // centavos
  existencias: number;
  sku: string;
}

export interface ProductoAPI {
  id: string;
  nombre_tono: string;
  slug: string;
  familia_tono: string;
  tipo: string;
  fotos: string[];
  categoria: { id: string; nombre: string; slug: string };
  variantes: VarianteAPI[];
}

export interface FichaAPI extends ProductoAPI {
  descripcion: string;
}

export interface FacetasAPI {
  familias: string[];
  tipos: string[];
  largos: number[];
}

export interface TestimonioAPI {
  id: string;
  nombre: string;
  texto: string;
  orden: number;
}

/** "rubios" → "Rubios" (los datos del seed van en minúsculas; el diseño los
    presenta capitalizados). */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** 20 → `20"` (etiqueta de largo del diseño). */
export function etiquetaLargo(pulgadas: number): string {
  return `${pulgadas}"`;
}

/** Agotado real: TODAS las variantes en cero (el badge nunca se oculta). */
export function productoAgotado(p: { variantes: { existencias: number }[] }): boolean {
  return p.variantes.length > 0 && p.variantes.every((v) => v.existencias === 0);
}

/** Variante representativa para la card (primera disponible; si no hay, la
    primera): define largo y precio mostrados y qué agrega el "+". */
export function varianteRepresentativa<V extends { existencias: number }>(p: {
  variantes: V[];
}): V | null {
  if (p.variantes.length === 0) return null;
  return p.variantes.find((v) => v.existencias > 0) ?? p.variantes[0];
}
