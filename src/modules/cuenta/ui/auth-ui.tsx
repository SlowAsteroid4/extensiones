"use client";
// Composición compartida de las pantallas de acceso (C1/C2): barra superior
// ligera + wordmark + título centrado, como en el diseño.
import type { ReactNode } from "react";
import { BarraSuperior } from "@/shared/ui/producto";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";

export function EncabezadoAuth({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 pt-2">
      <span className="text-[20px] font-extrabold tracking-[-0.01em] text-primario">Lizzy &amp; Stephy</span>
      <span className="text-eyebrow font-bold uppercase tracking-[0.12em] text-text-subtle">Extensiones</span>
      <h1 className="mb-0.5 mt-3 text-center text-[24px] font-extrabold text-text-strong">{title}</h1>
      {sub && <span className="text-center text-[14px] font-medium text-text-muted">{sub}</span>}
    </div>
  );
}

export function MarcoAuth({ children }: { children: ReactNode }) {
  const { totalPiezas } = useCarrito();
  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="" cartCount={totalPiezas} backHref="/catalogo" />
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-[18px] p-5">{children}</div>
    </div>
  );
}
