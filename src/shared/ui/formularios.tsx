"use client";
// Formularios del DS "Magenta audaz": Input, FormField, Chip, Toggle,
// QuantityStepper, VariantSelector, EditableVariantRow, ImageUploader.
// Regla vinculante: errores INLINE bajo el campo, sin perder lo capturado.
import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { BotonIcono } from "./boton";
import { Icono, type NombreIcono } from "./icono";
import { Label } from "./datos";

/* ── Input — default · focus (borde magenta + halo) · error · disabled.
      password añade mostrar/ocultar. ── */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  error?: boolean;
  errorText?: string;
  helpText?: string;
  prefix?: string;
  icon?: NombreIcono;
  contenedorClassName?: string;
  // React 19: `ref` es un prop normal — el formulario de alta lo usa para
  // devolver el foco al campo que falló.
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  type = "text",
  error = false,
  errorText,
  helpText,
  prefix,
  icon,
  disabled = false,
  id,
  ref,
  contenedorClassName = "",
  className = "",
  ...rest
}: InputProps) {
  const [mostrar, setMostrar] = useState(false);
  const esPassword = type === "password";
  const tipoEfectivo = esPassword ? (mostrar ? "text" : "password") : type;
  return (
    <div className={["w-full", contenedorClassName].join(" ")}>
      <div
        className={[
          "flex min-h-12 items-center gap-2 rounded-md border-2 px-3.5 transition-[border-color,box-shadow] duration-[120ms] ease-standard",
          disabled
            ? "border-border bg-surface-muted"
            : error
              ? "border-error bg-fondo"
              : "border-border-strong bg-fondo focus-within:border-border-focus focus-within:shadow-focus",
        ].join(" ")}
      >
        {icon && <Icono name={icon} size={18} className="shrink-0 text-text-subtle" />}
        {prefix && <span className="text-[14px] font-semibold text-text-muted">{prefix}</span>}
        <input
          id={id}
          ref={ref}
          type={tipoEfectivo}
          disabled={disabled}
          className={[
            "min-w-0 flex-1 border-none bg-transparent py-3 text-[14px] font-medium outline-none",
            disabled ? "text-text-disabled" : "text-text-strong",
            "placeholder:text-text-subtle",
            className,
          ].join(" ")}
          {...rest}
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="inline-flex cursor-pointer border-none bg-transparent p-1 text-text-muted"
          >
            <Icono name={mostrar ? "eye-off" : "eye"} size={18} />
          </button>
        )}
      </div>
      {error && errorText ? (
        <div className="mt-1.5 flex items-center gap-[5px] text-[13px] font-medium text-error">
          <Icono name="alert" size={14} color="var(--color-error)" />
          <span>{errorText}</span>
        </div>
      ) : helpText ? (
        <div className="mt-1.5 text-[13px] font-medium text-text-muted">{helpText}</div>
      ) : null}
    </div>
  );
}

/* ── FormField — label + input + ayuda/error inline. ── */

export function CampoFormulario({
  label,
  htmlFor,
  required = false,
  error = false,
  errorText,
  helpText,
  children,
  ...inputProps
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  helpText?: string;
  children?: ReactNode;
} & Omit<InputProps, "children">) {
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children ?? <Input id={htmlFor} error={error} errorText={errorText} helpText={helpText} {...inputProps} />}
      {children && error && errorText && (
        <div className="mt-1.5 text-[13px] font-medium text-error">{errorText}</div>
      )}
      {children && !error && helpText && (
        <div className="mt-1.5 text-[13px] font-medium text-text-muted">{helpText}</div>
      )}
    </div>
  );
}

/* ── Chip — pill de filtro. Activo = fill btn-primary con texto blanco. ── */

export function Chip({
  children,
  active = false,
  disabled = false,
  onClick,
  removable = false,
  onRemove,
  count,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center gap-1.5 rounded-pill border-2 px-4 py-2.5 text-[14px] font-semibold leading-none",
        "transition-[background,border-color] duration-[120ms] ease-standard",
        disabled
          ? "cursor-not-allowed border-transparent bg-surface-muted text-text-disabled"
          : active
            ? "cursor-pointer border-transparent bg-btn-primary text-white"
            : "cursor-pointer border-border-strong bg-fondo text-text-strong hover:bg-superficie",
      ].join(" ")}
    >
      <span>{children}</span>
      {count != null && <span className="text-[12px] font-bold opacity-90">{count}</span>}
      {removable && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="-mr-1 inline-flex"
        >
          <Icono name="close" size={14} />
        </span>
      )}
    </button>
  );
}

/* ── Toggle — switch 44×24, thumb 18. ── */

export function Toggle({
  checked = false,
  disabled = false,
  onChange,
  ariaLabel,
}: {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={[
        "relative h-6 w-11 shrink-0 rounded-pill border-none p-0 transition-[background] duration-200 ease-standard",
        disabled ? "cursor-not-allowed bg-border opacity-60" : checked ? "cursor-pointer bg-primario" : "cursor-pointer bg-border-strong",
      ].join(" ")}
    >
      <span
        className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(43_22_32_/_0.28)] transition-[left] duration-200 ease-standard"
        style={{ left: checked ? 23 : 3 }}
      />
    </button>
  );
}

/* ── QuantityStepper — límites min/stock deshabilitan botones. ── */

