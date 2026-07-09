// Corre en cada worker ANTES de importar los módulos bajo prueba: apunta la
// conexión a la base de test que preparó vitest.global-setup.ts.
import "dotenv/config";
import { urlBaseDeTest } from "./prisma/url-test";

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = urlBaseDeTest(process.env.DATABASE_URL);
}
process.env.AUTH_SECRET ??= "secret-solo-para-tests";
