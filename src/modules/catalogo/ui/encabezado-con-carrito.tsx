"use client";
// StoreHeader con el contador REAL del carrito (badge del navbar, H04).
import { EncabezadoTienda } from "@/shared/ui/organismos";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";

export function EncabezadoConCarrito({ className }: { className?: string }) {
  const { totalPiezas } = useCarrito();
  return (
    <div className={className}>
      <EncabezadoTienda cartCount={totalPiezas} cartHref="/carrito" accountHref="/cuenta" />
    </div>
  );
}
