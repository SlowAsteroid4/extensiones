import { formatearPrecioMXN } from "@/shared/precio/formatear";

// Home placeholder (encargo T3): demuestra los tokens. La UI real del catálogo
// llega en los encargos de M-CAT.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="text-h1 text-secundario">Extensiones</h1>
        <p className="text-cuerpo mt-2 max-w-md">
          Extensiones de cabello 100% natural. Muy pronto: catálogo completo por
          tono, largo y tipo.
        </p>
      </header>

      <section className="w-full max-w-sm rounded-2xl bg-superficie p-6">
        <h2 className="text-h2">Vista previa de ficha</h2>
        <p className="text-cuerpo-sm mt-1">Rubio Dorado Miel · 22&Prime;</p>
        <p className="text-precio text-secundario mt-3">{formatearPrecioMXN(249000)}</p>
        <button
          type="button"
          className="mt-4 w-full rounded-full bg-primario px-6 py-3 text-sm font-semibold text-white"
        >
          Próximamente
        </button>
      </section>
    </main>
  );
}
