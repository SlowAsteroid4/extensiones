"use client";
// C1 · medidor de contraseña del alta. Pinta EXACTAMENTE lo que decide el
// servidor: la evaluación viene de `@/shared/validacion/password`, el mismo
// módulo que valida el POST, así nunca se ve un check verde en algo que el
// backend rechaza.
//
// Dos bloques, que no son lo mismo y por eso se ven distinto:
//   · Requisitos → obligatorios. Cada uno pasa de círculo vacío a check verde
//     con un "pop" (la animación solo se dispara al cambiar, porque el <span>
//     se remonta con la key).
//   · Fuerza + variedad → informativos (OWASP ASVS 2.1.9 desaconseja exigir
//     composición). Suben la barra, nunca bloquean el botón.
import type { EvaluacionPassword, NivelFuerza } from "@/shared/validacion/password";
import { Icono } from "@/shared/ui/icono";

const COLOR_FUERZA: Record<NivelFuerza, string> = {
  0: "var(--color-border)",
  1: "var(--color-error)",
  2: "var(--color-primario)",
  3: "var(--color-success)",
  4: "var(--color-success)",
};

function FilaRequisito({ etiqueta, cumple }: { etiqueta: string; cumple: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span
        // La key cambia con `cumple`: React remonta el nodo y la animación de
        // "pop" vuelve a correr en cada transición pendiente → cumplido.
        key={cumple ? "listo" : "pendiente"}
        className={cumple ? "inline-flex animate-ls-check-pop" : "inline-flex"}
      >
        {cumple ? (
          <Icono name="check-circle" size={17} color="var(--color-success)" />
        ) : (
          <span className="block h-[13px] w-[13px] rounded-full border-2 border-border-strong" />
        )}
      </span>
      <span
        className={[
          "text-[13px] font-medium transition-colors duration-200 ease-standard",
          cumple ? "text-success" : "text-text-muted",
        ].join(" ")}
      >
        <span className="sr-only">{cumple ? "Cumplido: " : "Falta: "}</span>
        {etiqueta}
      </span>
    </li>
  );
}

export function MedidorPassword({
  evaluacion,
  id,
  vacia,
}: {
  evaluacion: EvaluacionPassword;
  id?: string;
  /** Sin nada escrito se muestra la guía, pero sin marcar nada en rojo. */
  vacia: boolean;
}) {
  const { fuerza, etiquetaFuerza, requisitos, senales } = evaluacion;
  // El texto pequeño nunca usa text-subtle: sobre surface-muted se queda en
  // 3.2:1 y no llega a AA (auditoría de contraste del encargo del modo oscuro).
  const colorEtiqueta =
    vacia || fuerza === 2 ? "text-text-muted" : fuerza <= 1 ? "text-error" : "text-success";

  return (
    <div
      id={id}
      className="animate-ls-item-in mt-2.5 rounded-lg border border-border bg-surface-muted p-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-text-muted">
          Seguridad
        </span>
        <span
          aria-live="polite"
          className={[
            "text-[13px] font-bold transition-colors duration-200 ease-standard",
            colorEtiqueta,
          ].join(" ")}
        >
          {vacia ? "Aún sin contraseña" : etiquetaFuerza}
        </span>
      </div>

      {/* Barra de 4 tramos: se llenan y cambian de color con transición. */}
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((tramo) => (
          <span
            key={tramo}
            className="h-1.5 flex-1 rounded-pill transition-[background-color] duration-300 ease-standard"
            style={{ backgroundColor: tramo <= fuerza ? COLOR_FUERZA[fuerza] : "var(--color-border)" }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {requisitos.map((requisito) => (
          <FilaRequisito
            key={requisito.id}
            etiqueta={requisito.etiqueta}
            cumple={!vacia && requisito.cumple}
          />
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-medium text-text-muted">Suma fuerza:</span>
        {senales.map((senal) => (
          <span
            key={senal.id}
            className={[
              "rounded-pill border px-2 py-0.5 text-[11px] font-semibold",
              "transition-[background-color,border-color,color] duration-200 ease-standard",
              !vacia && senal.cumple
                ? "border-success-border bg-success-surface text-success"
                : "border-border bg-fondo text-text-muted",
            ].join(" ")}
          >
            <span className="sr-only">{!vacia && senal.cumple ? "incluye " : "sin "}</span>
            {senal.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}
