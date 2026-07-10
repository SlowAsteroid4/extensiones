import { notFound } from "next/navigation";
import { obtenerPedidoPorFolio } from "@/modules/compra/pedidos";
import {
  ConfirmacionCliente,
  type PedidoConfirmacion,
} from "@/modules/compra/ui/confirmacion-cliente";

// B4 · Confirmación (H06): pública por folio (acepta minúsculas), persiste al
// recargar sin doble cargo; el estado refleja la DB en cada visita.
export default async function PaginaPedido(props: { params: Promise<{ folio: string }> }) {
  const { folio } = await props.params;
  const pedido = await obtenerPedidoPorFolio(folio.toUpperCase());
  if (!pedido) notFound();

  const datos: PedidoConfirmacion = {
    folio: pedido.folio,
    estado: pedido.estado as PedidoConfirmacion["estado"],
    total_mxn: pedido.total_mxn,
    items: pedido.items.map((i) => ({
      cantidad: i.cantidad,
      precio_unitario_congelado: i.precio_unitario_congelado,
      variante: {
        id: i.variante.id,
        largo_pulgadas: i.variante.largo_pulgadas,
        producto: { nombre_tono: i.variante.producto.nombre_tono },
      },
    })),
  };

  return <ConfirmacionCliente pedido={datos} />;
}
