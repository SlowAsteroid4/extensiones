import { obtenerPedidoPorFolio } from "@/modules/compra/pedidos";

// H06: consulta pública por folio — solo lectura, N consultas sin efectos.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folio: string }> }
) {
  const { folio } = await params;
  const pedido = await obtenerPedidoPorFolio(folio.toUpperCase());
  if (!pedido) {
    return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  return Response.json(pedido);
}
