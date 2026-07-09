-- T4 · migración aditiva escrita a mano (el default de Prisma haría DROP+ADD y
-- perdería los 216 valores de largo).

-- 1) largo_cm → largo_pulgadas (resolución de la mesa: 18/20/22/24 son pulgadas,
--    los valores se quedan tal cual, sin re-seed).
ALTER TABLE "VarianteLargo" RENAME COLUMN "largo_cm" TO "largo_pulgadas";
ALTER INDEX "VarianteLargo_largo_cm_idx" RENAME TO "VarianteLargo_largo_pulgadas_idx";

-- 2) Producto.slug único. Backfill temporal con el id para que las filas
--    existentes no violen NOT NULL; el seed lo puebla con el slug real
--    (nombre_tono slugificado + id corto).
ALTER TABLE "Producto" ADD COLUMN "slug" TEXT;
UPDATE "Producto" SET "slug" = "id";
ALTER TABLE "Producto" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Producto_slug_key" ON "Producto"("slug");
