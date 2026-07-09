import type { NextRequest } from "next/server";
import { listarProductos } from "@/modules/catalogo/consultas";
import { filtrosCatalogoSchema } from "@/shared/validacion/schemas";

const CLAVES_FILTRO = ["familia", "tipo", "largo", "q", "categoria"] as const;

// H01/H02: solo activos; filtros en AND estricto; 0 resultados = lista vacía.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const crudos: Record<string, string> = {};
  for (const clave of CLAVES_FILTRO) {
    const valor = query.get(clave);
    if (valor !== null) crudos[clave] = valor;
  }

  const parseado = filtrosCatalogoSchema.safeParse(crudos);
  if (!parseado.success) {
    return Response.json(
      { error: parseado.error.issues[0]?.message ?? "Filtros inválidos" },
      { status: 400 }
    );
  }

  const productos = await listarProductos(parseado.data);
  return Response.json({ total: productos.length, productos });
}
