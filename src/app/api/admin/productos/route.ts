import type { NextRequest } from "next/server";
import { erroresPorCampo, requiereAdmin } from "@/modules/admin/guardia";
import { crearProducto, listarProductosAdmin } from "@/modules/admin/productos";
import { productoCrearSchema } from "@/shared/validacion/schemas";

// H15: lista con buscador (el panel ve también inactivos).
export async function GET(request: NextRequest) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const productos = await listarProductosAdmin(q);
  return Response.json({ total: productos.length, productos });
}

// H15: crear producto con ≥1 variante; errores POR CAMPO.
export async function POST(request: Request) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parseado = productoCrearSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json(
      { error: "Datos inválidos", errores: erroresPorCampo(parseado.error.issues) },
      { status: 400 }
    );
  }

  const resultado = await crearProducto(parseado.data);
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  return Response.json(resultado.producto, { status: 201 });
}
