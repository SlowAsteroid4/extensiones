import "dotenv/config";
import { defineConfig } from "prisma/config";

// Esta config la lee SOLO la CLI de Prisma (migrate, db seed, studio). El
// runtime de la app abre su propia conexión en src/shared/db/client.ts.
//
// T8 · Neon: las migraciones NO pueden ir por el pooler (PgBouncer en modo
// transacción rompe el DDL con sesión). Por eso la CLI usa DIRECT_URL —la
// cadena directa, sin `-pooler` en el host— y la app usa DATABASE_URL —la
// pooled, que es lo que aguanta el serverless—. En local no hay pooler: si
// DIRECT_URL no está definida, cae a DATABASE_URL y todo sigue igual.
//
// Ojo: el tipo `Datasource` de Prisma 7 no admite `directUrl` (eso era del
// bloque `datasource` de Prisma 5/6); la separación se hace aquí, por capa.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    // Solo para `prisma migrate diff/dev` (validación de migraciones); opcional.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
