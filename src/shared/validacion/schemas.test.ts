import { describe, expect, it } from "vitest";
import {
  MENSAJE_EMAIL,
  categoriaSchema,
  cuentaSchema,
  familiaTonoSchema,
  favoritoSchema,
  filtrosCatalogoSchema,
  pedidoItemSchema,
  pedidoSchema,
  productoSchema,
  registroSchema,
  testimonioSchema,
  varianteLargoSchema,
} from "./schemas";
import { MENSAJE_EMAIL_DESECHABLE } from "./email";
import { MENSAJE_PASSWORD_CORTA, MENSAJE_PASSWORD_PERSONAL } from "./password";
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
    slug: "rubio-dorado-miel-rub-004",
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
  const varianteValida = { largo_pulgadas: 20, precio_mxn: 249000, existencias: 5, sku: "EXT-RUB-001-20" };

  it("acepta una variante válida", () => {
    expect(varianteLargoSchema.safeParse(varianteValida).success).toBe(true);
  });

  it("acepta existencias en 0 (agotado)", () => {
    expect(varianteLargoSchema.safeParse({ ...varianteValida, existencias: 0 }).success).toBe(true);
  });

  it("rechaza largos fuera de {18, 20, 22, 24}", () => {
    expect(varianteLargoSchema.safeParse({ ...varianteValida, largo_pulgadas: 26 }).success).toBe(false);
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

describe("registroSchema (H07)", () => {
  const PASSWORD_OK = "trenzas-de-verano-77";

  it("acepta email válido y contraseña que cumple la política", () => {
    const resultado = registroSchema.safeParse({ email: "Ana@Example.com", password: PASSWORD_OK });
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.email).toBe("ana@example.com"); // normaliza a minúsculas
  });

  it("rechaza contraseña corta con el mensaje del requisito exacto", () => {
    const resultado = registroSchema.safeParse({ email: "ana@example.com", password: "Corta-12" });
    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error.issues[0].message).toBe(MENSAJE_PASSWORD_CORTA);
    expect(!resultado.success && resultado.error.issues[0].path[0]).toBe("password");
  });

  it("rechaza email con formato inválido con mensaje claro", () => {
    const resultado = registroSchema.safeParse({ email: "no-es-email", password: PASSWORD_OK });
    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error.issues[0].message).toBe(MENSAJE_EMAIL);
  });

  it("rechaza HTML en el nombre", () => {
    const resultado = registroSchema.safeParse({
      email: "ana@example.com",
      password: PASSWORD_OK,
      nombre: "<img src=x>",
    });
    expect(resultado.success).toBe(false);
  });

  it("el nombre vacío se trata como ausente (no como error)", () => {
    const resultado = registroSchema.safeParse({
      email: "ana@example.com",
      password: PASSWORD_OK,
      nombre: "   ",
    });
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.nombre).toBeUndefined();
  });

  it("rechaza la contraseña que recicla el correo (OSINT) señalando el campo", () => {
    const resultado = registroSchema.safeParse({
      email: "anagabriela@example.com",
      password: "AnaGabriela2026!",
    });
    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error.issues[0].message).toBe(MENSAJE_PASSWORD_PERSONAL);
  });

  it("rechaza correo desechable con el motivo de la lista OSINT", () => {
    const resultado = registroSchema.safeParse({ email: "ana@mailinator.com", password: PASSWORD_OK });
    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error.issues[0].message).toBe(MENSAJE_EMAIL_DESECHABLE);
  });
});

describe("favoritoSchema y filtrosCatalogoSchema (T4)", () => {
  it("favorito exige producto_id no vacío", () => {
    expect(favoritoSchema.safeParse({ producto_id: "prod_rub_001" }).success).toBe(true);
    expect(favoritoSchema.safeParse({ producto_id: "" }).success).toBe(false);
  });

  it("filtros: coerciona largo numérico y rechaza no numérico", () => {
    const ok = filtrosCatalogoSchema.safeParse({ largo: "20" });
    expect(ok.success && ok.data.largo).toBe(20);
    expect(filtrosCatalogoSchema.safeParse({ largo: "abc" }).success).toBe(false);
  });

  it("filtros: todos opcionales (sin filtros = catálogo completo)", () => {
    expect(filtrosCatalogoSchema.safeParse({}).success).toBe(true);
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
