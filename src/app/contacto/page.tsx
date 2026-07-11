import { EncabezadoSitio, PieSitio } from "@/modules/sitio/ui/chrome";
import { HeroPagina, Seccion } from "@/modules/sitio/ui/secciones";
import { BotonWhatsApp } from "@/modules/catalogo/ui/boton-whatsapp";

// Placeholder: el nav de Inicio.html enlaza aquí. Contenido completo
// (formulario, ubicación) queda para un encargo aparte; por ahora el canal
// real de contacto (WhatsApp) ya funciona.
export default function Contacto() {
  return (
    <div className="flex min-h-dvh flex-col">
      <EncabezadoSitio />
      <HeroPagina eyebrow="Contacto" title="Hablemos" sub="Muy pronto tendrás aquí todas las formas de contactarnos." />
      <Seccion>
        <div className="flex flex-col items-start gap-4">
          <p className="m-0 max-w-[520px] text-[15px] font-medium leading-[1.6] text-text-muted">
            Por ahora, escríbenos directo por WhatsApp para dudas de tono o de tu pedido.
          </p>
          <BotonWhatsApp etiqueta="Escríbenos por WhatsApp" size="lg" fullWidth={false} />
        </div>
      </Seccion>
      <PieSitio />
    </div>
  );
}
