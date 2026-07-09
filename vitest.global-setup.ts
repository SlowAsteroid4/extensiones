// Corre UNA vez antes de la suite: crea la base de test si falta y la deja
// migrada y seedeada (el seed es idempotente, re-ejecutar es seguro).
import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";
import { NOMBRE_BASE_TEST, urlBaseDeTest } from "./prisma/url-test";

export default async function preparaBaseDeTest() {
  const urlDev = process.env.DATABASE_URL;
  if (!urlDev) {
    throw new Error(
      "DATABASE_URL no definida: los tests de integración necesitan Postgres (ver README)."
    );
  }
  const urlTest = urlBaseDeTest(urlDev);

  const urlAdmin = new URL(urlDev);
  urlAdmin.pathname = "/postgres";
  const cliente = new Client({ connectionString: urlAdmin.toString() });
  await cliente.connect();
  try {
    const existe = await cliente.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      NOMBRE_BASE_TEST,
    ]);
    if (existe.rowCount === 0) {
      await cliente.query(`CREATE DATABASE "${NOMBRE_BASE_TEST}"`);
    }
  } finally {
    await cliente.end();
  }

  const env = { ...process.env, DATABASE_URL: urlTest };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx prisma db seed", { env, stdio: "inherit" });
}
