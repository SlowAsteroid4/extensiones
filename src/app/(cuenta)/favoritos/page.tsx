import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import { FavoritosPagina } from "@/modules/cuenta/ui/favoritos-pagina";

// C4 · Mis favoritos (H11, H12) — requiere sesión; al expirar vuelve al login
// y regresa aquí (volverA).
export default async function PaginaFavoritos() {
  const sesion = await auth();
  if (!sesion?.user?.id) redirect(`/login?volverA=${encodeURIComponent("/favoritos")}`);
  return <FavoritosPagina />;
}
