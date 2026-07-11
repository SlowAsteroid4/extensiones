// Átomos de datos del DS "Magenta audaz": Badge, Divider, Label, Link, Price.
// Portados 1:1 de components/data/*.jsx (hover JS → pseudo-clases CSS).
import type { CSSProperties, HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import NextLink from "next/link";
import { formatearPrecioMXN } from "@/shared/precio/formatear";

/* ── Badge — etiqueta corta. "Agotado" NUNCA se oculta (regla vinculante). ── */

export type TonoBadge = "category" | "sold-out" | "unavailable" | "count" | "success" | "accent";

const TONOS_BADGE: Record<TonoBadge, string> = {
  category: "bg-superficie text-secundario",
  "sold-out": "bg-secundario text-white",
  unavailable: "bg-surface-muted text-text-muted border border-border-strong",
  count: "bg-text-strong text-white",
  success: "bg-success-surface text-success border border-success-border",
  accent: "bg-acento text-text-strong",
};

export function Badge({
  tone = "category",
  uppercase = false,
  children,
  className = "",
  ...rest
}: { tone?: TonoBadge; uppercase?: boolean; children: ReactNode; className?: string } & HTMLAttributes<HTMLSpanElement>) {
  const esCount = tone === "count";
  const mayusculas = uppercase || tone === "category";
  return (
    <span
      className={[
        "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-pill text-[11px] font-bold leading-none",
        esCount ? "min-h-5 min-w-5 px-1.5" : "px-2.5 py-[5px]",
        mayusculas ? "uppercase tracking-[0.06em]" : "",
        TONOS_BADGE[tone],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}

/* ── Divider ── */

export function Divider({
  vertical = false,
  className = "",
  ...rest
}: { vertical?: boolean; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={[vertical ? "w-px self-stretch" : "h-px w-full", "bg-border", className].join(" ")}
      {...rest}
    />
  );
}

/* ── Label — etiqueta de campo (13/600), requerido con “*”. ── */

export function Label({
  children,
  required = false,
  className = "",
  ...rest
}: { children: ReactNode; required?: boolean; className?: string } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={["mb-1.5 block text-[13px] font-semibold leading-[18px] text-text-strong", className].join(" ")}
      {...rest}
    >
      {children}
      {required && <span className="ml-0.5 text-error">*</span>}
    </label>
  );
}

/* ── Link — texto secundario AA, subrayado en hover. Nunca magenta hero. ── */

export function Enlace({
  children,
  href,
  onClick,
  className = "",
  ...rest
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  const clases = [
    "cursor-pointer font-semibold text-outline-text underline-offset-2 hover:underline",
    className,
  ].join(" ");
  if (href) {
    return (
      <NextLink href={href} onClick={onClick} className={clases} {...rest}>
        {children}
      </NextLink>
    );
  }
  return (
    <button type="button" onClick={onClick} className={clases} {...rest}>
      {children}
    </button>
  );
}

/* ── Price — precio MXN en centavos. Magenta SOLO ≥16/800 (AA-large marcado);
      sm (14/800) va en color texto. Unidad "MXN" 11/700 muted. ── */

const TAMANOS_PRECIO = {
  sm: { size: 14, unit: 10, magenta: false },
  md: { size: 16, unit: 11, magenta: true },
  lg: { size: 24, unit: 12, magenta: true },
  xl: { size: 30, unit: 13, magenta: true },
} as const;

export function Precio({
  centavos,
  moneda = "MXN",
  size = "md",
  strike = false,
  className = "",
  style,
}: {
  centavos: number;
  moneda?: string;
  size?: keyof typeof TAMANOS_PRECIO;
  strike?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const t = TAMANOS_PRECIO[size];
  return (
    <span className={["inline-flex items-baseline gap-1", className].join(" ")} style={style}>
      <span
        className={[
          "font-extrabold leading-none",
          strike ? "text-text-subtle line-through" : t.magenta ? "text-primario" : "text-text-strong",
        ].join(" ")}
        style={{ fontSize: t.size }}
      >
        {formatearPrecioMXN(centavos)}
      </span>
      <span className="font-bold tracking-[0.02em] text-text-muted" style={{ fontSize: t.unit }}>
        {moneda}
      </span>
    </span>
  );
}
