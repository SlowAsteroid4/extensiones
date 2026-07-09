// Cliente Prisma singleton — evita agotar conexiones con el hot reload de Next.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalConPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalConPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalConPrisma.prisma = prisma;
}
