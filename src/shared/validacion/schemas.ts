// Validación server-side (spec §7): toda mutación valida con estos schemas.
// Regla de seguridad: sin HTML libre en textos — se rechaza cualquier etiqueta.
import { z } from "zod";
import { FAMILIAS_TONO, LARGOS_DISPONIBLES } from "./familias";
import { MENSAJE_EMAIL, MENSAJE_EMAIL_LARGO, normalizarEmail, revisarEmail } from "./email";
import { evaluarPassword, MENSAJE_PASSWORD_CORTA } from "./password";

export { MENSAJE_EMAIL };

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
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug inválido"),
  familia_tono: familiaTonoSchema,
  tipo: sinHtml("tipo").pipe(z.string().max(40)),
  descripcion: sinHtml("descripcion").pipe(z.string().max(2000)),
  fotos: z.array(z.string().min(1)).max(12),
  categoria_id: z.string().min(1),
  activo: z.boolean(),
});

export const varianteLargoSchema = z.object({
  largo_pulgadas: z
    .number()
    .int()
    .refine(
      (largo): largo is (typeof LARGOS_DISPONIBLES)[number] =>
        (LARGOS_DISPONIBLES as readonly number[]).includes(largo),
      `largo_pulgadas debe ser uno de: ${LARGOS_DISPONIBLES.join(", ")}`
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

// ── T4 · API fase 1 ──────────────────────────────────────────────────────────

// Campo trampa del alta (anti-bot): invisible para una persona, lo rellena el
// bot que completa todos los inputs. Vive aquí —módulo puro— para que el
// formulario y el servidor usen el MISMO nombre sin arrastrar prisma al cliente.
export const CAMPO_TRAMPA = "sitio_web";

// H07: el mensaje dice el requisito exacto. La política vive en
// `./password` y `./email` (OWASP ASVS §2.1 y §5.1) — aquí solo se conecta a
// zod para que la MISMA regla valga en el cliente y en el servidor.
export const registroSchema = z
  .object({
    email: z.string({ error: MENSAJE_EMAIL }).max(320, MENSAJE_EMAIL_LARGO),
    password: z.string({ error: MENSAJE_PASSWORD_CORTA }),
    // La entidad Cuenta exige nombre; en el registro es opcional (si falta se usa
    // la parte local del email — decisión reportada en el handoff T4). El campo
    // vacío se trata como ausente para no castigar a quien lo deja en blanco.
    nombre: z.preprocess(
      (valor) => (typeof valor === "string" && valor.trim() === "" ? undefined : valor),
      sinHtml("nombre").pipe(z.string().max(120)).optional()
    ),
  })
  .superRefine((datos, ctx) => {
    const email = revisarEmail(datos.email);
    if (!email.ok) {
      ctx.addIssue({ code: "custom", path: ["email"], message: email.motivo });
    }
    // El correo y el nombre entran como contexto: una contraseña que los repite
    // no es secreta para nadie que lea la ficha de la clienta.
    const password = evaluarPassword(datos.password, {
      email: email.ok ? email.email : "",
      nombre: datos.nombre,
    });
    if (!password.valida && password.motivo) {
      ctx.addIssue({ code: "custom", path: ["password"], message: password.motivo });
    }
  })
  .transform((datos) => ({ ...datos, email: normalizarEmail(datos.email) }));

// H08: para authorize de Auth.js — solo forma, sin política (el error es genérico).
export const credencialesSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1),
});

export const favoritoSchema = z.object({
  producto_id: z.string({ error: "producto_id es requerido" }).min(1, "producto_id es requerido"),
});

// Query params de GET /api/productos — coerción desde string; inválido → 400.
export const filtrosCatalogoSchema = z.object({
  familia: z.string().min(1).max(60).optional(),
  tipo: z.string().min(1).max(60).optional(),
  largo: z.coerce
    .number({ error: "largo debe ser un número (pulgadas: 18, 20, 22 o 24)" })
    .int("largo debe ser un número entero")
    .positive("largo debe ser un entero positivo")
    .optional(),
  q: z.string().min(1).max(100).optional(),
  categoria: z.string().min(1).max(80).optional(),
});

// ── T5 · API fase 2 ──────────────────────────────────────────────────────────

