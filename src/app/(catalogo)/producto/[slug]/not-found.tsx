"use client";
// A5 · Producto no disponible (H03, H19): sin callejones — siempre hay salida.
import { EstadoVacio } from "@/shared/ui/feedback";
import { BarraSuperior } from "@/shared/ui/producto";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";

export default function ProductoNoDisponible() {
  const { totalPiezas } = useCarrito();
  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="" cartCount={totalPiezas} backHref="/catalogo" />
      <div className="flex flex-1 items-center p-4">
        <EstadoVacio
          icon="alert"
          title="Este producto ya no está disponible"
          message="Puede que lo hayamos retirado o agotado. Explora el resto del catálogo."
          actionLabel="Ver el catálogo"
          actionHref="/catalogo"
        />
      </div>
    </div>
  );
}
