"use client";
// Organismos del DS "Magenta audaz": StoreHeader y FilterSheet.
// StoreHeader: fondo magenta hero, wordmark display 22/800 (AA-large marcado),
// SIN franja comercial (regla vinculante). FilterSheet: bottom sheet, overlay
// ciruela, cero glassmorphism.
import type { ReactNode } from "react";
import NextLink from "next/link";
import { Icono } from "./icono";
import { SelectorTema } from "./selector-tema";
import { Boton, BotonIcono } from "./boton";
import { GrupoFiltros, type GrupoFiltro } from "./producto";

export function EncabezadoTienda({
  cartCount = 0,
  cartHref = "/carrito",
  accountHref = "/cuenta",
  brand = "Lizzy & Stephy",
  sub = "EXTENSIONES",
}: {
  cartCount?: number;
  cartHref?: string;
  accountHref?: string;
  brand?: string;
  sub?: string;
}) {
  return (
    <header className="flex items-center justify-between rounded-b-2xl bg-primario px-5 pb-6 pt-5">
      <NextLink href="/" className="flex flex-col gap-0.5">
        <span className="text-[22px] font-extrabold leading-none tracking-[-0.01em] text-white">{brand}</span>
        <span className="text-[11px] font-semibold tracking-[0.22em] text-white/[0.92]">{sub}</span>
      </NextLink>
      <div className="flex items-center gap-1">
        <SelectorTema tono="sobre-magenta" size={44} />
        <NextLink
          href={accountHref}
          aria-label="Mi cuenta"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/16 text-white"
        >
          <Icono name="user" size={20} />
        </NextLink>
        <NextLink
          href={cartHref}
          aria-label="Carrito"
          className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-primario shadow-[0_3px_10px_rgb(43_22_32_/_0.18)]"
        >
          <Icono name="cart" size={22} />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-pill border-2 border-primario bg-inverso px-[5px] text-[11px] font-bold leading-none text-sobre-inverso">
              {cartCount}
            </span>
          )}
        </NextLink>
      </div>
    </header>
  );
}

export function HojaFiltros({
  open,
  groups,
  selected,
  resultCount,
  onToggle,
  onClear,
  onApply,
  onClose,
  children,
}: {
  open: boolean;
  groups: GrupoFiltro[];
  selected: Record<string, string[]>;
  resultCount?: number | null;
  onToggle: (clave: string, opcion: string) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
  /** Contenido extra arriba de los chips (ej. buscador de tono). */
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[900] flex items-end bg-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtrar"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full animate-ls-modal-in flex-col rounded-t-2xl bg-fondo px-5 pb-5 pt-4 shadow-sheet"
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-[2px] bg-border-strong" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-h2 font-extrabold text-text-strong">Filtrar</h2>
          <BotonIcono icon="close" variant="ghost" ariaLabel="Cerrar" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
          <GrupoFiltros
            groups={groups}
            selected={selected}
            resultCount={resultCount}
            onToggle={onToggle}
            onClear={onClear}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Boton variant="secondary" fullWidth onClick={onClear}>
            Limpiar
          </Boton>
          <Boton variant="primary" fullWidth onClick={onApply}>
            Aplicar
          </Boton>
        </div>
      </div>
    </div>
  );
}
