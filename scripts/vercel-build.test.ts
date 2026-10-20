import { describe, expect, it } from "vitest";
import { pasosDeBuild } from "./vercel-build";

const comandos = (env: string | undefined) => pasosDeBuild(env).map((p) => p.comando.join(" "));

describe("vercel-build · migraciones solo en Producción", () => {
  it("production: genera, migra y compila, en ese orden", () => {
    expect(comandos("production")).toEqual([
      "prisma generate",
      "prisma migrate deploy",
      "next build",
    ]);
  });

  it.each(["preview", "development", "Production", "PRODUCTION", " production", "", undefined])(
    "%j: NO migra (falla cerrado)",
    (env) => {
      expect(comandos(env)).toEqual(["prisma generate", "next build"]);
    }
  );
});
