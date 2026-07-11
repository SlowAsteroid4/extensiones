"use client";
// Chrome de sitio (páginas de marketing: Inicio, Sobre nosotros, Contacto).
// Distinto de EncabezadoTienda (shell de app interna, sin nav de sitio): este
// header navega entre páginas. Diseño importado de claude_design
// ("Construcción del e-commerce", site-shared.jsx), portado a átomos reales
// del DS (Boton, BotonIcono, Icono) + carrito real (useCarrito).
import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Icono } from "@/shared/ui/icono";
import { BotonWhatsApp } from "@/modules/catalogo/ui/boton-whatsapp";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";

const ENLACES_NAV = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/contacto", label: "Contacto" },
];

function esActiva(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function EncabezadoSitio() {
  const pathname = usePathname();
  const { totalPiezas } = useCarrito();
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-fondo">
      <div className="mx-auto flex h-[76px] w-full max-w-[1200px] items-center gap-6 px-4 lg:px-6">
        <NextLink href="/" className="flex shrink-0 flex-col gap-0" onClick={() => setAbierto(false)}>
          <span className="text-[22px] font-extrabold leading-none tracking-[-0.01em] text-primario">
            Lizzy &amp; Stephy
          </span>
          <span className="text-[10px] font-bold tracking-[0.22em] text-text-muted">EXTENSIONES</span>
        </NextLink>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {ENLACES_NAV.map((enlace) => (
            <NextLink
              key={enlace.href}
              href={enlace.href}
              className={[
                "rounded-pill px-3.5 py-2.5 text-[14px] font-semibold",
                esActiva(pathname, enlace.href) ? "bg-superficie text-secundario" : "text-text-muted hover:bg-surface-muted",
              ].join(" ")}
            >
              {enlace.label}
            </NextLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden shrink-0 lg:block">
            <BotonWhatsApp etiqueta="¿Dudas de tono?" size="sm" fullWidth={false} />
          </div>
          <NextLink
            href="/cuenta"
            aria-label="Mi cuenta"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-strong hover:bg-superficie"
          >
            <Icono name="user" size={20} />
          </NextLink>
          <NextLink
            href="/carrito"
            aria-label="Carrito"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-superficie text-secundario"
          >
            <Icono name="cart" size={20} />
            {totalPiezas > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill border-2 border-fondo bg-text-strong px-[5px] text-[11px] font-bold leading-none text-white">
                {totalPiezas}
              </span>
            )}
          </NextLink>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-fondo text-text-strong lg:hidden"
          >
            <Icono name={abierto ? "close" : "menu"} size={18} />
          </button>
        </div>
      </div>

      {abierto && (
        <div className="flex flex-col gap-1 border-t border-border px-4 pb-4 pt-2 lg:hidden">
          {ENLACES_NAV.map((enlace) => (
            <NextLink
              key={enlace.href}
              href={enlace.href}
              onClick={() => setAbierto(false)}
              className={[
                "rounded-md px-3.5 py-3 text-[15px] font-semibold",
                esActiva(pathname, enlace.href) ? "bg-superficie text-secundario" : "text-text-strong",
              ].join(" ")}
            >
              {enlace.label}
            </NextLink>
          ))}
          <div className="mt-2">
            <BotonWhatsApp etiqueta="¿Dudas de tono? Escríbenos" size="lg" />
          </div>
        </div>
      )}
    </header>
  );
}

/* ── Footer de sitio — marca + accesos + copyright. ── */
export function PieSitio() {
  return (
    <footer className="bg-texto text-white">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-[18px] font-extrabold text-white">Lizzy &amp; Stephy</span>
          <p className="m-0 max-w-[320px] text-[14px] font-medium leading-[1.55] text-white/72">
            Extensiones de cabello remy en los tonos y largos que ya conoces. Asesoría por WhatsApp cuando tengas
            dudas de tono.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/55">Tienda</span>
          <NextLink href="/catalogo" className="text-[14px] font-medium text-white/85 no-underline hover:underline">
            Catálogo
          </NextLink>
          <NextLink href="/sobre-nosotros" className="text-[14px] font-medium text-white/85 no-underline hover:underline">
            Sobre nosotros
          </NextLink>
          <NextLink href="/contacto" className="text-[14px] font-medium text-white/85 no-underline hover:underline">
            Contacto
          </NextLink>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/55">Ayuda</span>
          <span className="text-[14px] font-medium text-white/85">Dudas de tono y pedidos por WhatsApp</span>
        </div>
      </div>
      <div className="border-t border-white/14">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-4 text-[12px] font-medium text-white/55 lg:px-6">
          © 2026 Lizzy &amp; Stephy Extensiones.
        </div>
      </div>
    </footer>
  );
}

/* ── Banda de ayuda por WhatsApp — reutilizada en Inicio y páginas de sitio. ── */
export function BandaAyudaWhatsApp() {
  return (
    <div className="bg-surface-muted py-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col flex-wrap items-start gap-5 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-strong text-secundario">
            <Icono name="whatsapp" size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] font-extrabold text-text-strong">¿No sabes qué tono elegir?</span>
            <span className="text-[14px] font-medium text-text-muted">
              Escríbenos por WhatsApp y te ayudamos antes de comprar.
            </span>
          </div>
        </div>
        <BotonWhatsApp etiqueta="¿Dudas de tono? Escríbenos" size="lg" fullWidth={false} />
      </div>
    </div>
  );
}
