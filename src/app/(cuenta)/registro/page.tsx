import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import { RegistroCliente } from "@/modules/cuenta/ui/registro-cliente";

// C1 · Registro (H07). Con sesión activa no tiene sentido registrarse.
export default async function PaginaRegistro() {
  const sesion = await auth();
  if (sesion?.user?.id) redirect("/cuenta");
  return (
    <Suspense>
      <RegistroCliente />
    </Suspense>
  );
}
