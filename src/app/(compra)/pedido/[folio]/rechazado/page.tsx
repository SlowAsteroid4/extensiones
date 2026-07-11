"use client";
// B3 · Retorno de pago rechazado (H05): sin cargo, el carrito NO se vació,
// siempre hay salida. back_urls.failure de MercadoPago apunta aquí.
import { EstadoVacio } from "@/shared/ui/feedback";
import { Boton } from "@/shared/ui/boton";
import { BarraSuperior } from "@/shared/ui/producto";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";

export default function PaginaPagoRechazado() {
  const { totalPiezas } = useCarrito();
  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="" cartCount={totalPiezas} backHref="/carrito" />
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 p-4">
        <div className="flex flex-1 items-center">
          <EstadoVacio
            icon="x-circle"
            title="Tu pago no pudo procesarse"
            message="Ningún cargo fue realizado y tu carrito sigue completo. Puedes intentarlo de nuevo."
            actionLabel="Intentar de nuevo"
            actionHref="/checkout"
          />
        </div>
        <Boton variant="secondary" fullWidth href="/carrito">
          Volver al carrito
        </Boton>
      </div>
    </div>
  );
}
