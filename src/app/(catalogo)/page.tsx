import { Suspense } from "react";
import { CatalogoCliente } from "@/modules/catalogo/ui/catalogo-cliente";
import { EncabezadoConCarrito } from "@/modules/catalogo/ui/encabezado-con-carrito";

// A1 · Home / Catálogo (H01, H13, H14): la clienta ve todo sin preguntar.
export default function Home() {
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
