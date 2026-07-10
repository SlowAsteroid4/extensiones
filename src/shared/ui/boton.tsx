"use client";
// Button + IconButton del DS "Magenta audaz" (components/buttons/*.jsx).
// Reglas portadas: label ≥14/700; primary usa fill #C6006E (AA con blanco);
// hover oscurece, press scale(0.97) / icon 0.92; pill; icono exento de la
// regla de texto magenta. hover/press JS del bundle → pseudo-clases CSS.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import NextLink from "next/link";
import { Icono, type NombreIcono } from "./icono";

const TAMANOS = {
  sm: { pad: "px-3.5 py-2", font: "text-[13px]", minH: "min-h-9", icon: 16 },
  md: { pad: "px-5 py-3", font: "text-[14px]", minH: "min-h-11", icon: 18 },
  lg: { pad: "px-6 py-3.5", font: "text-[16px]", minH: "min-h-13", icon: 20 },
} as const;

const PIELES: Record<string, string> = {
  primary:
    "border-transparent bg-btn-primary text-white hover:bg-btn-primary-hover hover:shadow-button active:bg-btn-primary-pressed disabled:bg-btn-primary-disabled disabled:text-white disabled:shadow-none",
  secondary:
    "border-outline-border bg-transparent text-outline-text hover:bg-outline-hover-bg active:border-secondary-pressed disabled:border-outline-disabled-border disabled:text-outline-disabled-text disabled:bg-transparent",
  destructive:
    "border-transparent bg-error text-white hover:bg-error-hover active:bg-error-pressed disabled:bg-error-border",
  whatsapp:
    "border-outline-border bg-transparent text-secundario hover:bg-outline-hover-bg disabled:border-outline-disabled-border disabled:text-outline-disabled-text",
};

export type VarianteBoton = keyof typeof PIELES;

export interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VarianteBoton;
  size?: keyof typeof TAMANOS;
  icon?: NombreIcono;
  iconRight?: NombreIcono;
  loading?: boolean;
  fullWidth?: boolean;
  href?: string;
  children?: ReactNode;
}

export function Boton({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  href,
  type = "button",
  className = "",
  children,
  ...rest
}: BotonProps) {
  const t = TAMANOS[size];
  const inhabilitado = disabled || loading;
  const clases = [
    "inline-flex select-none items-center justify-center gap-2 rounded-pill border-2 font-bold leading-none",
    "transition-[background,border-color,transform,box-shadow] duration-[120ms] ease-standard",
    inhabilitado ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.97]",
    t.pad,
    t.font,
    t.minH,
    fullWidth ? "w-full" : "",
    PIELES[variant] ?? PIELES.primary,
    className,
  ].join(" ");
  const claro = variant === "primary" || variant === "destructive";
  const contenido = (
    <>
      {loading && (
        <span
          className="inline-block animate-ls-spin rounded-full"
          style={{
            width: t.icon,
            height: t.icon,
            border: `2px solid ${claro ? "rgb(255 255 255 / 0.4)" : "rgb(198 0 110 / 0.3)"}`,
            borderTopColor: claro ? "var(--color-fondo)" : "var(--color-secundario)",
          }}
        />
      )}
      {!loading && icon && <Icono name={icon} size={t.icon} />}
      {!loading && variant === "whatsapp" && !icon && <Icono name="whatsapp" size={t.icon} />}
      <span>{children}</span>
      {!loading && iconRight && <Icono name={iconRight} size={t.icon} />}
    </>
  );
  if (href && !inhabilitado) {
    return (
      <NextLink href={href} className={clases}>
        {contenido}
      </NextLink>
    );
  }
  return (
    <button type={type} disabled={inhabilitado} className={clases} {...rest}>
      {contenido}
    </button>
  );
}

/* ── IconButton — solid (círculo magenta hero, ej. "+"), tonal (superficie
      rosa), ghost. Badge contador ciruela. Corazón activo: relleno + pop. ── */

const DIMENSIONES = { sm: 32, md: 40, lg: 48 } as const;

const PIELES_ICONO: Record<string, string> = {
  solid:
    "bg-primario text-white shadow-button hover:bg-primary-hover active:bg-primary-pressed disabled:bg-primary-disabled disabled:shadow-none",
  tonal: "bg-superficie text-secundario hover:bg-surface-strong active:bg-surface-strong disabled:bg-surface-muted",
  ghost: "bg-transparent text-text-strong hover:bg-superficie disabled:text-text-disabled",
};

export interface BotonIconoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: NombreIcono;
  variant?: keyof typeof PIELES_ICONO;
  size?: keyof typeof DIMENSIONES;
  active?: boolean;
  filledWhenActive?: boolean;
  badge?: number;
  ariaLabel: string;
}

export function BotonIcono({
  icon,
  variant = "ghost",
  size = "md",
  active = false,
  filledWhenActive = false,
  badge,
  ariaLabel,
  disabled = false,
  className = "",
  ...rest
}: BotonIconoProps) {
  const dim = DIMENSIONES[size];
  const corazonActivo = icon === "heart" && active && filledWhenActive;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active || undefined}
      disabled={disabled}
      className={[
        "relative inline-flex items-center justify-center rounded-full border-none",
        "transition-[background,transform] duration-[120ms] ease-standard",
        disabled ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.92]",
        PIELES_ICONO[variant] ?? PIELES_ICONO.ghost,
        active && variant !== "solid" ? "text-primario" : "",
        className,
      ].join(" ")}
      style={{ width: dim, height: dim, minWidth: dim, minHeight: dim }}
      {...rest}
    >
      <span className={["inline-flex", corazonActivo ? "animate-ls-heart-pop" : ""].join(" ")}>
        <Icono
          name={icon}
          size={Math.round(dim * 0.5)}
          filled={corazonActivo}
          color={corazonActivo ? "var(--color-primario)" : "currentColor"}
        />
      </span>
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill border-2 border-fondo bg-text-strong px-[5px] text-[11px] font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
