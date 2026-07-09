/**
 * Slug para URLs: minúsculas, sin diacríticos (castaños → castanos), solo
 * [a-z0-9] separados por guiones.
 */
export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
