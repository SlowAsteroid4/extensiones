import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import { CuentaCliente } from "@/modules/cuenta/ui/cuenta-cliente";

// C3 · Mi cuenta (H09) — requiere sesión.
export default async function PaginaCuenta() {
  const sesion = await auth();
  if (!sesion?.user?.id) redirect(`/login?volverA=${encodeURIComponent("/cuenta")}`);
  return (
    <CuentaCliente
      nombre={sesion.user.name ?? sesion.user.email ?? "Tu cuenta"}
      email={sesion.user.email ?? ""}
    />
  );
}
