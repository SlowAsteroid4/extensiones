import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import { LoginCliente } from "@/modules/cuenta/ui/login-cliente";

// C2 · Login (H08).
export default async function PaginaLogin() {
  const sesion = await auth();
  if (sesion?.user?.id) redirect("/cuenta");
  return (
    <Suspense>
      <LoginCliente />
    </Suspense>
  );
}
