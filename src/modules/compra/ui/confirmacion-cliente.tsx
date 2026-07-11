"use client";
// B4 · Confirmación de pedido (H06). Folio + resumen + ESTADO visible
// (pendiente / pagado_sandbox / rechazado — se actualiza al recargar tras
// `npm run simular-pago`). CTA de WhatsApp para coordinar la ENTREGA con el
// folio prellenado (única excepción a WhatsApp=dudas, regla 3.D).
// El carrito se limpia SOLO cuando el pago fue exitoso (H05).
import { useEffect } from "react";
import { Badge, type TonoBadge } from "@/shared/ui/datos";
import { Icono } from "@/shared/ui/icono";
import { AvisoSuperficie, BarraSuperior } from "@/shared/ui/producto";
import { BotonWhatsApp } from "@/modules/catalogo/ui/boton-whatsapp";
import { useCarrito } from "./carrito-contexto";
import { ResumenPedido, type LineaPedido } from "./resumen-pedido";

export interface PedidoConfirmacion {
  folio: string;
  estado: "pendiente" | "pagado_sandbox" | "rechazado";
  total_mxn: number;
  items: {
    cantidad: number;
    precio_unitario_congelado: number;
    variante: { id: string; largo_pulgadas: number; producto: { nombre_tono: string } };
  }[];
}

const ESTADOS: Record<PedidoConfirmacion["estado"], { etiqueta: string; tono: TonoBadge }> = {
  pendiente: { etiqueta: "Pago pendiente", tono: "accent" },
  pagado_sandbox: { etiqueta: "Pagado", tono: "success" },
  rechazado: { etiqueta: "Pago rechazado", tono: "unavailable" },
};

export function ConfirmacionCliente({ pedido }: { pedido: PedidoConfirmacion }) {
  const { totalPiezas, vaciar, listo } = useCarrito();

  // H05: limpiar el carrito SOLO en pago exitoso (pendiente y rechazado lo conservan).
  const pagado = pedido.estado === "pagado_sandbox";
  useEffect(() => {
    if (listo && pagado) vaciar();
  }, [listo, pagado, vaciar]);

  const lineas: LineaPedido[] = pedido.items.map((i) => ({
    clave: i.variante.id,
    nombre: i.variante.producto.nombre_tono,
    largo: `${i.variante.largo_pulgadas}"`,
    cantidad: i.cantidad,
    importe_mxn: i.cantidad * i.precio_unitario_congelado,
  }));
  const estado = ESTADOS[pedido.estado];

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="Confirmación" cartCount={pagado ? 0 : totalPiezas} backHref="/" />
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-[18px] p-4">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div
            className={[
              "flex h-16 w-16 items-center justify-center rounded-full",
              pedido.estado === "rechazado" ? "bg-error-surface" : "bg-success-surface",
            ].join(" ")}
          >
            <Icono
              name={pedido.estado === "rechazado" ? "x-circle" : "check"}
              size={30}
              color={pedido.estado === "rechazado" ? "var(--color-error)" : "var(--color-success)"}
            />
          </div>
          <h1 className="m-0 text-center text-[24px] font-extrabold text-text-strong">
            {pedido.estado === "rechazado" ? "Pedido con pago rechazado" : "¡Pedido confirmado!"}
          </h1>
          <span className="flex items-center gap-2 text-[14px] font-semibold text-text-muted">
            Folio <strong className="text-text-strong">{pedido.folio}</strong>
            <Badge tone={estado.tono}>{estado.etiqueta}</Badge>
          </span>
        </div>

        <ResumenPedido lineas={lineas} totalCentavos={pedido.total_mxn} />

        <AvisoSuperficie>
          Tu entrega se coordina por WhatsApp. Escríbenos con tu folio y acordamos fecha y lugar.
        </AvisoSuperficie>

        <BotonWhatsApp
          size="lg"
          etiqueta="Coordinar entrega por WhatsApp"
          mensaje={`Hola, quiero coordinar la entrega de mi pedido ${pedido.folio}.`}
        />
      </div>
    </div>
  );
}
