"use client";
// Estado del tema (claro / oscuro / sistema).
//
// El tema RESUELTO ya está aplicado en <html data-tema> antes del primer paint
// por ScriptTema; este módulo sólo lo lee, lo persiste y lo cambia. Por eso no
// hay parpadeo blanco al recargar en oscuro.
//
// La fuente de verdad son dos sistemas EXTERNOS a React (localStorage y
// matchMedia), así que se leen con useSyncExternalStore en vez de copiarlos a
// useState desde un efecto: así también se sincronizan solas las pestañas
// abiertas (evento "storage") y los cambios de tema del SO.
//
// No hay provider a propósito: el store vive en el módulo, así que useTema
// funciona en cualquier componente (y en cualquier test) sin envolver nada.
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { CLAVE_TEMA } from "./clave";

/** Lo que elige la usuaria. "sistema" sigue a prefers-color-scheme. */
export type PreferenciaTema = "claro" | "oscuro" | "sistema";
/** Lo que termina pintado. */
export type TemaResuelto = "claro" | "oscuro";

// CLAVE_TEMA NO se re-exporta aquí a propósito: quien la necesite la importa
// de ./clave. Re-exportarla desde este módulo "use client" es justo lo que
// hacía llegar undefined al Server Component que arma el script del <head>.
const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

/* ── Store externo ─────────────────────────────────────────────────────── */

// La instantánea es un string "preferencia|resuelto" a propósito: debe ser
// estable por valor entre llamadas o useSyncExternalStore entra en bucle.
type Instantanea = `${PreferenciaTema}|${TemaResuelto}`;

const INSTANTANEA_SERVIDOR: Instantanea = "sistema|claro";

const oyentes = new Set<() => void>();
let cache: Instantanea | null = null;

function esPreferencia(v: unknown): v is PreferenciaTema {
  return v === "claro" || v === "oscuro" || v === "sistema";
}

function leerPreferencia(): PreferenciaTema {
  try {
    const guardada = window.localStorage.getItem(CLAVE_TEMA);
    return esPreferencia(guardada) ? guardada : "sistema";
  } catch {
    // Safari en modo privado puede tirar al leer localStorage.
    return "sistema";
  }
}

// matchMedia falta en jsdom y en webviews viejas: sin él se asume claro y el
// selector sigue funcionando en modo manual.
function consultaOscuro(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(CONSULTA_OSCURO) : null;
}

function temaDelSistema(): TemaResuelto {
  return consultaOscuro()?.matches ? "oscuro" : "claro";
}

function calcular(): Instantanea {
  const preferencia = leerPreferencia();
  const resuelto = preferencia === "sistema" ? temaDelSistema() : preferencia;
  return `${preferencia}|${resuelto}`;
}

function instantanea(): Instantanea {
  cache ??= calcular();
  return cache;
}

/** Recalcula, pinta el <html> y avisa a React si algo cambió. */
function revalidar() {
  const previa = cache;
  cache = calcular();
  if (cache === previa) return;
  document.documentElement.dataset.tema = resueltoDe(cache);
  for (const avisar of oyentes) avisar();
}

function suscribir(alCambiar: () => void) {
  oyentes.add(alCambiar);
  const mq = consultaOscuro();
  // "storage" sólo dispara en las OTRAS pestañas: sincroniza el tema entre ellas.
  mq?.addEventListener("change", revalidar);
  window.addEventListener("storage", revalidar);
  return () => {
    oyentes.delete(alCambiar);
    mq?.removeEventListener("change", revalidar);
    window.removeEventListener("storage", revalidar);
  };
}

function guardar(preferencia: PreferenciaTema) {
  try {
    window.localStorage.setItem(CLAVE_TEMA, preferencia);
  } catch {
    // Sin persistencia (modo privado): el tema vale para esta pestaña.
  }
  revalidar();
}

function preferenciaDe(s: Instantanea): PreferenciaTema {
  return s.split("|")[0] as PreferenciaTema;
}

function resueltoDe(s: Instantanea): TemaResuelto {
  return s.split("|")[1] as TemaResuelto;
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

// Idioma conocido de "¿ya hidraté?": el servidor dice false, el cliente true.
const sinSuscripcion = () => () => {};

export interface ValorTema {
  /** Preferencia elegida, incluye "sistema". */
  preferencia: PreferenciaTema;
  /** Tema realmente pintado ("sistema" ya resuelto). */
  resuelto: TemaResuelto;
  /** false en SSR y hasta hidratar: evita pintar el icono equivocado. */
  montado: boolean;
  setPreferencia: (p: PreferenciaTema) => void;
  /** Cicla claro → oscuro → sistema. */
  ciclar: () => void;
}

/** Orden del ciclo del selector; exportado para poder anunciarlo en el aria-label. */
export const SIGUIENTE_TEMA: Record<PreferenciaTema, PreferenciaTema> = {
  claro: "oscuro",
  oscuro: "sistema",
  sistema: "claro",
};

export function useTema(): ValorTema {
  const estado = useSyncExternalStore(suscribir, instantanea, () => INSTANTANEA_SERVIDOR);
  const montado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );

  const preferencia = preferenciaDe(estado);
  const resuelto = resueltoDe(estado);

  const setPreferencia = useCallback((p: PreferenciaTema) => guardar(p), []);
  const ciclar = useCallback(() => guardar(SIGUIENTE_TEMA[preferenciaDe(instantanea())]), []);

  return useMemo<ValorTema>(
    () => ({ preferencia, resuelto, montado, setPreferencia, ciclar }),
    [preferencia, resuelto, montado, setPreferencia, ciclar],
  );
}
