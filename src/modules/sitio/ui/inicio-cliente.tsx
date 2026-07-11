"use client";
// Inicio (landing de marketing): hero, propuesta de valor, catálogo
// destacado (real, GET /api/productos recortado), testimonios (GET
// /api/testimonios, sección oculta si vacía), historia (teaser) y ayuda por
// WhatsApp. Portado de claude_design (site-inicio.jsx) a componentes reales
// del DS + datos reales del backend (T4/T6).
import { useEffect, useState } from "react";
import { Esqueleto } from "@/shared/ui/feedback";
import { Boton } from "@/shared/ui/boton";
import { CardProducto, CardTestimonio } from "@/shared/ui/producto";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";
import { useFavoritos } from "@/modules/cuenta/ui/favoritos-contexto";
import { etiquetaLargo, productoAgotado, varianteRepresentativa, type ProductoAPI, type TestimonioAPI } from "@/modules/catalogo/ui/tipos";
import { EncabezadoSitio, PieSitio, BandaAyudaWhatsApp } from "./chrome";
import { Seccion, Marbete, CabezaSeccion, BloqueFoto, TarjetaValor } from "./secciones";
import { BotonWhatsApp } from "@/modules/catalogo/ui/boton-whatsapp";

const CANTIDAD_DESTACADOS = 4;

function Hero() {
  return (
    <Seccion bg="bg-surface-muted" pad="py-10 lg:py-16">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="flex max-w-[520px] flex-col gap-5">
          <Marbete>Extensiones de cabello</Marbete>
          <h1 className="m-0 text-[32px] font-extrabold leading-[1.08] tracking-[-0.02em] text-text-strong sm:text-[40px] lg:text-[48px]">
            Tu tono perfecto, en tu cabello
          </h1>
          <p className="m-0 text-[16px] font-medium leading-[1.6] text-text-muted">
            Extensiones 100% cabello remy en negro, castaños y rubios. Elige tu largo y encuentra el tono que ya
            combina contigo.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <Boton variant="primary" size="lg" iconRight="arrow-right" href="/catalogo">
              Ver catálogo
            </Boton>
            <BotonWhatsApp etiqueta="¿Dudas de tono? Escríbenos" size="lg" fullWidth={false} />
          </div>
        </div>
        <BloqueFoto ratio="4 / 5" label="Foto de campaña" />
      </div>
    </Seccion>
  );
}

function PropuestaValor() {
  return (
    <Seccion>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TarjetaValor icon="check-circle" title="100% cabello remy" text="Extensiones naturales, teñibles y termorresistentes." />
        <TarjetaValor icon="heart" title="Tonos que combinan" text="Negro, castaño y rubio para mezclar con tu color real." />
        <TarjetaValor icon="whatsapp" title="Asesoría por WhatsApp" text="¿No sabes qué tono elegir? Te ayudamos a decidir." />
      </div>
    </Seccion>
  );
}

function CatalogoDestacado() {
  const { agregar } = useCarrito();
  const favoritos = useFavoritos();
  const [estado, setEstado] = useState<{ cargando: boolean; lista: ProductoAPI[]; error: boolean }>({
    cargando: true,
    lista: [],
    error: false,
  });

  useEffect(() => {
    const control = new AbortController();
    fetch(`/api/productos`, { signal: control.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/productos → ${r.status}`);
        return r.json() as Promise<{ total: number; productos: ProductoAPI[] }>;
      })
      .then((datos) => setEstado({ cargando: false, lista: datos.productos.slice(0, CANTIDAD_DESTACADOS), error: false }))
      .catch(() => setEstado({ cargando: false, lista: [], error: true }));
    return () => control.abort();
  }, []);

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

  if (!estado.cargando && (estado.error || estado.lista.length === 0)) return null;

  return (
    <Seccion id="catalogo" bg="bg-fondo">
      <CabezaSeccion
        eyebrow="Catálogo"
        title="Tonos destacados"
        sub="Cada tono existe en distintos largos; el precio varía por variante."
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {estado.cargando
          ? Array.from({ length: CANTIDAD_DESTACADOS }).map((_, i) => <Esqueleto key={i} variant="card" />)
          : estado.lista.map((p) => {
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
      <div className="mt-8 flex justify-center">
        <Boton variant="secondary" iconRight="arrow-right" href="/catalogo">
          Ver catálogo completo
        </Boton>
      </div>
    </Seccion>
  );
}

function Testimonios() {
  const [testimonios, setTestimonios] = useState<TestimonioAPI[]>([]);

  useEffect(() => {
    fetch("/api/testimonios")
      .then((r) => (r.ok ? (r.json() as Promise<TestimonioAPI[]>) : []))
      .then((lista) => setTestimonios(Array.isArray(lista) ? lista : []))
      .catch(() => setTestimonios([]));
  }, []);

  if (testimonios.length === 0) return null;

  return (
    <Seccion bg="bg-surface-muted">
      <CabezaSeccion eyebrow="Lo que dicen" title="Clientas que ya encontraron su tono" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {testimonios.map((t) => (
          <CardTestimonio key={t.id} name={t.nombre} text={t.texto} />
        ))}
      </div>
    </Seccion>
  );
}

function HistoriaTeaser() {
  return (
    <Seccion>
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <BloqueFoto ratio="1 / 1" label="Foto del equipo" />
        <div className="flex flex-col gap-3.5">
          <Marbete>Nuestra historia</Marbete>
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.01em] text-text-strong sm:text-[26px] lg:text-[30px]">
            Detrás de Lizzy &amp; Stephy
          </h2>
          <p className="m-0 max-w-[480px] text-[15px] font-medium leading-[1.6] text-text-muted">
            Elegimos cabello remy de calidad y lo ofrecemos en los tonos que más se piden, con asesoría cercana
            cuando no sabes cuál elegir.
          </p>
          <div>
            <Boton variant="secondary" iconRight="arrow-right" href="/sobre-nosotros">
              Conoce nuestra historia
            </Boton>
          </div>
        </div>
      </div>
    </Seccion>
  );
}

export function InicioCliente() {
  return (
    <div className="flex min-h-dvh flex-col">
      <EncabezadoSitio />
      <Hero />
      <PropuestaValor />
      <CatalogoDestacado />
      <Testimonios />
      <HistoriaTeaser />
      <BandaAyudaWhatsApp />
      <PieSitio />
    </div>
  );
}
