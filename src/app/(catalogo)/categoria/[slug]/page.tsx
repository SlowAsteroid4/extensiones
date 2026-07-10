import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listarCategorias } from "@/modules/catalogo/consultas";
import { CatalogoCliente } from "@/modules/catalogo/ui/catalogo-cliente";
import { EncabezadoConCarrito } from "@/modules/catalogo/ui/encabezado-con-carrito";

// A2 · Categoría (H01): igual que A1 filtrada por la categoría, con el título
// visible. Categoría sin productos activos → empty state con CTA.
export default async function PaginaCategoria(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const categorias = await listarCategorias();
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  return (
    <>
      <EncabezadoConCarrito />
      <main className="mx-auto w-full max-w-[1200px] p-4 lg:p-6">
        <Suspense>
          <CatalogoCliente categoria={categoria.slug} titulo={categoria.nombre} />
        </Suspense>
      </main>
    </>
  );
}
