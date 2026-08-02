"use client";
// Feedback del DS "Magenta audaz": Skeleton, Spinner, Toast, EmptyState, Modal.
// Patrones vinculantes: skeleton→modal de error a los 15s · toasts transitorios ·
// empty states SIEMPRE con CTA · overlay ciruela sin blur.
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Boton, type VarianteBoton } from "./boton";
import { Icono, type NombreIcono } from "./icono";

/* ── Skeleton — pulso 1400ms. Variantes: card · ficha · text · line · block. ── */

function Hueso({ w = "100%", h = 14, r, className = "" }: { w?: number | string; h?: number; r?: string; className?: string }) {
  return (
    <div
      className={["animate-ls-pulse bg-skeleton-base", className].join(" ")}
      style={{ width: w, height: h, borderRadius: r ?? "var(--radius-sm)" }}
    />
  );
}

export function Esqueleto({ variant = "line", className = "" }: { variant?: "card" | "ficha" | "text" | "line" | "block"; className?: string }) {
  if (variant === "card") {
    return (
      <div className={["rounded-xl bg-fondo p-3 shadow-card", className].join(" ")}>
        <Hueso h={150} r="var(--radius-lg)" />
        <div className="h-3" />
        <Hueso w="70%" h={14} />
        <div className="h-2" />
        <Hueso w="45%" h={12} />
        <div className="h-2.5" />
        <Hueso w="35%" h={18} />
      </div>
    );
  }
  if (variant === "ficha") {
    return (
      <div className={["grid gap-4", className].join(" ")}>
        <Hueso h={280} r="var(--radius-xl)" />
        <Hueso w="60%" h={24} />
        <Hueso w="40%" h={16} />
        <div className="flex gap-2">
          <Hueso w={70} h={44} r="var(--radius-md)" />
          <Hueso w={70} h={44} r="var(--radius-md)" />
          <Hueso w={70} h={44} r="var(--radius-md)" />
        </div>
        <Hueso h={48} r="var(--radius-pill)" />
      </div>
    );
  }
  if (variant === "text") {
    return (
      <div className={["grid gap-2", className].join(" ")}>
        <Hueso w="100%" />
        <Hueso w="92%" />
        <Hueso w="78%" />
      </div>
    );
  }
  if (variant === "block") return <Hueso h={80} r="var(--radius-md)" className={className} />;
  return <Hueso className={className} />;
}

/* ── Spinner ── */

