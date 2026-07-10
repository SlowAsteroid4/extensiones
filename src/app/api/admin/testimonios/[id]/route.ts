import { erroresPorCampo, requiereAdmin } from "@/modules/admin/guardia";
import { editarTestimonio, eliminarTestimonio } from "@/modules/admin/testimonios";
import { testimonioEditarSchema } from "@/shared/validacion/schemas";

// H18: edición (incluye toggle activo y orden).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parseado = testimonioEditarSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json(
      { error: "Datos inválidos", errores: erroresPorCampo(parseado.error.issues) },
      { status: 400 }
    );
  }

  const { id } = await params;
  const resultado = await editarTestimonio(id, parseado.data);
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  return Response.json(resultado.testimonio);
}

// H18: baja definitiva.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  const { id } = await params;
  const resultado = await eliminarTestimonio(id);
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  return Response.json({ eliminado: true });
}
