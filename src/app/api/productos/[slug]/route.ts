import { obtenerProductoPorSlug } from "@/modules/catalogo/consultas";

// H03: ficha por slug con TODAS las variantes (agotadas visibles);
// inactivo o inexistente → 404.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const producto = await obtenerProductoPorSlug(slug);
  if (!producto) {
    return Response.json({ error: "Producto no encontrado" }, { status: 404 });
  }
  return Response.json(producto);
}
