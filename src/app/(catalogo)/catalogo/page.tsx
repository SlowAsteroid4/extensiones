import { Suspense } from "react";
import { CatalogoCliente } from "@/modules/catalogo/ui/catalogo-cliente";
import { EncabezadoConCarrito } from "@/modules/catalogo/ui/encabezado-con-carrito";

// A1 · Catálogo completo (H01, H13, H14): la clienta ve todo sin preguntar.
// Antes vivía en "/"; movido a /catalogo cuando Inicio.html (landing de
// marketing) pasó a ser la home real.
export default function Catalogo() {
  return (
    <>
      <EncabezadoConCarrito />
      <main className="mx-auto w-full max-w-[1200px] p-4 lg:p-6">
        <Suspense>
          <CatalogoCliente conTestimonios titulo="Todo el catálogo" tituloSoloEscritorio />
        </Suspense>
      </main>
    </>
  );
}
