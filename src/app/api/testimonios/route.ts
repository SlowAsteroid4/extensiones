import { listarTestimonios } from "@/modules/catalogo/consultas";

// Testimonios públicos: solo activos, por `orden`.
export async function GET() {
  return Response.json(await listarTestimonios());
}
