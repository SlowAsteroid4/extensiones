import { erroresPorCampo, requiereAdmin } from "@/modules/admin/guardia";
import { crearTestimonio, listarTestimoniosAdmin } from "@/modules/admin/testimonios";
import { testimonioCrearSchema } from "@/shared/validacion/schemas";

// H18: el panel ve todos los testimonios (activos e inactivos).
export async function GET() {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  return Response.json(await listarTestimoniosAdmin());
}

export async function POST(request: Request) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parseado = testimonioCrearSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json(
      { error: "Datos inválidos", errores: erroresPorCampo(parseado.error.issues) },
      { status: 400 }
    );
  }

  return Response.json(await crearTestimonio(parseado.data), { status: 201 });
}
