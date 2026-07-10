import { notFound } from "next/navigation";
import { obtenerProductoPorSlug } from "@/modules/catalogo/consultas";
import { FichaCliente } from "@/modules/catalogo/ui/ficha-cliente";
import type { FichaAPI } from "@/modules/catalogo/ui/tipos";

// A4 · Ficha de producto (H03, H10). Misma fuente de verdad que
// GET /api/productos/[slug]: TODAS las variantes (agotadas incluidas);
// inactivo o inexistente → A5 (not-found diseñado).
export default async function PaginaProducto(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const producto = await obtenerProductoPorSlug(slug);
  if (!producto) notFound();

  const ficha: FichaAPI = {
    id: producto.id,
    nombre_tono: producto.nombre_tono,
    slug: producto.slug,
    familia_tono: producto.familia_tono,
    tipo: producto.tipo,
    descripcion: producto.descripcion,
    fotos: producto.fotos,
    categoria: {
      id: producto.categoria.id,
      nombre: producto.categoria.nombre,
      slug: producto.categoria.slug,
    },
    variantes: producto.variantes.map((v) => ({
      id: v.id,
      largo_pulgadas: v.largo_pulgadas,
      precio_mxn: v.precio_mxn,
      existencias: v.existencias,
      sku: v.sku,
    })),
  };

  return <FichaCliente producto={ficha} />;
}
