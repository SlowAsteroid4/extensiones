import { describe, expect, it } from "vitest";
import {
  categoriaSchema,
  cuentaSchema,
  familiaTonoSchema,
  pedidoItemSchema,
  pedidoSchema,
  productoSchema,
  testimonioSchema,
  varianteLargoSchema,
} from "./schemas";
import { FAMILIAS_TONO } from "./familias";

describe("familiaTonoSchema", () => {
  it("acepta las 5 familias del piloto", () => {
    for (const familia of FAMILIAS_TONO) {
      expect(familiaTonoSchema.parse(familia)).toBe(familia);
    }
  });

  it("rechaza familias fuera de la lista editable", () => {
    expect(familiaTonoSchema.safeParse("pelirrojos").success).toBe(false);
  });
});

describe("productoSchema", () => {
  const productoValido = {
    nombre_tono: "Rubio Dorado Miel",
    familia_tono: "rubios",
    tipo: "clip",
    descripcion: "Extensión de cabello natural en tono rubio dorado miel.",
    fotos: ["/img/p1.jpg"],
    categoria_id: "cat_clip",
    activo: true,
  };

  it("acepta un producto válido", () => {
    expect(productoSchema.safeParse(productoValido).success).toBe(true);
  });

  it("rechaza HTML en la descripción (spec §7)", () => {
    const conHtml = { ...productoValido, descripcion: 'Ver <script>alert("x")</script>' };
    expect(productoSchema.safeParse(conHtml).success).toBe(false);
  });

  it("rechaza familia_tono fuera del enum editable", () => {
    expect(productoSchema.safeParse({ ...productoValido, familia_tono: "azules" }).success).toBe(false);
  });
});

describe("varianteLargoSchema", () => {
  const varianteValida = { largo_cm: 20, precio_mxn: 249000, existencias: 5, sku: "EXT-RUB-001-20" };

  it("acepta una variante válida", () => {
    expect(varianteLargoSchema.safeParse(varianteValida).success).toBe(true);
  });

  it("acepta existencias en 0 (agotado)", () => {
    expect(varianteLargoSchema.safeParse({ ...varianteValida, existencias: 0 }).success).toBe(true);
  });

  it("rechaza largos fuera de {18, 20, 22, 24}", () => {
    expect(varianteLargoSchema.safeParse({ ...varianteValida, largo_cm: 26 }).success).toBe(false);
  });

  it("rechaza precio no positivo o con decimales", () => {
    expect(varianteLargoSchema.safeParse({ ...varianteValida, precio_mxn: 0 }).success).toBe(false);
    expect(varianteLargoSchema.safeParse({ ...varianteValida, precio_mxn: 1990.5 }).success).toBe(false);
  });

  it("rechaza existencias negativas", () => {
    expect(varianteLargoSchema.safeParse({ ...varianteValida, existencias: -1 }).success).toBe(false);
  });
});

describe("cuentaSchema", () => {
  it("acepta una cuenta válida", () => {
    const cuenta = { email: "clienta@example.com", nombre: "Ana", rol: "clienta" };
    expect(cuentaSchema.safeParse(cuenta).success).toBe(true);
  });

  it("rechaza email inválido y rol desconocido", () => {
    expect(cuentaSchema.safeParse({ email: "no-es-email", nombre: "Ana", rol: "clienta" }).success).toBe(false);
    expect(cuentaSchema.safeParse({ email: "a@b.com", nombre: "Ana", rol: "root" }).success).toBe(false);
  });
});

describe("pedidoSchema", () => {
  const pedidoValido = {
    cuenta_id: null, // compra de invitada
    email_contacto: "invitada@example.com",
    total_mxn: 249000,
    estado: "pendiente",
  };

  it("acepta compra de invitada (cuenta_id null)", () => {
    expect(pedidoSchema.safeParse(pedidoValido).success).toBe(true);
  });

  it("acepta teléfono opcional a 10 dígitos y lo rechaza mal formado", () => {
    expect(pedidoSchema.safeParse({ ...pedidoValido, telefono_contacto: "5512345678" }).success).toBe(true);
    expect(pedidoSchema.safeParse({ ...pedidoValido, telefono_contacto: "123" }).success).toBe(false);
  });

  it("rechaza estados fuera del enum", () => {
    expect(pedidoSchema.safeParse({ ...pedidoValido, estado: "enviado" }).success).toBe(false);
  });
});

describe("pedidoItemSchema", () => {
  it("acepta un item válido y rechaza cantidad 0", () => {
    const item = { variante_id: "var_x", cantidad: 2, precio_unitario_congelado: 199000 };
    expect(pedidoItemSchema.safeParse(item).success).toBe(true);
    expect(pedidoItemSchema.safeParse({ ...item, cantidad: 0 }).success).toBe(false);
  });
});

describe("categoriaSchema y testimonioSchema", () => {
  it("valida slug kebab-case", () => {
    expect(categoriaSchema.safeParse({ nombre: "Clip", slug: "extensiones-de-clip", orden: 1 }).success).toBe(true);
    expect(categoriaSchema.safeParse({ nombre: "Clip", slug: "Extensiones De Clip", orden: 1 }).success).toBe(false);
  });

  it("rechaza HTML en testimonios (spec §7)", () => {
    const testimonio = { nombre: "Ana", texto: "Me encantó <b>todo</b>", orden: 1, activo: true };
    expect(testimonioSchema.safeParse(testimonio).success).toBe(false);
  });
});
