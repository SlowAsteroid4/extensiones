// Seed de PRODUCCIÓN (T8) — decisión de la mesa: la base arranca VACÍA de
// catálogo. Solo siembra lo mínimo para que la clienta pueda trabajar:
//   · las 3 categorías base (sin ellas no se puede crear ningún producto)
//   · 1 cuenta admin, con la contraseña que el dueño fija por entorno
// CERO productos, variantes, testimonios y pedidos. El seed de desarrollo
// (prisma/seed.ts, 72 productos) NO se toca: sigue sirviendo a local y CI.
//
// Idempotente: upsert por id fijo en categorías; la cuenta admin solo se crea
// si no existe (re-ejecutarlo no duplica ni pisa el hash de la contraseña).
//
//   npm run db:seed-produccion     (con DATABASE_URL apuntando a producción)
import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORIAS_SEED } from "./seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const nombre = process.env.SEED_ADMIN_NOMBRE ?? "Administradora";
  if (!email || !password) {
    throw new Error(
      "Faltan SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD en el entorno (ver .env.example)."
    );
  }

  // Mismos ids que el seed de desarrollo: si algún día se importa catálogo
  // desde local, las referencias categoria_id siguen cuadrando.
  for (const categoria of CATEGORIAS_SEED) {
    const { id, ...datos } = categoria;
    await prisma.categoria.upsert({ where: { id }, create: { id, ...datos }, update: datos });
  }

  const adminExistente = await prisma.cuenta.findUnique({ where: { email } });
  if (adminExistente) {
    console.log(`Cuenta admin ${email} ya existía — no se toca.`);
  } else {
    await prisma.cuenta.create({
      data: { email, nombre, rol: "admin", hash_password: await argon2.hash(password) },
    });
    console.log(`Cuenta admin ${email} creada.`);
  }

  const [categorias, productos, variantes, testimonios, pedidos, admins, cuentas] =
    await Promise.all([
      prisma.categoria.count(),
      prisma.producto.count(),
      prisma.varianteLargo.count(),
      prisma.testimonio.count(),
      prisma.pedido.count(),
      prisma.cuenta.count({ where: { rol: "admin" } }),
      prisma.cuenta.count(),
    ]);

  console.log("\nSeed de producción completado:");
  console.log(`  categorias:   ${categorias}   (esperado 3)`);
  console.log(`  productos:    ${productos}   (esperado 0)`);
  console.log(`  variantes:    ${variantes}   (esperado 0)`);
  console.log(`  testimonios:  ${testimonios}   (esperado 0)`);
  console.log(`  pedidos:      ${pedidos}   (esperado 0)`);
  console.log(`  cuentas:      ${cuentas} (admins: ${admins})`);

  if (categorias !== CATEGORIAS_SEED.length || admins < 1) {
    throw new Error("El seed de producción no dejó el estado esperado — revisa la salida.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
