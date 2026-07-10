import { notFound } from "next/navigation";
import { prisma } from "@/shared/db/client";
import { ProductoForm } from "@/modules/admin/ui/producto-form";
import type { ProductoAdmin } from "@/modules/admin/ui/comunes";

// D2 · Editar producto (H16). El guard vive en el layout de /admin; las
// mutaciones vuelven a validar el rol en el API.
export default async function PaginaAdminEditarProducto(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true, slug: true } },
      variantes: { orderBy: { largo_pulgadas: "asc" } },
    },
  });
  if (!producto) notFound();

  const inicial: ProductoAdmin = {
    id: producto.id,
    nombre_tono: producto.nombre_tono,
    slug: producto.slug,
    familia_tono: producto.familia_tono,
    tipo: producto.tipo,
    descripcion: producto.descripcion,
    fotos: producto.fotos,
    activo: producto.activo,
    categoria: producto.categoria,
    variantes: producto.variantes.map((v) => ({
      id: v.id,
      largo_pulgadas: v.largo_pulgadas,
      precio_mxn: v.precio_mxn,
      existencias: v.existencias,
      sku: v.sku,
    })),
  };

  return <ProductoForm inicial={inicial} />;
}
