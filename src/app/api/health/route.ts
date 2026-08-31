import { prisma } from "@/shared/db/client";

// T9 · Health check (BLOQUE 4): verifica conexión a la DB y responde estado.
// Público a propósito, pero sin filtrar NADA sensible: ni versiones, ni
// strings de conexión, ni detalle del error (solo "ok"/"error").
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { ok: true, db: "ok" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json(
      { ok: false, db: "error" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
