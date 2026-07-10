// M-ADMIN · H18: alta/edición/baja de testimonios + toggle activo + orden.
// Lo activo se refleja en GET /api/testimonios (público) al instante.
import type { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/db/client";
import type { testimonioCrearSchema, testimonioEditarSchema } from "@/shared/validacion/schemas";

export function listarTestimoniosAdmin() {
  // El panel ve TODOS (activos e inactivos), ordenados.
  return prisma.testimonio.findMany({ orderBy: { orden: "asc" } });
}

export function crearTestimonio(datos: z.infer<typeof testimonioCrearSchema>) {
  return prisma.testimonio.create({ data: datos });
}

export async function editarTestimonio(id: string, datos: z.infer<typeof testimonioEditarSchema>) {
  try {
    const testimonio = await prisma.testimonio.update({ where: { id }, data: datos });
    return { ok: true as const, testimonio };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false as const, status: 404, error: "Testimonio no encontrado" };
    }
    throw error;
  }
}

export async function eliminarTestimonio(id: string) {
  const resultado = await prisma.testimonio.deleteMany({ where: { id } });
  if (resultado.count === 0) {
    return { ok: false as const, status: 404, error: "Testimonio no encontrado" };
  }
  return { ok: true as const };
}
