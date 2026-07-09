// Validación server-side (spec §7): toda mutación valida con estos schemas.
// Regla de seguridad: sin HTML libre en textos — se rechaza cualquier etiqueta.
import { z } from "zod";
import { FAMILIAS_TONO, LARGOS_DISPONIBLES } from "./familias";

const sinHtml = (campo: string) =>
  z
    .string()
    .trim()
    .min(1, `${campo} no puede estar vacío`)
    .refine((texto) => !/<[^>]*>/.test(texto), `${campo} no admite HTML`);

export const familiaTonoSchema = z.enum(FAMILIAS_TONO);

export const categoriaSchema = z.object({
  nombre: sinHtml("nombre").pipe(z.string().max(80)),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug inválido"),
  orden: z.number().int().min(0),
});

export const productoSchema = z.object({
  nombre_tono: sinHtml("nombre_tono").pipe(z.string().max(120)),
  familia_tono: familiaTonoSchema,
  tipo: sinHtml("tipo").pipe(z.string().max(40)),
  descripcion: sinHtml("descripcion").pipe(z.string().max(2000)),
  fotos: z.array(z.string().min(1)).max(12),
  categoria_id: z.string().min(1),
  activo: z.boolean(),
});

export const varianteLargoSchema = z.object({
  largo_cm: z
    .number()
    .int()
    .refine(
      (largo): largo is (typeof LARGOS_DISPONIBLES)[number] =>
        (LARGOS_DISPONIBLES as readonly number[]).includes(largo),
      `largo_cm debe ser uno de: ${LARGOS_DISPONIBLES.join(", ")}`
    ),
  // Dinero en centavos de MXN, siempre entero positivo.
  precio_mxn: z.number().int().positive(),
  existencias: z.number().int().min(0),
  sku: z.string().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, "sku inválido"),
});

export const cuentaSchema = z.object({
  email: z.email(),
  nombre: sinHtml("nombre").pipe(z.string().max(120)),
  rol: z.enum(["clienta", "admin"]),
});

export const pedidoSchema = z.object({
  cuenta_id: z.string().min(1).nullable(), // NULL = compra de invitada
  email_contacto: z.email(),
  telefono_contacto: z
    .string()
    .regex(/^\d{10}$/, "teléfono a 10 dígitos")
    .optional(),
  total_mxn: z.number().int().positive(),
  estado: z.enum(["pendiente", "pagado_sandbox", "rechazado"]),
  pasarela_ref: z.string().min(1).optional(),
});

export const pedidoItemSchema = z.object({
  variante_id: z.string().min(1),
  cantidad: z.number().int().min(1).max(99),
  precio_unitario_congelado: z.number().int().positive(),
});

export const testimonioSchema = z.object({
  nombre: sinHtml("nombre").pipe(z.string().max(80)),
  texto: sinHtml("texto").pipe(z.string().max(500)),
  orden: z.number().int().min(0),
  activo: z.boolean(),
});
