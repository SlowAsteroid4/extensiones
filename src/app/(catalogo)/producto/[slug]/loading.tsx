"use client";
// A4 · estado de carga de la ficha (skeleton del DS).
import { Esqueleto } from "@/shared/ui/feedback";
import { BarraSuperior } from "@/shared/ui/producto";

export default function CargandoFicha() {
  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="" backHref="/" />
      <div className="p-4">
        <Esqueleto variant="ficha" />
      </div>
    </div>
  );
}
