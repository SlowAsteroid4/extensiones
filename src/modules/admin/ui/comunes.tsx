"use client";
// Piezas compartidas del panel (flujo D): barra del panel y tipos del API admin.
import type { ReactNode } from "react";
import NextLink from "next/link";
import { Boton } from "@/shared/ui/boton";

export interface VarianteAdmin {
  id: string;
  largo_pulgadas: number;
  precio_mxn: number; // centavos
  existencias: number;
  sku: string;
}

export interface ProductoAdmin {
  id: string;
  nombre_tono: string;
  slug: string;
  familia_tono: string;
  tipo: string;
  descripcion: string;
  fotos: string[];
  activo: boolean;
  categoria: { id: string; nombre: string; slug: string };
  variantes: VarianteAdmin[];
}

export interface TestimonioAdmin {
  id: string;
  nombre: string;
  texto: string;
  orden: number;
  activo: boolean;
}

/* Barra superior del panel (no es StoreHeader: contexto admin). */
export function BarraAdmin({
  title,
  action,
  actionHref,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-fondo px-4 py-3.5 lg:px-6 lg:py-[18px]">
      <div className="flex flex-col">
        <span className="text-eyebrow font-bold uppercase tracking-[0.1em] text-secundario">Panel</span>
        <span className="text-[18px] font-extrabold text-text-strong lg:text-[22px]">{title}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {children}
        {action && (
          <Boton variant="primary" icon="plus" href={actionHref} onClick={onAction}>
            {action}
          </Boton>
        )}
      </div>
    </div>
  );
}

/* Navegación interna del panel (productos · testimonios · volver a la tienda). */
export function NavAdmin({ activa }: { activa: "productos" | "testimonios" }) {
  const enlaces = [
    { clave: "productos", href: "/admin/productos", etiqueta: "Productos" },
    { clave: "testimonios", href: "/admin/testimonios", etiqueta: "Testimonios" },
  ] as const;
  return (
    <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-2 lg:px-6">
      {enlaces.map((e) => (
        <NextLink
          key={e.clave}
          href={e.href}
          className={[
            "rounded-pill px-3.5 py-1.5 text-[13px] font-semibold",
            activa === e.clave ? "bg-btn-primary text-white" : "text-text-muted hover:bg-superficie",
          ].join(" ")}
        >
          {e.etiqueta}
        </NextLink>
      ))}
      <NextLink href="/" className="ml-auto text-[13px] font-semibold text-outline-text hover:underline">
        Ver la tienda
      </NextLink>
    </div>
  );
}
