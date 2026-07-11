"use client";
// C4 · Mis favoritos (H11, H12): grid con corazón activo y persistencia REAL
// (GET /api/favoritos). Quitar es optimista con reversión (el grid se deriva
// de los ids del contexto: si la API falla, la card reaparece sola).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EstadoVacio, Esqueleto } from "@/shared/ui/feedback";
import { BarraSuperior, CardProducto } from "@/shared/ui/producto";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";
import { useFavoritos } from "./favoritos-contexto";
import {
  capitalizar,
  etiquetaLargo,
  productoAgotado,
  varianteRepresentativa,
  type FichaAPI,
} from "@/modules/catalogo/ui/tipos";

interface FavoritoAPI {
  producto_id: string;
  producto: {
    id: string;
    nombre_tono: string;
    slug: string;
    familia_tono: string;
    tipo: string;
    fotos: string[];
    activo: boolean;
    variantes: { largo_pulgadas: number; precio_mxn: number; existencias: number }[];
  };
}

export function FavoritosPagina() {
  const router = useRouter();
  const { totalPiezas, agregar } = useCarrito();
  const favoritos = useFavoritos();
  const [lista, setLista] = useState<FavoritoAPI[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/favoritos")
      .then((r) => {
        // Sesión expirada → login → regresa a favoritos (H12).
        if (r.status === 401) {
          router.push(`/login?volverA=${encodeURIComponent("/favoritos")}`);
          return null;
        }
        return r.ok ? (r.json() as Promise<FavoritoAPI[]>) : [];
      })
      .then((datos) => {
        if (!cancelado && datos) setLista(datos);
      })
      .catch(() => {
        if (!cancelado) setLista([]);
      });
    return () => {
      cancelado = true;
    };
  }, [router]);

  // El "+" de la card necesita la variante real: se consulta la ficha al momento
  // (el payload de favoritos no expone ids de variante).
  const agregarDesdeFavorito = async (slug: string) => {
    try {
      const respuesta = await fetch(`/api/productos/${slug}`);
      if (!respuesta.ok) return;
      const producto = (await respuesta.json()) as FichaAPI;
      const variante = varianteRepresentativa(producto);
      if (!variante || variante.existencias === 0) return;
      agregar({
        variante_id: variante.id,
        producto_slug: producto.slug,
        nombre_tono: producto.nombre_tono,
        largo: etiquetaLargo(variante.largo_pulgadas),
        precio_mxn: variante.precio_mxn,
        max_existencias: variante.existencias,
        foto: producto.fotos[0],
      });
    } catch {
      // sin conexión: el corazón/carrito no cambian
    }
  };

  // El grid se deriva de los ids vivos del contexto (optimista + reversión).
  const visibles = (lista ?? []).filter((f) => favoritos.ids.has(f.producto_id));

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="Mis favoritos" cartCount={totalPiezas} backHref="/" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 p-4">
        {lista === null ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {[0, 1].map((i) => (
              <Esqueleto key={i} variant="card" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="flex flex-1 items-center">
            <EstadoVacio
              icon="heart"
              title="Aún no guardas favoritos"
              message="Toca el corazón en cualquier tono para guardarlo aquí y encontrarlo fácil."
              actionLabel="Explorar el catálogo"
              actionHref="/"
            />
          </div>
        ) : (
          <>
            <span className="text-[13px] font-semibold text-text-muted">
              {visibles.length} {visibles.length === 1 ? "tono guardado" : "tonos guardados"}
            </span>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {visibles.map((f) => {
                const p = f.producto;
                const variante = varianteRepresentativa(p);
                return (
                  <CardProducto
                    key={p.id}
                    name={p.nombre_tono}
                    largo={variante ? etiquetaLargo(variante.largo_pulgadas) : undefined}
                    priceCentavos={variante?.precio_mxn ?? 0}
                    category={capitalizar(p.familia_tono)}
                    href={`/producto/${p.slug}`}
                    image={p.fotos[0]}
                    soldOut={productoAgotado(p)}
                    favorite
                    onFavorite={() => void favoritos.alternar(p.id, p.nombre_tono)}
                    onAdd={() => void agregarDesdeFavorito(p.slug)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
