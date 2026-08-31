// T9 · GET /api/health (BLOQUE 4): DB accesible → 200 · DB caída → 503.
// La DB se mockea para poder simular la caída; la verificación real contra
// producción es parte de la evidencia del encargo. El mock es una función
// plana (no vi.fn): Vitest 4 reporta como "unhandled" los errores lanzados
// dentro de un vi.fn aunque la ruta los atrape.
import { describe, expect, it, vi } from "vitest";

const estadoDb = vi.hoisted(() => ({ caida: false }));

vi.mock("@/shared/db/client", () => ({
  prisma: {
    $queryRaw: async () => {
      if (estadoDb.caida) throw new Error("ECONNREFUSED postgres://usuario:secreto@host/db");
      return [{ "?column?": 1 }];
    },
  },
}));

import { GET as getHealth } from "../health/route";

describe("GET /api/health", () => {
  it("con DB → 200 {ok:true, db:'ok'} y sin caché", async () => {
    estadoDb.caida = false;
    const res = await getHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "ok" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("sin DB → 503 {ok:false, db:'error'} SIN detalle del error", async () => {
    estadoDb.caida = true;
    const res = await getHealth();
    expect(res.status).toBe(503);
    const cuerpo = await res.json();
    expect(cuerpo).toEqual({ ok: false, db: "error" });
    // Nada del mensaje interno (ni host ni credenciales) sale en la respuesta.
    expect(JSON.stringify(cuerpo)).not.toContain("ECONNREFUSED");
  });
});
