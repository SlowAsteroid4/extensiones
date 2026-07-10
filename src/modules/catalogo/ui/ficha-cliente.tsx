"use client";
// A4 · Ficha de producto (H03, H10) — parte interactiva.
// Selector de largo con precio por variante; agotadas VISIBLES y no
// comprables; precio y existencias siguen a la variante seleccionada;
// agregar respeta stock; corazón → favorito optimista (sin sesión → C5).
import { useState } from "react";
import { Boton, BotonIcono } from "@/shared/ui/boton";
import { Precio } from "@/shared/ui/datos";
import { BarraSuperior, EncabezadoProducto, GaleriaProducto } from "@/shared/ui/producto";
import { SelectorVariantes } from "@/shared/ui/formularios";
import { formatearPrecioMXN } from "@/shared/precio/formatear";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";
import { useFavoritos } from "@/modules/cuenta/ui/favoritos-contexto";
import { EncabezadoConCarrito } from "./encabezado-con-carrito";
import { capitalizar, etiquetaLargo, productoAgotado, type FichaAPI } from "./tipos";

export function FichaCliente({ producto }: { producto: FichaAPI }) {
  const { agregar, totalPiezas } = useCarrito();
  const favoritos = useFavoritos();
  const primeraDisponible = producto.variantes.find((v) => v.existencias > 0);
  const [varianteId, setVarianteId] = useState<string | undefined>(
    primeraDisponible?.id ?? producto.variantes[0]?.id
  );
  const seleccionada = producto.variantes.find((v) => v.id === varianteId);
  const agotado = productoAgotado(producto);
  const sinCompra = !seleccionada || seleccionada.existencias === 0;

  const opciones = producto.variantes.map((v) => ({
    value: v.id,
    label: etiquetaLargo(v.largo_pulgadas),
    price: v.precio_mxn,
    soldOut: v.existencias === 0,
  }));

  const alAgregar = () => {
    if (!seleccionada || seleccionada.existencias === 0) return;
    agregar({
      variante_id: seleccionada.id,
      producto_slug: producto.slug,
      nombre_tono: producto.nombre_tono,
      largo: etiquetaLargo(seleccionada.largo_pulgadas),
      precio_mxn: seleccionada.precio_mxn,
      max_existencias: seleccionada.existencias,
      foto: producto.fotos[0],
    });
  };

  const infoPrincipal = (
    <>
      <EncabezadoProducto
        name={producto.nombre_tono}
        tipo={capitalizar(producto.tipo)}
        familia={capitalizar(producto.familia_tono)}
      />
      <div className="flex items-center gap-3">
        <Precio centavos={seleccionada?.precio_mxn ?? producto.variantes[0]?.precio_mxn ?? 0} size="lg" />
        <span
          className={[
            "text-[13px] font-semibold",
            seleccionada && seleccionada.existencias > 0 ? "text-success" : "text-error",
          ].join(" ")}
        >
          {seleccionada && seleccionada.existencias > 0
            ? `${seleccionada.existencias} disponibles`
            : "Sin existencias"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-eyebrow font-bold uppercase tracking-[0.08em] text-text-muted">Largo</span>
        <SelectorVariantes
          options={opciones}
          value={varianteId}
          onChange={setVarianteId}
          formatearPrecio={formatearPrecioMXN}
        />
      </div>
      {producto.descripcion && (
        <p className="m-0 text-[14px] font-medium leading-[1.55] text-text-muted">{producto.descripcion}</p>
      )}
      <div className="mt-1 flex items-center gap-2.5">
        <div className="flex-1">
          <Boton variant="primary" size="lg" fullWidth icon="cart" disabled={sinCompra} onClick={alAgregar}>
            Agregar al carrito
          </Boton>
        </div>
        <BotonIcono
          icon="heart"
          variant="tonal"
          size="lg"
          active={favoritos.esFavorito(producto.id)}
          filledWhenActive
          ariaLabel={
            favoritos.esFavorito(producto.id)
              ? `Quitar ${producto.nombre_tono} de favoritos`
              : `Guardar ${producto.nombre_tono} en favoritos`
          }
          onClick={() => void favoritos.alternar(producto.id, producto.nombre_tono)}
        />
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Mobile (390): barra superior ligera · Desktop (1280): StoreHeader */}
      <div className="lg:hidden">
        <BarraSuperior title={producto.nombre_tono} cartCount={totalPiezas} backHref="/" />
      </div>
      <EncabezadoConCarrito className="hidden lg:block" />

      {/* Mobile: columna única */}
      <div className="flex flex-col gap-4 p-4 lg:hidden">
        <GaleriaProducto category={producto.categoria.nombre} fotos={producto.fotos} soldOut={agotado} />
        {infoPrincipal}
      </div>

      {/* Desktop: galería 440 + info */}
      <div className="mx-auto hidden w-full max-w-[1200px] gap-10 p-8 lg:flex">
        <div className="w-[440px] shrink-0">
          <GaleriaProducto category={producto.categoria.nombre} fotos={producto.fotos} soldOut={agotado} />
        </div>
        <div className="flex min-w-0 max-w-[460px] flex-1 flex-col gap-[18px]">{infoPrincipal}</div>
      </div>
    </div>
  );
}
