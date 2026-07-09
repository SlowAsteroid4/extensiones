// Seed T3 — idempotente: upserts por id fijo; la cuenta admin solo se crea si
// no existe (re-ejecutar no cambia conteos ni pisa el hash).
import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORIAS_SEED, PRODUCTOS_SEED, TESTIMONIOS_SEED } from "./seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const categoria of CATEGORIAS_SEED) {
    const { id, ...datos } = categoria;
    await prisma.categoria.upsert({ where: { id }, create: { id, ...datos }, update: datos });
  }

  for (const producto of PRODUCTOS_SEED) {
    const { id, variantes, ...datos } = producto;
    await prisma.producto.upsert({ where: { id }, create: { id, ...datos }, update: datos });

    for (const variante of variantes) {
      const { id: varianteId, ...datosVariante } = variante;
      await prisma.varianteLargo.upsert({
        where: { id: varianteId },
        create: { id: varianteId, producto_id: id, ...datosVariante },
        update: { producto_id: id, ...datosVariante },
      });
    }
  }

  for (const testimonio of TESTIMONIOS_SEED) {
    const { id, ...datos } = testimonio;
    await prisma.testimonio.upsert({ where: { id }, create: { id, ...datos }, update: datos });
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const nombre = process.env.SEED_ADMIN_NOMBRE ?? "Admin Dev";
  if (!email || !password) {
    throw new Error(
      "Faltan SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD en el entorno (ver .env.example)."
    );
  }

  const adminExistente = await prisma.cuenta.findUnique({ where: { email } });
  if (!adminExistente) {
    await prisma.cuenta.create({
      data: {
        email,
        nombre,
        rol: "admin",
        hash_password: await argon2.hash(password),
      },
    });
  }

  const [categorias, productos, variantes, testimonios, admins] = await Promise.all([
    prisma.categoria.count(),
    prisma.producto.count(),
    prisma.varianteLargo.count(),
    prisma.testimonio.count(),
    prisma.cuenta.count({ where: { rol: "admin" } }),
  ]);
  const familias = await prisma.producto.findMany({
    distinct: ["familia_tono"],
    select: { familia_tono: true },
  });

  console.log("Seed completado:");
  console.log(`  categorias:   ${categorias}`);
  console.log(`  productos:    ${productos}`);
  console.log(`  variantes:    ${variantes}`);
  console.log(`  testimonios:  ${testimonios}`);
  console.log(`  admins:       ${admins}`);
  console.log(`  familias distintas: ${familias.length} (${familias.map((f) => f.familia_tono).join(", ")})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
