import { erroresPorCampo, requiereAdmin } from "@/modules/admin/guardia";
import { editarProducto } from "@/modules/admin/productos";
import { productoEditarSchema } from "@/shared/validacion/schemas";

// H16/H19: edición parcial (campos base + variantes) y toggle activo.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parseado = productoEditarSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json(
      { error: "Datos inválidos", errores: erroresPorCampo(parseado.error.issues) },
      { status: 400 }
    );
  }

  const { id } = await params;
  const resultado = await editarProducto(id, parseado.data);
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  return Response.json(resultado.producto);
}