// H04/H05: checkout. cuenta_id NUNCA viene en el body (se toma del token de sesión).
export const itemCheckoutSchema = z.object({
  variante_id: z.string().min(1, "variante_id es requerido"),
  cantidad: z.number().int("cantidad debe ser un entero").min(1, "cantidad mínima: 1").max(99),
});

export const checkoutSchema = z.object({
  items: z.array(itemCheckoutSchema).min(1, "El carrito está vacío").max(30),
  email_contacto: z.email(MENSAJE_EMAIL),
  telefono_contacto: z
    .string()
    .regex(/^\d{10}$/, "teléfono a 10 dígitos")
    .optional(),
});

// H15: crear producto desde el panel. El slug se genera server-side; el sku de
// cada variante es opcional (se autogenera si falta).
export const varianteNuevaSchema = varianteLargoSchema.extend({
  sku: varianteLargoSchema.shape.sku.optional(),
});

export const productoCrearSchema = z.object({
  nombre_tono: sinHtml("nombre_tono").pipe(z.string().max(120)),
  familia_tono: familiaTonoSchema,
  tipo: sinHtml("tipo").pipe(z.string().max(40)),
  descripcion: sinHtml("descripcion").pipe(z.string().max(2000)),
  fotos: z.array(z.string().min(1)).max(12).default([]),
  categoria_id: z.string().min(1, "categoria_id es requerido"),
  activo: z.boolean().default(true),
  variantes: z.array(varianteNuevaSchema).min(1, "Se requiere al menos 1 variante"),
});

// H16/H19: edición parcial + operaciones sobre variantes (agregar/editar/quitar).
export const productoEditarSchema = z.object({
  nombre_tono: sinHtml("nombre_tono").pipe(z.string().max(120)).optional(),
  familia_tono: familiaTonoSchema.optional(),
  tipo: sinHtml("tipo").pipe(z.string().max(40)).optional(),
  descripcion: sinHtml("descripcion").pipe(z.string().max(2000)).optional(),
  fotos: z.array(z.string().min(1)).max(12).optional(),
  categoria_id: z.string().min(1).optional(),
  activo: z.boolean().optional(),
  variantes: z
    .object({
      crear: z.array(varianteNuevaSchema).optional(),
      actualizar: z
        .array(
          z.object({
            id: z.string().min(1),
            largo_pulgadas: varianteLargoSchema.shape.largo_pulgadas.optional(),
            precio_mxn: varianteLargoSchema.shape.precio_mxn.optional(),
            existencias: varianteLargoSchema.shape.existencias.optional(),
          })
        )
        .optional(),
      eliminar: z.array(z.string().min(1)).optional(),
    })
    .optional(),
});

// H17: actualización rápida por variante — valor inválido → 400 sin sobreescribir.
export const varianteRapidaSchema = z
  .object({
    precio_mxn: z
      .number()
      .int("precio_mxn debe ser un entero (centavos)")
      .positive("precio_mxn debe ser positivo")
      .optional(),
    existencias: z
      .number()
      .int("existencias debe ser un entero")
      .min(0, "existencias no puede ser negativo")
      .optional(),
  })
  .refine((v) => v.precio_mxn !== undefined || v.existencias !== undefined, {
    message: "Se requiere precio_mxn o existencias",
  });

// ── T9 · Bitácora de pedidos (panel) ─────────────────────────────────────────

// Query params de GET /api/admin/pedidos — coerción desde string; inválido → 400.
// El tope de por_pagina refleja POR_PAGINA_MAX de src/modules/admin/pedidos.ts.
export const filtrosPedidosAdminSchema = z.object({
  estado: z.enum(["pendiente", "pagado_sandbox", "rechazado"]).optional(),
  pagina: z.coerce
    .number({ error: "pagina debe ser un número" })
    .int("pagina debe ser un entero")
    .min(1, "pagina mínima: 1")
    .optional(),
  por_pagina: z.coerce
    .number({ error: "por_pagina debe ser un número" })
    .int("por_pagina debe ser un entero")
    .min(1, "por_pagina mínima: 1")
    .max(50, "por_pagina máxima: 50")
    .optional(),
});

// H18: testimonios del panel.
export const testimonioCrearSchema = testimonioSchema;
export const testimonioEditarSchema = z.object({
  nombre: sinHtml("nombre").pipe(z.string().max(80)).optional(),
  texto: sinHtml("texto").pipe(z.string().max(500)).optional(),
  orden: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
});
