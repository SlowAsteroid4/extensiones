import { auth } from "@/shared/auth/config";
import { CheckoutPagina } from "@/modules/compra/ui/checkout-pagina";

// B2 · Checkout (H05): invitada o con sesión (el correo sale del token;
// cuenta_id NUNCA viaja en el body — lo resuelve la API con la cookie).
export default async function PaginaCheckout() {
  const sesion = await auth();
  return <CheckoutPagina emailSesion={sesion?.user?.email ?? undefined} />;
}
