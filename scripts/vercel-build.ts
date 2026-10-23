// Build de Vercel (encargo 18). Las migraciones corren SOLO en Producción:
// Preview y Development generan el cliente y compilan, sin tocar ninguna base.
//
// Por qué: Preview y Producción compartían la misma rama de Neon, así que un
// preview ejecutaba `prisma migrate deploy` contra la base de producción y dos
// builds simultáneos peleaban por pg_advisory_lock (P1002 en el deploy del #10).
//
// Falla cerrado: migra únicamente si VERCEL_ENV vale exactamente "production".
// Variable ausente (build local), "preview", "development" o cualquier otro
// valor → no migra. Para migrar a mano en local existe `npm run db:migrate`.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export type Paso = { descripcion: string; comando: string[] };

export function pasosDeBuild(vercelEnv: string | undefined): Paso[] {
  const generar: Paso = { descripcion: "generar cliente Prisma", comando: ["prisma", "generate"] };
  const compilar: Paso = { descripcion: "compilar Next.js", comando: ["next", "build"] };
  if (vercelEnv === "production") {
    return [
      generar,
      { descripcion: "aplicar migraciones pendientes", comando: ["prisma", "migrate", "deploy"] },
      compilar,
    ];
  }
  return [generar, compilar];
}

function main() {
  const entorno = process.env.VERCEL_ENV;
  const pasos = pasosDeBuild(entorno);
  const migra = pasos.some((p) => p.comando[1] === "migrate");
  console.log(
    `[vercel-build] VERCEL_ENV=${entorno ?? "(sin definir)"} → ${
      migra ? "migrate deploy ACTIVO" : "migrate deploy OMITIDO (solo Producción migra)"
    }`
  );
  for (const { descripcion, comando } of pasos) {
    console.log(`[vercel-build] ${descripcion}: ${comando.join(" ")}`);
    const resultado = spawnSync(comando[0], comando.slice(1), { stdio: "inherit", shell: false });
    if (resultado.status !== 0) {
      console.error(`[vercel-build] falló "${comando.join(" ")}" (código ${resultado.status ?? "señal"}).`);
      process.exit(resultado.status ?? 1);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
