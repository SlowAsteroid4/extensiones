"use client";
// A1/A2/A3 · Home/Catálogo, categoría y filtros (H01, H02, H13, H14).
// Cableado real al backend:
//   · grid: GET /api/productos?familia&tipo&largo&q&categoria (AND estricto)
//   · filtros: SOLO valores existentes vía GET /api/productos/facetas
//   · testimonios: GET /api/testimonios (la sección se oculta si no hay)
// Patrones cerrados: skeleton → modal de error a los 15 s · chips deshabilitados
// + toast si fallan las opciones · empty states con CTA · contador en vivo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EstadoVacio, Esqueleto, Modal, Toast, ToastDock } from "@/shared/ui/feedback";
import {
  BuscadorTono,
  CardProducto,
  FilaAccesoFiltros,
  GrupoFiltros,
  SeccionTestimonios,
  type GrupoFiltro,
} from "@/shared/ui/producto";
import { HojaFiltros } from "@/shared/ui/organismos";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";
import { useFavoritos } from "@/modules/cuenta/ui/favoritos-contexto";
import {
  capitalizar,
  etiquetaLargo,
  productoAgotado,
  varianteRepresentativa,
  type FacetasAPI,
  type ProductoAPI,
  type TestimonioAPI,
} from "./tipos";

const TIMEOUT_CATALOGO_MS = 15_000;
const CLAVES_FILTRO = ["familia", "tipo", "largo", "q"] as const;
type ClaveFiltro = (typeof CLAVES_FILTRO)[number];
type Filtros = Partial<Record<ClaveFiltro, string>>;

function filtrosDesdeParams(params: URLSearchParams): Filtros {
  const filtros: Filtros = {};
  for (const clave of CLAVES_FILTRO) {
    const valor = params.get(clave);
    if (valor) filtros[clave] = valor;
  }
  return filtros;
}

function queryDeFiltros(filtros: Filtros, categoria?: string): string {
  const params = new URLSearchParams();
  for (const clave of CLAVES_FILTRO) {
    const valor = filtros[clave];
    if (valor) params.set(clave, valor);
  }
  if (categoria) params.set("categoria", categoria);
  return params.toString();
}

/** Selección de la UI (Record<grupo, string[]>) ↔ filtros de la API (un valor
    por grupo: el contrato de /api/productos recibe UN familia/tipo/largo). */
function seleccionDeFiltros(filtros: Filtros): Record<string, string[]> {
  return {
    familia: filtros.familia ? [filtros.familia] : [],
    tipo: filtros.tipo ? [filtros.tipo] : [],
    largo: filtros.largo ? [filtros.largo] : [],
  };
}

type EstadoProductos =
  | { estado: "cargando" }
  | { estado: "error" }
  | { estado: "ok"; lista: ProductoAPI[]; total: number };

