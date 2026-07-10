"use client";
// Tarjeta "Tu pedido" (composición del diseño B2/B4): líneas nombre · largo →
// precio + total. `errores` pinta el error POR ITEM de la API bajo su fila.
import { Divider, Precio } from "@/shared/ui/datos";
import { formatearPrecioMXN } from "@/shared/precio/formatear";

export interface LineaPedido {
  clave: string;
  nombre: string;
  largo: string;
  cantidad: number;
  /** total de la línea en centavos */
  importe_mxn: number;
  error?: string;
}

export function ResumenPedido({ lineas, totalCentavos }: { lineas: LineaPedido[]; totalCentavos: number }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-surface-muted p-4">
      <span className="text-eyebrow font-bold uppercase tracking-[0.08em] text-text-muted">Tu pedido</span>
      {lineas.map((l) => (
        <div key={l.clave} className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[14px] font-medium text-text-muted">
            <span>
              {l.nombre} · {l.largo}
              {l.cantidad > 1 ? ` × ${l.cantidad}` : ""}
            </span>
            <span className="font-semibold text-text-strong">{formatearPrecioMXN(l.importe_mxn)}</span>
          </div>
          {l.error && <span className="text-[13px] font-semibold text-error">{l.error}</span>}
        </div>
      ))}
      <Divider className="my-1" />
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-extrabold text-text-strong">Total</span>
        <Precio centavos={totalCentavos} size="lg" />
      </div>
    </div>
  );
}
