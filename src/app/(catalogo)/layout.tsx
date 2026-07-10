import type { ReactNode } from "react";
import { BotonWhatsApp } from "@/modules/catalogo/ui/boton-whatsapp";

// Layout público de catálogo (flujo A). El CTA de WhatsApp del layout es para
// DUDAS (regla vinculante 3.D); se oculta solo si falta el número en env.
export default function LayoutCatalogo({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1">{children}</div>
      <footer className="mx-auto w-full max-w-[1200px] px-4 pb-6 lg:px-6">
        <div className="lg:max-w-[420px]">
          <BotonWhatsApp />
        </div>
      </footer>
    </div>
  );
}
