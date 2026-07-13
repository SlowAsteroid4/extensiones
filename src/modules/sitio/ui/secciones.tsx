// Átomos de composición para páginas de sitio (Inicio, Sobre nosotros,
// Contacto). Portado de claude_design (site-shared.jsx: Section, Eyebrow,
// SectionHead, PhotoBlock, ValueCard, PageHero) a Tailwind + tokens del DS.
import type { ReactNode } from "react";
import { Icono, type NombreIcono } from "@/shared/ui/icono";

export function Seccion({
  id,
  bg = "bg-fondo",
  pad = "py-12 lg:py-16",
  children,
}: {
  id?: string;
  bg?: string;
  pad?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={bg}>
      <div className={["mx-auto w-full max-w-[1200px] px-4 lg:px-6", pad].join(" ")}>{children}</div>
    </section>
  );
}

export function Marbete({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span
      className={[
        "text-eyebrow font-bold uppercase tracking-[0.08em]",
        light ? "text-white/85" : "text-secundario",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function CabezaSeccion({
  eyebrow,
  title,
  sub,
  center = false,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={["mb-8 flex flex-col gap-2", center ? "items-center text-center" : "items-start text-left"].join(" ")}>
      <Marbete>{eyebrow}</Marbete>
      <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.01em] text-text-strong sm:text-[26px] lg:text-[30px]">
        {title}
      </h2>
      {sub && <p className="m-0 max-w-[560px] text-[15px] font-medium leading-[1.55] text-text-muted">{sub}</p>}
    </div>
  );
}

/* Placeholder de foto (rayas diagonales de marca) — mismo patrón que .foto-placeholder. */
export function BloqueFoto({
  ratio = "1 / 1",
  label = "Foto",
  className = "",
}: {
  ratio?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={["foto-placeholder relative overflow-hidden rounded-2xl", className].join(" ")}
      style={{ aspectRatio: ratio }}
    >
      <span className="absolute bottom-4 left-4 text-[11px] font-bold uppercase tracking-[0.08em] text-text-subtle">
        {label}
      </span>
    </div>
  );
}

export function TarjetaValor({ icon, title, text }: { icon: NombreIcono; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-fondo p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-superficie text-secundario">
        <Icono name={icon} size={20} />
      </div>
      <span className="text-[16px] font-bold text-text-strong">{title}</span>
      <p className="m-0 text-[14px] font-medium leading-[1.55] text-text-muted">{text}</p>
    </div>
  );
}

/* Banda hero magenta reutilizable (páginas secundarias: Sobre nosotros, Contacto). */
export function HeroPagina({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="rounded-b-2xl bg-primario text-white">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-4 py-14 lg:px-6 lg:py-16">
        <Marbete light>{eyebrow}</Marbete>
        <h1 className="m-0 text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[36px] lg:text-[44px]">
          {title}
        </h1>
        {sub && <p className="m-0 max-w-[560px] text-[16px] font-medium leading-[1.55] text-white/92">{sub}</p>}
      </div>
    </div>
  );
}
