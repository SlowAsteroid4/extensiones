import { obtenerFacetas } from "@/modules/catalogo/consultas";

// H02: los filtros solo ofrecen valores existentes en el catálogo activo.
export async function GET() {
  return Response.json(await obtenerFacetas());
}
