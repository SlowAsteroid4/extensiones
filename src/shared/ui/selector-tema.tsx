"use client";
// Selector de tema: un solo botón que cicla claro → oscuro → sistema.
// Se prefirió el ciclo a un grupo de tres botones porque vive en el header,
// donde no sobra ancho; el estado va en el aria-label, no sólo en el icono.
import { SIGUIENTE_TEMA, useTema, type PreferenciaTema } from "@/shared/tema/tema";
import { Icono, type NombreIcono } from "./icono";

const ICONOS: Record<PreferenciaTema, NombreIcono> = {
  claro: "sun",
  oscuro: "moon",
  sistema: "monitor",
};

const NOMBRES: Record<PreferenciaTema, string> = {
  claro: "claro",
  oscuro: "oscuro",
  sistema: "el del sistema",
};

/**
 * @param tono "normal" para fondos de página; "sobre-magenta" para el header
 *   magenta de la tienda, donde el contraste se saca del blanco.
 */
export function SelectorTema({
  tono = "normal",
  size = 40,
  className = "",
}: {
  tono?: "normal" | "sobre-magenta";
  size?: number;
  className?: string;
}) {
  const { preferencia, montado, ciclar } = useTema();

  const pieles =
    tono === "sobre-magenta"
      ? "bg-white/16 text-white hover:bg-white/25"
      : "text-text-strong hover:bg-superficie";

  return (
    <button
      type="button"
      onClick={ciclar}
      // Hasta hidratar no se sabe la preferencia guardada: se reserva el hueco
      // y se omite el label para no anunciar un estado falso.
      aria-label={
        montado
          ? `Tema ${NOMBRES[preferencia]}. Cambiar a tema ${NOMBRES[SIGUIENTE_TEMA[preferencia]]}.`
          : "Cambiar tema"
      }
      title={montado ? `Tema ${NOMBRES[preferencia]}` : undefined}
      className={[
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent",
        "transition-[background,transform] duration-[120ms] ease-standard active:scale-[0.92]",
        pieles,
        className,
      ].join(" ")}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {montado && <Icono name={ICONOS[preferencia]} size={Math.round(size * 0.5)} />}
    </button>
  );
}