export function Spinner({ size = 20, tone = "primary", style }: { size?: number; tone?: "primary" | "light"; style?: CSSProperties }) {
  const claro = tone === "light";
  return (
    <span
      role="status"
      aria-label="Cargando"
      className="inline-block animate-ls-spin rounded-full"
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, Math.round(size / 10))}px solid ${claro ? "rgb(255 255 255 / 0.4)" : "rgb(198 0 110 / 0.25)"}`,
        // tone="light" gira sobre un relleno magenta: va blanco fijo, no
        // --color-fondo, que en oscuro es casi negro.
        borderTopColor: claro ? "var(--color-sobre-fill)" : "var(--color-secundario)",
        ...style,
      }}
    />
  );
}

/* ── Toast — fondo ciruela, acción en acento. Nunca bloquea la pantalla. ── */

const TONOS_TOAST: Record<string, { icon: NombreIcono; accent: string }> = {
  info: { icon: "info", accent: "var(--color-secundario)" },
  error: { icon: "x-circle", accent: "var(--color-error)" },
  success: { icon: "check-circle", accent: "var(--color-success)" },
};

export function Toast({
  tone = "info",
  message,
  actionLabel,
  onAction,
  onClose,
  className = "",
}: {
  tone?: "info" | "error" | "success";
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const t = TONOS_TOAST[tone] ?? TONOS_TOAST.info;
  return (
    <div
      role="status"
      className={[
        "flex w-full max-w-[420px] animate-ls-toast-in items-center gap-3 rounded-md bg-inverso px-3.5 py-3 text-sobre-inverso shadow-toast",
        className,
      ].join(" ")}
    >
      <Icono name={t.icon} size={20} color={t.accent} />
      <span className="flex-1 text-[14px] font-medium leading-[1.4]">{message}</span>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="cursor-pointer whitespace-nowrap border-none bg-transparent px-1.5 py-1 text-[14px] font-bold text-acento"
        >
          {actionLabel}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="inline-flex cursor-pointer border-none bg-transparent p-0.5 text-white/70"
        >
          <Icono name="close" size={16} />
        </button>
      )}
    </div>
  );
}

/* Dock del toast: anclado abajo (como ToastDock del diseño). */
export function ToastDock({ children }: { children: ReactNode }) {
  return <div className="fixed inset-x-4 bottom-4 z-[1100] flex justify-center">{children}</div>;
}

/* ── EmptyState — ícono + mensaje + CTA de salida. Nunca pantalla en blanco. ── */

export function EstadoVacio({
  icon = "heart",
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  onSecondary,
}: {
  icon?: NombreIcono;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-[360px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="mb-1 inline-flex h-[72px] w-[72px] items-center justify-center rounded-full bg-superficie text-primario">
        <Icono name={icon} size={34} />
      </span>
      <h3 className="m-0 text-h3 font-extrabold text-text-strong">{title}</h3>
      {message && <p className="m-0 text-[14px] font-medium leading-[1.5] text-text-muted">{message}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {actionLabel && (
          <Boton variant="primary" href={actionHref} onClick={onAction}>
            {actionLabel}
          </Boton>
        )}
        {secondaryLabel && (
          <Boton variant="secondary" href={secondaryHref} onClick={onSecondary}>
            {secondaryLabel}
          </Boton>
        )}
      </div>
    </div>
  );
}

/* ── Modal — base · error (Reintentar/Volver) · confirm-destructive · session.
      Overlay ciruela 55%, radio 28, entra con ls-modal-in. ── */

const PRESETS_MODAL: Record<string, { icon: NombreIcono | null; primaryVariant: VarianteBoton; tono: string }> = {
  error: { icon: "alert", primaryVariant: "primary", tono: "var(--color-error)" },
  "confirm-destructive": { icon: "trash", primaryVariant: "destructive", tono: "var(--color-error)" },
  session: { icon: "user", primaryVariant: "primary", tono: "var(--color-primario)" },
  base: { icon: null, primaryVariant: "primary", tono: "var(--color-primario)" },
};

export function Modal({
  open = true,
  variant = "base",
  title,
  children,
  icon,
  primaryLabel,
  onPrimary,
  primaryLoading = false,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
  onClose,
}: {
  open?: boolean;
  variant?: keyof typeof PRESETS_MODAL;
  title: string;
  children?: ReactNode;
  icon?: NombreIcono;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!open || !onClose) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [open, onClose]);

  if (!open) return null;
  const p = PRESETS_MODAL[variant] ?? PRESETS_MODAL.base;
  const iconoFinal = icon ?? p.icon;
  const superficieError = variant === "error" || variant === "confirm-destructive";
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[1000] flex items-center justify-center bg-overlay p-5">
      <div className="relative w-full max-w-[400px] animate-ls-modal-in rounded-2xl bg-fondo p-6 shadow-modal">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-superficie text-text-strong"
          >
            <Icono name="close" size={18} />
          </button>
        )}
        {iconoFinal && (
          <span
            className={[
              "mb-3 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full",
              superficieError ? "bg-error-surface" : "bg-superficie",
            ].join(" ")}
            style={{ color: p.tono }}
          >
            <Icono name={iconoFinal} size={26} />
          </span>
        )}
        <h2 className="mb-2 mt-0 text-h2 font-extrabold leading-[1.25] text-text-strong">{title}</h2>
        <div className="text-[14px] font-medium leading-[1.5] text-text-muted">{children}</div>
        {(primaryLabel || secondaryLabel || tertiaryLabel) && (
          <div className="mt-5 flex flex-col gap-2">
            {primaryLabel && (
              <Boton variant={p.primaryVariant} fullWidth loading={primaryLoading} onClick={onPrimary}>
                {primaryLabel}
              </Boton>
            )}
            {secondaryLabel && (
              <Boton variant="secondary" fullWidth onClick={onSecondary}>
                {secondaryLabel}
              </Boton>
            )}
            {tertiaryLabel && (
              <button
                type="button"
                onClick={onTertiary}
                className="cursor-pointer border-none bg-transparent p-2 text-[14px] font-semibold text-text-muted"
              >
                {tertiaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
