import { requiereAdmin } from "@/modules/admin/guardia";
import { obtenerPedidoAdminPorFolio } from "@/modules/admin/pedidos";

// T9 · Detalle admin por folio. A diferencia del GET público (H06), este SÍ
// expone email y teléfono de contacto: la clienta coordina la entrega.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folio: string }> }
) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  const { folio } = await params;
  const pedido = await obtenerPedidoAdminPorFolio(folio.toUpperCase());
  if (!pedido) {
    return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  return Response.json(pedido);
}
