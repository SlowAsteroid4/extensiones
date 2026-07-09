import { listarCategorias } from "@/modules/catalogo/consultas";

// H01: categorías ordenadas por `orden`.
export async function GET() {
  return Response.json(await listarCategorias());
}
