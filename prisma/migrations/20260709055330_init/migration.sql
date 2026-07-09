-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('clienta', 'admin');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('pendiente', 'pagado_sandbox', 'rechazado');

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre_tono" TEXT NOT NULL,
    "familia_tono" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fotos" TEXT[],
    "categoria_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianteLargo" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "largo_cm" INTEGER NOT NULL,
    "precio_mxn" INTEGER NOT NULL,
    "existencias" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,

    CONSTRAINT "VarianteLargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hash_password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'clienta',
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "cuenta_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("cuenta_id","producto_id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "cuenta_id" TEXT,
    "email_contacto" TEXT NOT NULL,
    "telefono_contacto" TEXT,
    "total_mxn" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'pendiente',
    "pasarela_ref" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "pedido_id" TEXT NOT NULL,
    "variante_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario_congelado" INTEGER NOT NULL,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("pedido_id","variante_id")
);

-- CreateTable
CREATE TABLE "Testimonio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Testimonio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE INDEX "Producto_familia_tono_idx" ON "Producto"("familia_tono");

-- CreateIndex
CREATE INDEX "Producto_tipo_idx" ON "Producto"("tipo");

-- CreateIndex
CREATE INDEX "Producto_categoria_id_idx" ON "Producto"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "VarianteLargo_sku_key" ON "VarianteLargo"("sku");

-- CreateIndex
CREATE INDEX "VarianteLargo_largo_cm_idx" ON "VarianteLargo"("largo_cm");

-- CreateIndex
CREATE UNIQUE INDEX "Cuenta_email_key" ON "Cuenta"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_folio_key" ON "Pedido"("folio");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianteLargo" ADD CONSTRAINT "VarianteLargo_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "Cuenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "VarianteLargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
