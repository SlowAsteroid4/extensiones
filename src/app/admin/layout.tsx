import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import { EstadoVacio } from "@/shared/ui/feedback";

// Guard del panel (spec §7, mismo criterio que /api/admin/*):
//   sin sesión → login (con retorno) · sesión clienta → 403 VISIBLE.
// Cada llamada del panel al API vuelve a validar el rol server-side.
export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const sesion = await auth();
  if (!sesion?.user?.id) redirect(`/login?volverA=${encodeURIComponent("/admin/productos")}`);

  if (sesion.user.rol !== "admin") {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="flex flex-1 items-center p-4">
          <EstadoVacio
            icon="alert"
            title="No tienes acceso al panel"
            message="Requiere rol de administradora."
            actionLabel="Volver a la tienda"
            actionHref="/catalogo"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