export function StepperCantidad({
  value = 1,
  min = 1,
  max = 99,
  onChange,
  size = "md",
}: {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? 32 : 40;
  const enMin = value <= min;
  const enMax = value >= max;
  const claseBoton = (inhabilitado: boolean) =>
    [
      "inline-flex items-center justify-center rounded-sm border-none bg-transparent",
      inhabilitado ? "cursor-not-allowed text-text-disabled" : "cursor-pointer text-secundario",
    ].join(" ");
  return (
    <div className="inline-flex items-center rounded-pill border-2 border-border-strong bg-fondo">
      <button
        type="button"
        aria-label="Restar"
        disabled={enMin}
        onClick={() => !enMin && onChange?.(value - 1)}
        className={claseBoton(enMin)}
        style={{ width: dim, height: dim }}
      >
        <Icono name="minus" size={18} />
      </button>
      <span className="min-w-7 text-center text-[15px] font-bold text-text-strong">{value}</span>
      <button
        type="button"
        aria-label="Sumar"
        disabled={enMax}
        onClick={() => !enMax && onChange?.(value + 1)}
        className={claseBoton(enMax)}
        style={{ width: dim, height: dim }}
      >
        <Icono name="plus" size={18} />
      </button>
    </div>
  );
}

/* ── VariantSelector — agotada: visible, tachada, deshabilitada, con mini
      badge "Agotado" (regla vinculante: nunca se oculta). ── */

export interface OpcionVariante {
  value: string;
  label: string;
  price?: number | null; // centavos
  soldOut?: boolean;
}

export function SelectorVariantes({
  options = [],
  value,
  onChange,
  formatearPrecio,
}: {
  options: OpcionVariante[];
  value?: string;
  onChange?: (v: string) => void;
  formatearPrecio: (centavos: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const seleccionada = opt.value === value;
        const agotada = !!opt.soldOut;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={agotada}
            aria-pressed={seleccionada}
            onClick={() => !agotada && onChange?.(opt.value)}
            className={[
              "relative flex min-w-[76px] flex-col items-start gap-0.5 rounded-md border-2 px-3.5 py-2.5",
              "transition-[border-color,background] duration-[120ms] ease-standard",
              agotada
                ? "cursor-not-allowed border-border-strong bg-surface-muted opacity-70"
                : seleccionada
                  ? "cursor-pointer border-primario bg-superficie"
                  : "cursor-pointer border-border-strong bg-fondo",
            ].join(" ")}
          >
            <span
              className={[
                "text-[14px] font-bold",
                agotada ? "text-text-muted line-through" : "text-text-strong",
              ].join(" ")}
            >
              {opt.label}
            </span>
            {opt.price != null && (
              <span className={["text-[12px] font-semibold", agotada ? "text-text-subtle" : "text-text-muted"].join(" ")}>
                {formatearPrecio(opt.price)}
              </span>
            )}
            {agotada && (
              <span className="absolute -top-2 -right-1.5 rounded-pill bg-btn-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-white">
                Agotado
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── EditableVariantRow — largo + precio + existencias + eliminar (panel). ── */

export function FilaVarianteEditable({
  largo,
  precio,
  existencias,
  onChange,
  onRemove,
  errores = {},
}: {
  largo: string;
  precio: string;
  existencias: string;
  onChange: (cambio: Partial<{ largo: string; precio: string; existencias: string }>) => void;
  onRemove: () => void;
  errores?: Partial<{ largo: string; precio: string; existencias: string }>;
}) {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-2 rounded-md bg-surface-muted p-2">
      <Input
        placeholder={'Largo (ej. 20")'}
        value={largo}
        error={!!errores.largo}
        errorText={errores.largo}
        onChange={(e) => onChange({ largo: e.target.value })}
      />
      <Input
        type="number"
        prefix="$"
        placeholder="Precio"
        min={0}
        value={precio}
        error={!!errores.precio}
        errorText={errores.precio}
        onChange={(e) => onChange({ precio: e.target.value })}
      />
      <Input
        type="number"
        placeholder="Existencias"
        min={0}
        value={existencias}
        error={!!errores.existencias}
        errorText={errores.existencias}
        onChange={(e) => onChange({ existencias: e.target.value })}
      />
      <BotonIcono icon="trash" variant="ghost" ariaLabel="Eliminar variante" onClick={onRemove} />
    </div>
  );
}

/* ── ImageUploader — vacío · preview · error con requisitos exactos. ── */

export function SubidorImagen({
  preview,
  error = false,
  errorText,
  hint = "PNG o JPG · máx 5 MB · mín 800×800",
  onSelect,
  onRemove,
}: {
  preview?: string;
  error?: boolean;
  errorText?: string;
  hint?: string;
  onSelect?: (archivo: File | null) => void;
  onRemove?: () => void;
}) {
  const [arrastrando, setArrastrando] = useState(false);
  return (
    <div className="w-full">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          onSelect?.(e.dataTransfer.files?.[0] ?? null);
        }}
        className={[
          "relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 text-center",
          "transition-[border-color,background] duration-[120ms] ease-standard",
          error
            ? "border-error bg-error-surface"
            : arrastrando
              ? "border-primario bg-superficie"
              : preview
                ? "border-border-strong bg-fondo"
                : "border-border-strong bg-surface-muted",
        ].join(" ")}
      >
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => onSelect?.(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <>
            {/* Vista previa local (object URL) — <img> a propósito */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa" className="max-h-32 max-w-full rounded-md object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onRemove?.();
              }}
              aria-label="Quitar imagen"
              className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-inverso text-sobre-inverso"
            >
              <Icono name="close" size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-strong text-secundario">
              <Icono name="upload" size={22} />
            </span>
            <span className="text-[14px] font-semibold text-text-strong">Arrastra o toca para subir</span>
            <span className="text-[12px] font-medium text-text-muted">{hint}</span>
          </>
        )}
      </label>
      {error && errorText && (
        <div className="mt-1.5 flex items-center gap-[5px] text-[13px] font-medium text-error">
          <Icono name="alert" size={14} color="var(--color-error)" />
          <span>{errorText}</span>
        </div>
      )}
    </div>
  );
}