export function CatalogoCliente({
  categoria,
  titulo,
  tituloSoloEscritorio = false,
  conTestimonios = false,
}: {
  /** slug de categoría (A2); ausente en home (A1) */
  categoria?: string;
  /** título visible: "Todo el catálogo" en desktop-home, nombre de la categoría en A2 */
  titulo?: string;
  /** A1 mobile no lleva título; A1 desktop sí ("Todo el catálogo") */
  tituloSoloEscritorio?: boolean;
  conTestimonios?: boolean;
}) {
  const router = useRouter();
  const rutaActual = usePathname();
  const searchParams = useSearchParams();
  const filtros = useMemo(() => filtrosDesdeParams(new URLSearchParams(searchParams)), [searchParams]);

  const { agregar } = useCarrito();
  const favoritos = useFavoritos();

  // Resultado atado a su clave de consulta: "cargando" es estado DERIVADO
  // (clave distinta a la actual), no un setState síncrono dentro del effect.
  const [resultado, setResultado] = useState<
    { clave: string; lista: ProductoAPI[]; total: number } | { clave: string; error: true } | null
  >(null);
  const [reintento, setReintento] = useState(0);
  const [facetas, setFacetas] = useState<FacetasAPI | null>(null);
  const [facetasError, setFacetasError] = useState(false);
  const [reintentoFacetas, setReintentoFacetas] = useState(0);
  const [testimonios, setTestimonios] = useState<TestimonioAPI[]>([]);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [pendientes, setPendientes] = useState<Filtros>({});
  const [conteoVivo, setConteoVivo] = useState<number | null>(null);
  const [sugerencias, setSugerencias] = useState<string[]>([]);

  const claveConsulta = queryDeFiltros(filtros, categoria);

  // ── Grid: GET /api/productos (skeleton → modal de error a los 15 s) ──
  useEffect(() => {
    let cancelado = false;
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), TIMEOUT_CATALOGO_MS);
    fetch(`/api/productos?${claveConsulta}`, { signal: control.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/productos → ${r.status}`);
        return r.json() as Promise<{ total: number; productos: ProductoAPI[] }>;
      })
      .then((datos) => {
        if (!cancelado) setResultado({ clave: claveConsulta, lista: datos.productos, total: datos.total });
      })
      .catch(() => {
        if (!cancelado) setResultado({ clave: claveConsulta, error: true });
      })
      .finally(() => clearTimeout(temporizador));
    return () => {
      cancelado = true;
      control.abort();
      clearTimeout(temporizador);
    };
  }, [claveConsulta, reintento]);

  const productos: EstadoProductos =
    !resultado || resultado.clave !== claveConsulta
      ? { estado: "cargando" }
      : "error" in resultado
        ? { estado: "error" }
        : { estado: "ok", lista: resultado.lista, total: resultado.total };

  const reintentarProductos = () => {
    setResultado(null); // vuelve al skeleton
    setReintento((n) => n + 1);
  };

  // ── Facetas: opciones EXISTENTES (nunca hardcodeadas) ──
  useEffect(() => {
    let cancelado = false;
    fetch("/api/productos/facetas")
      .then((r) => {
        if (!r.ok) throw new Error(`facetas → ${r.status}`);
        return r.json() as Promise<FacetasAPI>;
      })
      .then((datos) => {
        if (!cancelado) setFacetas(datos);
      })
      .catch(() => {
        if (!cancelado) setFacetasError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [reintentoFacetas]);

  const reintentarFacetas = () => {
    setFacetasError(false);
    setReintentoFacetas((n) => n + 1);
  };

  useEffect(() => {
    if (!conTestimonios) return;
    fetch("/api/testimonios")
      .then((r) => (r.ok ? (r.json() as Promise<TestimonioAPI[]>) : []))
      .then((lista) => setTestimonios(Array.isArray(lista) ? lista : []))
      .catch(() => setTestimonios([]));
  }, [conTestimonios]);

  const grupos: GrupoFiltro[] = useMemo(() => {
    if (!facetas) return [];
    return [
      {
        key: "familia",
        label: "Familia de tono",
        options: facetas.familias.map((f) => ({ value: f, label: capitalizar(f) })),
      },
      { key: "tipo", label: "Tipo", options: facetas.tipos.map((t) => ({ value: t, label: capitalizar(t) })) },
      {
        key: "largo",
        label: "Largo",
        options: facetas.largos.map((l) => ({ value: String(l), label: etiquetaLargo(l) })),
      },
    ];
  }, [facetas]);

  const aplicarFiltros = useCallback(
    (siguientes: Filtros) => {
      const query = queryDeFiltros(siguientes);
      router.replace(query ? `${rutaActual}?${query}` : rutaActual, { scroll: false });
    },
    [router, rutaActual]
  );

  // Un valor por grupo (contrato): tocar el chip activo lo apaga, otro lo reemplaza.
  const alternarSeleccion = (actual: Filtros, clave: ClaveFiltro, opcion: string): Filtros => {
    const siguiente = { ...actual };
    if (siguiente[clave] === opcion) delete siguiente[clave];
    else siguiente[clave] = opcion;
    return siguiente;
  };

  // ── Hoja de filtros (mobile): selección pendiente + contador en vivo ──
  const abrirHoja = () => {
    setPendientes(filtros);
    setConteoVivo(productos.estado === "ok" ? productos.total : null);
    setSugerencias([]);
    setHojaAbierta(true);
  };

  useEffect(() => {
    if (!hojaAbierta) return;
    const control = new AbortController();
    const temporizador = setTimeout(() => {
      fetch(`/api/productos?${queryDeFiltros(pendientes, categoria)}`, { signal: control.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ total: number }>) : null))
        .then((datos) => datos && setConteoVivo(datos.total))
        .catch(() => {});
    }, 250);
    return () => {
      control.abort();
      clearTimeout(temporizador);
    };
  }, [hojaAbierta, pendientes, categoria]);

  // Buscador de tono: sugerencias reales (nombres que coinciden con q).
  useEffect(() => {
    const control = new AbortController();
    const temporizador = setTimeout(() => {
      if (!hojaAbierta || !pendientes.q) {
        setSugerencias([]);
        return;
      }
      fetch(`/api/productos?${queryDeFiltros({ q: pendientes.q }, categoria)}`, { signal: control.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ productos: ProductoAPI[] }>) : null))
        .then((datos) => {
          if (!datos) return;
          const nombres = [...new Set(datos.productos.map((p) => p.nombre_tono))].slice(0, 5);
          setSugerencias(nombres);
        })
        .catch(() => {});
    }, 250);
    return () => {
      control.abort();
      clearTimeout(temporizador);
    };
  }, [hojaAbierta, pendientes.q, categoria]);

  const hayFiltrosActivos = CLAVES_FILTRO.some((clave) => !!filtros[clave]);

  const agregarAlCarrito = (p: ProductoAPI) => {
    const variante = varianteRepresentativa(p);
    if (!variante || variante.existencias === 0) return;
    agregar({
      variante_id: variante.id,
      producto_slug: p.slug,
      nombre_tono: p.nombre_tono,
      largo: etiquetaLargo(variante.largo_pulgadas),
      precio_mxn: variante.precio_mxn,
      max_existencias: variante.existencias,
      foto: p.fotos[0],
    });
  };

  const grid = (columnas: string) =>
    productos.estado === "ok" ? (
      <div className={`grid gap-3 lg:gap-5 ${columnas}`}>
        {productos.lista.map((p) => {
          const variante = varianteRepresentativa(p);
          return (
            <CardProducto
              key={p.id}
              name={p.nombre_tono}
              largo={variante ? etiquetaLargo(variante.largo_pulgadas) : undefined}
              priceCentavos={variante?.precio_mxn ?? 0}
              category={p.categoria.nombre}
              categoryHref={`/categoria/${p.categoria.slug}`}
              href={`/producto/${p.slug}`}
              image={p.fotos[0]}
              soldOut={productoAgotado(p)}
              favorite={favoritos.esFavorito(p.id)}
              onFavorite={() => void favoritos.alternar(p.id, p.nombre_tono)}
              onAdd={() => agregarAlCarrito(p)}
            />
          );
        })}
      </div>
    ) : (
      <div className={`grid gap-3 lg:gap-5 ${columnas}`}>
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} variant="card" />
        ))}
      </div>
    );

  const estadoVacio =
    productos.estado === "ok" && productos.lista.length === 0 ? (
      hayFiltrosActivos ? (
        <EstadoVacio
          icon="search"
          title="No encontramos productos con esa combinación"
          message="Prueba con menos filtros o cambia el largo."
          actionLabel="Limpiar filtros"
          onAction={() => aplicarFiltros({})}
        />
      ) : (
        <EstadoVacio
          icon="search"
          title="Aún no hay productos en esta categoría"
          message="Estamos surtiendo más tonos. Mientras, mira todo lo disponible."
          actionLabel="Ver todo el catálogo"
          actionHref="/"
        />
      )
    ) : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Sidebar de filtros (desktop 1280 — A1Desktop): aplica al toque */}
      <aside className="hidden w-[260px] shrink-0 flex-col gap-4 lg:flex">
        <span className="text-eyebrow font-bold uppercase tracking-[0.08em] text-text-muted">Filtrar</span>
        <BuscadorTono
          value={filtros.q ?? ""}
          onChange={(v) => aplicarFiltros({ ...filtros, q: v || undefined })}
        />
        {facetas && !facetasError && (
          <GrupoFiltros
            groups={grupos}
            selected={seleccionDeFiltros(filtros)}
            resultCount={productos.estado === "ok" ? productos.total : null}
            onToggle={(clave, opcion) =>
              aplicarFiltros(alternarSeleccion(filtros, clave as ClaveFiltro, opcion))
            }
            onClear={() => aplicarFiltros({})}
          />
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {titulo && (
          <div className={["flex items-baseline justify-between", tituloSoloEscritorio ? "hidden lg:flex" : ""].join(" ")}>
            <h2 className="m-0 text-h2 font-extrabold text-text-strong">{titulo}</h2>
            {productos.estado === "ok" && (
              <span className="text-[13px] font-semibold text-text-muted">
                {productos.total} {productos.total === 1 ? "producto" : "productos"}
              </span>
            )}
          </div>
        )}

        {/* Acceso a filtros (mobile) */}
        <div className="lg:hidden">
          <FilaAccesoFiltros onOpen={abrirHoja} active={seleccionDeFiltros(filtros)} />
        </div>

        {estadoVacio ?? grid("grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}

        {conTestimonios && <SeccionTestimonios testimonios={testimonios} />}
      </div>

      {/* A1 · error a los 15 s → modal con salida */}
      {productos.estado === "error" && (
        <Modal
          variant="error"
          title="No pudimos cargar el catálogo"
          primaryLabel="Reintentar"
          onPrimary={reintentarProductos}
          secondaryLabel="Volver al inicio"
          onSecondary={() => router.push("/")}
        >
          Revisa tu conexión e inténtalo otra vez.
        </Modal>
      )}

      {/* A3 · hoja de filtros (mobile) con buscador de tono y contador en vivo */}
      <HojaFiltros
        open={hojaAbierta}
        groups={grupos}
        selected={seleccionDeFiltros(pendientes)}
        resultCount={conteoVivo}
        onToggle={(clave, opcion) =>
          setPendientes((prev) => alternarSeleccion(prev, clave as ClaveFiltro, opcion))
        }
        onClear={() => setPendientes({})}
        onApply={() => {
          aplicarFiltros(pendientes);
          setHojaAbierta(false);
        }}
        onClose={() => setHojaAbierta(false)}
      >
        <div className="mb-4">
          <BuscadorTono
            value={pendientes.q ?? ""}
            results={sugerencias}
            onChange={(v) => setPendientes((prev) => ({ ...prev, q: v || undefined }))}
            onPick={(nombre) => {
              setPendientes((prev) => ({ ...prev, q: nombre }));
              setSugerencias([]);
            }}
          />
        </div>
      </HojaFiltros>

      {/* A3 · falla al cargar opciones → toast con reintento */}
      {facetasError && hojaAbierta && (
        <ToastDock>
          <Toast
            tone="error"
            message="No pudimos cargar los filtros. Inténtalo otra vez."
            actionLabel="Reintentar"
            onAction={reintentarFacetas}
            onClose={() => setFacetasError(false)}
          />
        </ToastDock>
      )}
    </div>
  );
}
