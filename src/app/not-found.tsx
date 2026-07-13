// 404 global — patrón A5/H19: sin callejones, siempre hay salida al catálogo.
import { EstadoVacio } from "@/shared/ui/feedback";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 items-center p-4">
        <EstadoVacio
          icon="alert"
          title="Esta página no está disponible"
          message="Explora el resto del catálogo."
          actionLabel="Ver el catálogo"
          actionHref="/catalogo"
        />
      </div>
    </div>
  );
}
