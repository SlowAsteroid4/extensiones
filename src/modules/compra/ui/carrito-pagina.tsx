"use client";
// B1 · Carrito (H04, H19). Recalcula al instante; persiste (localStorage);
// al entrar revalida cada item contra la API real: producto desactivado →
// "Ya no disponible" · variante sin stock → "Sin existencias" · cantidad >
// stock → error en la fila. "Pagar" queda BLOQUEADO hasta ajustar.
import { useEffect, useMemo, useState } from "react";
import { EstadoVacio } from "@/shared/ui/feedback";
import { Divider } from "@/shared/ui/datos";
import { BarraSuperior, FilaCarrito, ResumenTotales } from "@/shared/ui/producto";
import { useRouter } from "next/navigation";
import type { FichaAPI } from "@/modules/catalogo/ui/tipos";
import { useCarrito } from "./carrito-contexto";

interface ChequeoItem {
  /** badge de fila no comprable: "Ya no disponible" | "Sin existencias" */
  noDisponible?: string;
  /** error inline cuando la cantidad supera el stock real */
  error?: string;
  /** stock real para ajustar el tope del stepper */
  maxReal?: number;
}

export function CarritoPagina() {
  const router = useRouter();
  const { items, totalPiezas, cambiarCantidad, quitar, listo } = useCarrito();
  const [chequeos, setChequeos] = useState<Record<string, ChequeoItem>>({});

  // Revalidación real contra la API (una consulta por producto distinto).
  useEffect(() => {
    if (!listo || items.length === 0) return;
    let cancelado = false;
    const slugs = [...new Set(items.map((i) => i.producto_slug))];
    Promise.all(
      slugs.map(async (slug) => {
        const respuesta = await fetch(`/api/productos/${slug}`).catch(() => null);
        return { slug, producto: respuesta?.ok ? ((await respuesta.json()) as FichaAPI) : null };
      })
    ).then((resultados) => {
      if (cancelado) return;
      const porSlug = new Map(resultados.map((r) => [r.slug, r.producto]));
      const nuevos: Record<string, ChequeoItem> = {};
      for (const item of items) {
        const producto = porSlug.get(item.producto_slug);
        if (producto === null) {
          // 404: producto desactivado o retirado
          nuevos[item.variante_id] = { noDisponible: "Ya no disponible" };
          continue;
        }
        const variante = producto?.variantes.find((v) => v.id === item.variante_id);
        if (!variante) {
          nuevos[item.variante_id] = { noDisponible: "Ya no disponible" };
        } else if (variante.existencias === 0) {
          nuevos[item.variante_id] = { noDisponible: "Sin existencias" };
        } else if (item.cantidad > variante.existencias) {
          nuevos[item.variante_id] = {
            error: "Sin existencias disponibles",
            maxReal: variante.existencias,
          };
        } else {
          nuevos[item.variante_id] = { maxReal: variante.existencias };
        }
      }
      setChequeos(nuevos);
    });
    return () => {
      cancelado = true;
    };
  }, [listo, items]);

  const hayNoDisponible = items.some((i) => chequeos[i.variante_id]?.noDisponible);
  const hayStockInsuficiente = items.some((i) => {
    const c = chequeos[i.variante_id];
    return !c?.noDisponible && c?.maxReal !== undefined && i.cantidad > c.maxReal;
  });
  const bloqueado = hayNoDisponible || hayStockInsuficiente;
  const motivoBloqueo = hayNoDisponible
    ? "Un producto ya no está disponible. Quítalo para continuar"
    : "Quita el artículo sin existencias para continuar";

  const subtotalComprable = useMemo(
    () =>
      items
        .filter((i) => !chequeos[i.variante_id]?.noDisponible)
        .reduce((s, i) => s + i.cantidad * i.precio_mxn, 0),
    [items, chequeos]
  );

  if (!listo) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BarraSuperior title="Tu carrito" cartCount={0} backHref="/" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="Tu carrito" cartCount={totalPiezas} backHref="/" />
      {items.length === 0 ? (
        <div className="flex flex-1 items-center p-4">
          <EstadoVacio
            icon="cart"
            title="Tu carrito está vacío"
            message="Explora nuestros tonos y agrega tus favoritos para empezar."
            actionLabel="Explorar el catálogo"
            actionHref="/"
          />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col">
            {items.map((item, indice) => {
              const chequeo = chequeos[item.variante_id] ?? {};
              return (
                <div key={item.variante_id}>
                  {indice > 0 && <Divider />}
                  <FilaCarrito
                    name={item.nombre_tono}
                    largo={item.largo}
                    priceCentavos={item.precio_mxn}
                    qty={item.cantidad}
                    image={item.foto}
                    unavailable={!!chequeo.noDisponible}
                    unavailableLabel={chequeo.noDisponible}
                    errorText={chequeo.error}
                    maxStock={chequeo.maxReal ?? item.max_existencias}
                    onQty={(v) => cambiarCantidad(item.variante_id, v)}
                    onRemove={() => quitar(item.variante_id)}
                  />
                </div>
              );
            })}
          </div>
          <ResumenTotales
            lines={[
              {
                label: `Subtotal (${totalPiezas} ${totalPiezas === 1 ? "artículo" : "artículos"})`,
                value: subtotalComprable,
              },
              { label: "Envío", value: "Se coordina por WhatsApp" },
            ]}
            totalCentavos={subtotalComprable}
            ctaLabel="Pagar"
            blocked={bloqueado}
            blockedReason={bloqueado ? motivoBloqueo : undefined}
            onPay={() => router.push("/checkout")}
          />
        </div>
      )}
    </div>
  );
}
