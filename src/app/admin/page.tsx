import { redirect } from "next/navigation";

// El panel abre en la lista de productos (D1).
export default function PaginaAdmin() {
  redirect("/admin/productos");
}
