"use client";
// Piezas de producto del DS "Magenta audaz": ProductCard, TestimonialCard,
// CartRow, TotalsSummary, FilterGroup, ToneSearch.
// Reglas vinculantes: "Agotado" siempre visible · empty/errores con salida ·
// precios MXN en centavos (formatearPrecioMXN).
import type { CSSProperties, ReactNode } from "react";
import NextLink from "next/link";
import { formatearPrecioMXN } from "@/shared/precio/formatear";
import { Badge } from "./datos";
import { Divider, Enlace, Precio } from "./datos";
import { Boton, BotonIcono } from "./boton";
import { Icono } from "./icono";
import { Chip, Input, StepperCantidad } from "./formularios";

/* Foto de producto sobre el patrón de marca: si la imagen falla o falta, las
   rayas rosas del DS quedan visibles debajo (capas de background). */
function fondoFoto(image?: string): CSSProperties | undefined {
  if (!image) return undefined;
  return {
    backgroundImage: `url(${image}), repeating-linear-gradient(-45deg, var(--color-superficie) 0 10px, var(--color-surface-strong) 10px 20px)`,
    backgroundSize: "cover, auto",
    backgroundPosition: "center, 0 0",
    backgroundRepeat: "no-repeat, repeat",
  };
}

/* ── ProductCard — foto + badge categoría + (Agotado) + corazón + tono +
      largo + precio + "+". Card agotada: badge visible, sin acción de compra. ── */

