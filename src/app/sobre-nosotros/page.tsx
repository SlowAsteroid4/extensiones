import { EncabezadoSitio, PieSitio } from "@/modules/sitio/ui/chrome";
import { HeroPagina, Seccion } from "@/modules/sitio/ui/secciones";
import { Boton } from "@/shared/ui/boton";

// Placeholder: el nav de Inicio.html enlaza aquí. Contenido completo
// (historia, equipo) queda para un encargo aparte; esta página evita que el
// link rompa mientras tanto.
export default function SobreNosotros() {
  return (
    <div className="flex min-h-dvh flex-col">
      <EncabezadoSitio />
      <HeroPagina
        eyebrow="Sobre nosotros"
        title="Nuestra historia"
        sub="Muy pronto contamos aquí la historia detrás de Lizzy & Stephy."
      />
      <Seccion>
        <div className="flex flex-col items-start gap-4">
          <p className="m-0 max-w-[520px] text-[15px] font-medium leading-[1.6] text-text-muted">
            Estamos preparando esta página. Mientras tanto, puedes ver todos nuestros tonos disponibles en el
            catálogo.
          </p>
          <Boton variant="primary" iconRight="arrow-right" href="/catalogo">
            Ver catálogo
          </Boton>
        </div>
      </Seccion>
      <PieSitio />
    </div>
  );
}
