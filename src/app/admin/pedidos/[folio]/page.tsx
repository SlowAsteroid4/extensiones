import { PedidoDetalle } from "@/modules/admin/ui/pedidos-admin";

// T9 · Detalle de pedido con contacto de la compradora y CTA de WhatsApp
// (coordinación de entrega — excepción única autorizada).
export default async function PaginaAdminPedidoDetalle({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  return <PedidoDetalle folio={folio.toUpperCase()} />;
}