export function CardProducto({
  name,
  largo,
  priceCentavos,
  category,
  categoryHref,
  href,
  image,
  soldOut = false,
  favorite = false,
  onFavorite,
  onAdd,
}: {
  name: string;
  largo?: string;
  priceCentavos: number;
  category: string;
  categoryHref?: string;
  href: string;
  image?: string;
  soldOut?: boolean;
  favorite?: boolean;
  onFavorite?: () => void;
  onAdd?: () => void;
}) {
  const badgeCategoria = (
    <Badge tone="category" className="max-w-full">
      <span className="truncate">{category}</span>
    </Badge>
  );
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-fondo shadow-card transition-[box-shadow,transform] duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative m-2.5 mb-0">
        <NextLink
          href={href}
          aria-label={`Ver ${name}`}
          className="foto-placeholder block aspect-square overflow-hidden rounded-lg"
          style={fondoFoto(image)}
        >
          {!image && (
            <span className="absolute bottom-3 left-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-text-subtle">
              Foto producto
            </span>
          )}
        </NextLink>
        <div className={["absolute left-2.5 top-2.5", soldOut ? "max-w-[calc(100%-96px)]" : "max-w-[calc(100%-56px)]"].join(" ")}>
          {categoryHref ? (
            <NextLink href={categoryHref} className="block max-w-full">
              {badgeCategoria}
            </NextLink>
          ) : (
            badgeCategoria
          )}
        </div>
        {soldOut && (
          <div className="absolute right-2.5 top-2.5">
            <Badge tone="sold-out">Agotado</Badge>
          </div>
        )}
        {!soldOut && (
          <div className="absolute right-2 top-2">
            <BotonIcono
              icon="heart"
              variant="tonal"
              size="sm"
              active={favorite}
              filledWhenActive
              ariaLabel={favorite ? `Quitar ${name} de favoritos` : `Guardar ${name} en favoritos`}
              onClick={onFavorite}
            />
          </div>
        )}
        {!soldOut && (
          <div className="absolute bottom-2 right-2">
            <BotonIcono icon="plus" variant="solid" size="md" ariaLabel={`Agregar ${name}`} onClick={onAdd} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <h3 className="m-0 text-h3 font-bold text-text-strong">{name}</h3>
        {largo && <span className="text-[13px] font-medium text-text-muted">Largo {largo}</span>}
        <div className="mt-1.5">
          <Precio centavos={priceCentavos} size="md" />
        </div>
      </div>
    </div>
  );
}

/* ── TestimonialCard — la sección entera se oculta si no hay testimonios. ── */

export function CardTestimonio({ name, text }: { name: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <p className="mb-2.5 mt-0 text-[14px] font-medium leading-[1.55] text-text-strong">“{text}”</p>
      <span className="text-[13px] font-bold text-secundario">{name}</span>
    </div>
  );
}

/* ── CartRow — fila de carrito. unavailable bloquea stepper y pinta salida.
      errorText: error POR ITEM de la API (409/400) pintado en la fila. ── */

export function FilaCarrito({
  name,
  largo,
  priceCentavos,
  qty = 1,
  image,
  unavailable = false,
  unavailableLabel = "Ya no disponible",
  errorText,
  maxStock = 99,
  onQty,
  onRemove,
}: {
  name: string;
  largo?: string;
  priceCentavos: number;
  qty?: number;
  image?: string;
  unavailable?: boolean;
  unavailableLabel?: string;
  errorText?: string;
  maxStock?: number;
  onQty?: (v: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className={["flex items-center gap-3 py-3", unavailable ? "opacity-85" : ""].join(" ")}>
      <div
        className={["foto-placeholder h-[68px] w-[68px] shrink-0 rounded-md", unavailable ? "grayscale-[0.6]" : ""].join(" ")}
        style={fondoFoto(image)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[15px] font-bold text-text-strong">{name}</span>
          {unavailable && <Badge tone="unavailable">{unavailableLabel}</Badge>}
        </div>
        {largo && <span className="text-[13px] font-medium text-text-muted">Largo {largo}</span>}
        {!unavailable ? (
          <div className="mt-1">
            <StepperCantidad value={qty} min={1} max={maxStock} size="sm" onChange={onQty} />
          </div>
        ) : (
          <span className="mt-0.5 text-[13px] font-semibold text-error">Quítalo para continuar</span>
        )}
        {errorText && !unavailable && (
          <span className="mt-0.5 text-[13px] font-semibold text-error">{errorText}</span>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {!unavailable && <Precio centavos={priceCentavos} size="sm" />}
        <BotonIcono icon="trash" variant="ghost" size="sm" ariaLabel={`Quitar ${name}`} onClick={onRemove} />
      </div>
    </div>
  );
}

/* ── TotalsSummary — totales MXN + Pagar (bloqueable con motivo). ── */

export function ResumenTotales({
  lines = [],
  totalCentavos,
  ctaLabel = "Pagar",
  onPay,
  payLoading = false,
  blocked = false,
  blockedReason,
}: {
  lines?: { label: string; value: number | string }[];
  totalCentavos: number;
  ctaLabel?: string;
  onPay?: () => void;
  payLoading?: boolean;
  blocked?: boolean;
  blockedReason?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-fondo p-4">
      <div className="flex flex-col gap-2">
        {lines.map((l, i) => (
          <div key={i} className="flex justify-between text-[14px] font-medium text-text-muted">
            <span>{l.label}</span>
            <span className="font-semibold text-text-strong">
              {typeof l.value === "number" ? formatearPrecioMXN(l.value) : l.value}
            </span>
          </div>
        ))}
      </div>
      <Divider className="my-3" />
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-[15px] font-extrabold text-text-strong">Total</span>
        <Precio centavos={totalCentavos} size="lg" />
      </div>
      {blocked && blockedReason && (
        <div className="mb-2.5 text-center text-[13px] font-semibold text-error">{blockedReason}</div>
      )}
      <Boton variant="primary" size="lg" fullWidth disabled={blocked} loading={payLoading} onClick={onPay}>
        {ctaLabel}
      </Boton>
    </div>
  );
}

/* ── FilterGroup — chips por grupo + contador en vivo + limpiar. ── */

export interface GrupoFiltro {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export function GrupoFiltros({
  groups = [],
  selected = {},
  onToggle,
  resultCount,
  onClear,
}: {
  groups: GrupoFiltro[];
  selected: Record<string, string[]>;
  onToggle?: (clave: string, opcion: string) => void;
  resultCount?: number | null;
  onClear?: () => void;
}) {
  const hayActivos = Object.values(selected).some((arr) => arr && arr.length > 0);
  return (
    <div>
      {groups.map((g) => (
        <div key={g.key} className="mb-4">
          <div className="mb-2 text-eyebrow font-bold uppercase tracking-[0.08em] text-text-muted">{g.label}</div>
          <div className="flex flex-wrap gap-2">
            {g.options.map((opt) => (
              <Chip
                key={opt.value}
                active={(selected[g.key] ?? []).includes(opt.value)}
                onClick={() => onToggle?.(g.key, opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between">
        {resultCount != null && (
          <span className="text-[13px] font-semibold text-text-muted">{resultCount} resultados</span>
        )}
        {hayActivos && <Enlace onClick={onClear}>Limpiar</Enlace>}
      </div>
    </div>
  );
}

/* ── ToneSearch — buscador de tono con resultados. ── */

export function BuscadorTono({
  value,
  results = [],
  onChange,
  onPick,
  placeholder = "Busca tu tono…",
}: {
  value: string;
  results?: string[];
  onChange?: (v: string) => void;
  onPick?: (r: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input icon="search" value={value} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} />
      {results.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-md border border-border bg-fondo shadow-popover">
          {results.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onPick?.(r)}
              className="block w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left text-[14px] font-medium text-text-strong hover:bg-surface-muted"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Fila de acceso a filtros del catálogo (composición del diseño: eyebrow
   FILTRAR + chips Tono/Tipo/Largo + icono embudo con contador). */
export function FilaAccesoFiltros({
  onOpen,
  active = {},
}: {
  onOpen: () => void;
  active?: Record<string, string[]>;
}) {
  const cuenta = Object.values(active).reduce((n, a) => n + (a?.length ?? 0), 0);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow font-bold uppercase tracking-[0.08em] text-text-muted">Filtrar</span>
      <div className="flex items-center gap-2">
        <Chip active={(active.familia ?? []).length > 0} onClick={onOpen}>
          Tono
        </Chip>
        <Chip active={(active.tipo ?? []).length > 0} onClick={onOpen}>
          Tipo
        </Chip>
        <Chip active={(active.largo ?? []).length > 0} onClick={onOpen}>
          Largo
        </Chip>
        <div className="ml-auto">
          <BotonIcono
            icon="filter"
            variant="tonal"
            badge={cuenta || undefined}
            ariaLabel="Abrir filtros"
            onClick={onOpen}
          />
        </div>
      </div>
    </div>
  );
}

/* Sección de testimonios (eyebrow "Lo que dicen" + cards). Se oculta si vacía. */
export function SeccionTestimonios({ testimonios }: { testimonios: { id: string; nombre: string; texto: string }[] }) {
  if (testimonios.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-eyebrow font-bold uppercase tracking-[0.08em] text-text-muted">Lo que dicen</span>
      {testimonios.map((t) => (
        <CardTestimonio key={t.id} name={t.nombre} text={t.texto} />
      ))}
    </div>
  );
}

/* Encabezado de dato de la ficha (tipo · familia + nombre del tono). */
export function EncabezadoProducto({ name, tipo, familia }: { name: string; tipo: string; familia: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-eyebrow font-bold uppercase tracking-[0.08em] text-text-muted">
        {tipo} · {familia}
      </span>
      <h1 className="m-0 text-[26px] font-extrabold leading-[1.15] tracking-[-0.01em] text-text-strong">{name}</h1>
    </div>
  );
}

/* Barra superior ligera de pantallas de detalle (atrás + título + carrito). */
export function BarraSuperior({
  title,
  cartCount = 0,
  backHref,
  onBack,
  cartHref = "/carrito",
}: {
  title: string;
  cartCount?: number;
  backHref?: string;
  onBack?: () => void;
  cartHref?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-fondo p-3">
      {backHref ? (
        <NextLink
          href={backHref}
          aria-label="Volver"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-strong hover:bg-superficie"
        >
          <Icono name="chevron-left" size={20} />
        </NextLink>
      ) : (
        <BotonIcono icon="chevron-left" variant="ghost" ariaLabel="Volver" onClick={onBack} />
      )}
      <span className="flex-1 truncate text-h3 font-bold text-text-strong">{title}</span>
      <NextLink
        href={cartHref}
        aria-label="Carrito"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-superficie text-secundario"
      >
        <Icono name="cart" size={20} />
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill border-2 border-fondo bg-text-strong px-[5px] text-[11px] font-bold leading-none text-white">
            {cartCount}
          </span>
        )}
      </NextLink>
    </div>
  );
}

/* Galería de ficha: foto grande 1:1 + badge categoría (+Agotado) + miniaturas. */
export function GaleriaProducto({
  category,
  fotos = [],
  soldOut = false,
}: {
  category: string;
  fotos?: string[];
  soldOut?: boolean;
}) {
  const principal = fotos[0];
  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="foto-placeholder relative aspect-square w-full overflow-hidden rounded-xl"
        style={fondoFoto(principal)}
      >
        <div className="absolute left-3 top-3">
          <Badge tone="category">{category}</Badge>
        </div>
        {soldOut && (
          <div className="absolute right-3 top-3">
            <Badge tone="sold-out">Agotado</Badge>
          </div>
        )}
        {!principal && (
          <span className="absolute bottom-3.5 left-4 text-[11px] font-bold uppercase tracking-[0.08em] text-text-subtle">
            Foto producto
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: Math.max(fotos.length, 4) }).map((_, i) => (
          <div
            key={i}
            className={[
              "foto-placeholder h-15 w-15 shrink-0 rounded-md border-2",
              i === 0 ? "border-primario" : "border-border",
            ].join(" ")}
            style={fondoFoto(fotos[i])}
          />
        ))}
      </div>
    </div>
  );
}

/* Aviso informativo en superficie rosa (usado en B4 y C1-duplicado). */
export function AvisoSuperficie({ icon = "info", children }: { icon?: "info" | "alert"; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-surface-strong bg-superficie p-4">
      <Icono name={icon} size={20} color="var(--color-secundario)" className="mt-0.5 shrink-0" />
      <span className="text-[14px] font-semibold leading-[1.5] text-text-strong">{children}</span>
    </div>
  );
}
