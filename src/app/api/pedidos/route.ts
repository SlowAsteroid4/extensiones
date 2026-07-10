import { crearPedido } from "@/modules/compra/pedidos";
import { obtenerProveedorPasarela } from "@/modules/compra/pasarela";
import { auth } from "@/shared/auth/config";
import { checkoutSchema } from "@/shared/validacion/schemas";

// H05: checkout. Invitada (sin sesión) o identificada — cuenta_id SOLO del token.
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parseado = checkoutSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json(
      { error: parseado.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const sesion = await auth();
  const resultado = await crearPedido(
    { ...parseado.data, cuenta_id: sesion?.user?.id },
    obtenerProveedorPasarela()
  );

  if (!resultado.ok) {
    return Response.json(
      { error: resultado.error, ...(resultado.detalles ? { detalles: resultado.detalles } : {}) },
      { status: resultado.status }
    );
  }
  return Response.json(resultado.pedido, { status: 201 });
}
