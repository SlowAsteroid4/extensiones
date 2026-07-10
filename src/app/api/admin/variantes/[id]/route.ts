import { erroresPorCampo, requiereAdmin } from "@/modules/admin/guardia";
import { actualizarVariante } from "@/modules/admin/productos";
import { varianteRapidaSchema } from "@/shared/validacion/schemas";

// H17: actualización rápida de existencias/precio por variante.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parseado = varianteRapidaSchema.safeParse(cuerpo);
  if (!parseado.success) {
    // Valor inválido → 400 SIN sobreescribir (H17).
    return Response.json(
      { error: "Datos inválidos", errores: erroresPorCampo(parseado.error.issues) },
      { status: 400 }
    );
  }

  const { id } = await params;
  const resultado = await actualizarVariante(id, parseado.data);
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  return Response.json(resultado.variante);
}
