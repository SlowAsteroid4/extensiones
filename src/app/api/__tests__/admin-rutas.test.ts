// Integración del panel (H15–H19) a nivel Route Handler, con auth() mockeado:
// 401 sin sesión · 403 clienta · flujos completos como admin.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/auth/config", () => ({ auth: vi.fn() }));

import { auth } from "@/shared/auth/config";
import { prisma } from "@/shared/db/client";
import {
  listarProductos,
  listarTestimonios,
  obtenerFacetas,
  obtenerProductoPorSlug,
} from "@/modules/catalogo/consultas";
import { crearPedido } from "@/modules/compra/pedidos";
import { proveedorFake } from "@/modules/compra/pasarela/fake";
import { GET as getProductosAdmin, POST as postProductoAdmin } from "../admin/productos/route";
import { PATCH as patchProductoAdmin } from "../admin/productos/[id]/route";
import { PATCH as patchVarianteAdmin } from "../admin/variantes/[id]/route";
import { GET as getTestimoniosAdmin, POST as postTestimonioAdmin } from "../admin/testimonios/route";
import {
  DELETE as deleteTestimonioAdmin,
  PATCH as patchTestimonioAdmin,
} from "../admin/testimonios/[id]/route";

const authMock = vi.mocked(auth as unknown as () => Promise<unknown>);
const SESION_ADMIN = { user: { id: "cuenta_admin_test", rol: "admin" } };
const SESION_CLIENTA = { user: { id: "cuenta_clienta_test", rol: "clienta" } };
const TIPO_NUEVO = "cortina"; // tipo inexistente en el seed → prueba fuerte de facetas

function json(url: string, metodo: string, cuerpo?: unknown) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: metodo,
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
    headers: { "content-type": "application/json" },
  });
}
const params = (valores: Record<string, string>) => ({
  params: Promise.resolve(valores) as Promise<never>,
});

const PRODUCTO_VALIDO = {
  nombre_tono: "Cortina Ámbar Test",
  familia_tono: "rubios",
  tipo: TIPO_NUEVO,
  descripcion: "Producto creado por el panel en tests.",
  fotos: ["/img/test-admin.jpg"],
  categoria_id: "cat_clip",
  variantes: [{ largo_pulgadas: 20, precio_mxn: 259000, existencias: 7 }],
};

async function limpiar() {
  const creados = await prisma.producto.findMany({ where: { tipo: TIPO_NUEVO } });
  const ids = creados.map((p) => p.id);
  await prisma.pedidoItem.deleteMany({ where: { variante: { producto_id: { in: ids } } } });
  await prisma.favorito.deleteMany({ where: { producto_id: { in: ids } } });
  await prisma.varianteLargo.deleteMany({ where: { producto_id: { in: ids } } });
  await prisma.producto.deleteMany({ where: { id: { in: ids } } });
  await prisma.testimonio.deleteMany({ where: { nombre: { startsWith: "Testimonio Panel" } } });
}

beforeEach(() => authMock.mockResolvedValue(SESION_ADMIN));
afterAll(limpiar);

describe("guardia de /api/admin/* (spec §7)", () => {
  it("sin sesión → 401 en productos, variantes y testimonios", async () => {
    authMock.mockResolvedValue(null);
    const respuestas = [
      await getProductosAdmin(json("/api/admin/productos", "GET")),
      await postProductoAdmin(json("/api/admin/productos", "POST", PRODUCTO_VALIDO)),
      await patchVarianteAdmin(json("/api/admin/variantes/x", "PATCH", { existencias: 1 }), params({ id: "x" })),
      await getTestimoniosAdmin(),
    ];
    for (const res of respuestas) expect(res.status).toBe(401);
  });

  it("sesión de CLIENTA → 403 (no basta estar logueada)", async () => {
    authMock.mockResolvedValue(SESION_CLIENTA);
    const respuestas = [
      await getProductosAdmin(json("/api/admin/productos", "GET")),
      await postProductoAdmin(json("/api/admin/productos", "POST", PRODUCTO_VALIDO)),
      await getTestimoniosAdmin(),
    ];
    for (const res of respuestas) {
      expect(res.status).toBe(403);
      expect((await res.json()).error).toContain("administradora");
    }
  });
});

describe("H15 · crear producto", () => {
  it("producto completo → 201 y aparece DE INMEDIATO en catálogo público y facetas", async () => {
    const facetasAntes = await obtenerFacetas();
    expect(facetasAntes.tipos).not.toContain(TIPO_NUEVO);
    const publicosAntes = (await listarProductos({ tipo: TIPO_NUEVO })).length;
    expect(publicosAntes).toBe(0);

    const res = await postProductoAdmin(json("/api/admin/productos", "POST", PRODUCTO_VALIDO));
    expect(res.status).toBe(201);
    const producto = await res.json();
    expect(producto.slug).toMatch(/^cortina-ambar-test-[a-z2-9]{6}$/);
    expect(producto.variantes[0].sku).toMatch(/^ADM-/); // sku autogenerado

    const publicosDespues = await listarProductos({ tipo: TIPO_NUEVO });
    expect(publicosDespues).toHaveLength(1);
    const facetasDespues = await obtenerFacetas();
    expect(facetasDespues.tipos).toContain(TIPO_NUEVO);
  });

  it("obligatorios faltantes o sin variantes → 400 con errores POR CAMPO", async () => {
    const res = await postProductoAdmin(
      json("/api/admin/productos", "POST", { tipo: TIPO_NUEVO, variantes: [] })
    );
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    const campos = cuerpo.errores.map((e: { campo: string }) => e.campo);
    expect(campos).toContain("nombre_tono");
    expect(campos).toContain("variantes");
    expect(campos).toContain("categoria_id");
  });

  it("descripcion con HTML → 400 (spec §7)", async () => {
    const res = await postProductoAdmin(
      json("/api/admin/productos", "POST", {
        ...PRODUCTO_VALIDO,
        descripcion: "con <script>alert(1)</script>",
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("H16/H17 · editar producto y variantes", () => {
  async function productoDePrueba() {
    const res = await postProductoAdmin(json("/api/admin/productos", "POST", PRODUCTO_VALIDO));
    return res.json();
  }

  it("edita campos base y agrega/actualiza/quita variantes en una operación", async () => {
    const producto = await productoDePrueba();
    const varianteOriginal = producto.variantes[0];

    const res = await patchProductoAdmin(
      json(`/api/admin/productos/${producto.id}`, "PATCH", {
        nombre_tono: "Cortina Ámbar Editada",
        variantes: {
          crear: [{ largo_pulgadas: 24, precio_mxn: 299000, existencias: 4 }],
          actualizar: [{ id: varianteOriginal.id, precio_mxn: 279000 }],
        },
      }),
      params({ id: producto.id })
    );
    expect(res.status).toBe(200);
    const editado = await res.json();
    expect(editado.nombre_tono).toBe("Cortina Ámbar Editada");
    expect(editado.variantes).toHaveLength(2);
    expect(editado.variantes.find((v: { id: string }) => v.id === varianteOriginal.id).precio_mxn).toBe(279000);

    const resQuitar = await patchProductoAdmin(
      json(`/api/admin/productos/${producto.id}`, "PATCH", {
        variantes: { eliminar: [varianteOriginal.id] },
      }),
      params({ id: producto.id })
    );
    expect((await resQuitar.json()).variantes).toHaveLength(1);
  });

  it("H17: actualización rápida válida escribe; inválida → 400 SIN sobreescribir", async () => {
    const producto = await productoDePrueba();
    const variante = producto.variantes[0];

    const resOk = await patchVarianteAdmin(
      json(`/api/admin/variantes/${variante.id}`, "PATCH", { existencias: 0, precio_mxn: 219000 }),
      params({ id: variante.id })
    );
    expect(resOk.status).toBe(200);
    expect(await resOk.json()).toMatchObject({ existencias: 0, precio_mxn: 219000 });

    const resInvalida = await patchVarianteAdmin(
      json(`/api/admin/variantes/${variante.id}`, "PATCH", { existencias: -5 }),
      params({ id: variante.id })
    );
    expect(resInvalida.status).toBe(400);
    const enDb = await prisma.varianteLargo.findUniqueOrThrow({ where: { id: variante.id } });
    expect(enDb.existencias).toBe(0); // el -5 jamás se escribió
    expect(enDb.precio_mxn).toBe(219000);

    const resNoExiste = await patchVarianteAdmin(
      json("/api/admin/variantes/var_nope", "PATCH", { existencias: 1 }),
      params({ id: "var_nope" })
    );
    expect(resNoExiste.status).toBe(404);
  });

  it("editar variante con pedidos: eliminar → 409 con guía", async () => {
    const producto = await productoDePrueba();
    const variante = producto.variantes[0];
    const pedido = await crearPedido(
      {
        items: [{ variante_id: variante.id, cantidad: 1 }],
        email_contacto: "test-admin-pedido@example.com",
      },
      proveedorFake
    );
    expect(pedido.ok).toBe(true);

    const res = await patchProductoAdmin(
      json(`/api/admin/productos/${producto.id}`, "PATCH", {
        variantes: { eliminar: [variante.id] },
      }),
      params({ id: producto.id })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("existencias en 0");

    await prisma.pedidoItem.deleteMany({ where: { variante_id: variante.id } });
    await prisma.pedido.deleteMany({ where: { email_contacto: "test-admin-pedido@example.com" } });
  });
});

describe("H18 · testimonios", () => {
  it("alta → visible en público · toggle activo=false → desaparece · edición de orden · baja", async () => {
    const resCrear = await postTestimonioAdmin(
      json("/api/admin/testimonios", "POST", {
        nombre: "Testimonio Panel Test",
        texto: "Comentario de prueba del panel.",
        orden: 99,
        activo: true,
      })
    );
    expect(resCrear.status).toBe(201);
    const testimonio = await resCrear.json();

    let publicos = await listarTestimonios();
    expect(publicos.some((t) => t.id === testimonio.id)).toBe(true);

    const resToggle = await patchTestimonioAdmin(
      json(`/api/admin/testimonios/${testimonio.id}`, "PATCH", { activo: false, orden: 50 }),
      params({ id: testimonio.id })
    );
    expect(resToggle.status).toBe(200);
    publicos = await listarTestimonios();
    expect(publicos.some((t) => t.id === testimonio.id)).toBe(false); // ya no es público

    const admin = await (await getTestimoniosAdmin()).json();
    expect(admin.some((t: { id: string }) => t.id === testimonio.id)).toBe(true); // el panel sí lo ve

    const resBorrar = await deleteTestimonioAdmin(
      json(`/api/admin/testimonios/${testimonio.id}`, "DELETE"),
      params({ id: testimonio.id })
    );
    expect(await resBorrar.json()).toEqual({ eliminado: true });

    const resEditarBorrado = await patchTestimonioAdmin(
      json(`/api/admin/testimonios/${testimonio.id}`, "PATCH", { orden: 1 }),
      params({ id: testimonio.id })
    );
    expect(resEditarBorrado.status).toBe(404);
  });

  it("texto con HTML → 400", async () => {
    const res = await postTestimonioAdmin(
      json("/api/admin/testimonios", "POST", {
        nombre: "Testimonio Panel HTML",
        texto: "con <b>negritas</b>",
        orden: 98,
        activo: true,
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("H19 · desactivar producto: efecto inmediato en tienda y checkout", () => {
  it("activo=false → fuera del listado, ficha null y checkout rechazado", async () => {
    const resCrear = await postProductoAdmin(json("/api/admin/productos", "POST", PRODUCTO_VALIDO));
    const producto = await resCrear.json();
    expect(await obtenerProductoPorSlug(producto.slug)).not.toBeNull();

    const resDesactivar = await patchProductoAdmin(
      json(`/api/admin/productos/${producto.id}`, "PATCH", { activo: false }),
      params({ id: producto.id })
    );
    expect(resDesactivar.status).toBe(200);

    // 1) fuera del listado público
    const listado = await listarProductos({ tipo: TIPO_NUEVO });
    expect(listado.some((p) => p.id === producto.id)).toBe(false);
    // 2) ficha → null (la ruta lo vuelve 404)
    expect(await obtenerProductoPorSlug(producto.slug)).toBeNull();
    // 3) checkout con su variante → rechazado por item
    const checkout = await crearPedido(
      {
        items: [{ variante_id: producto.variantes[0].id, cantidad: 1 }],
        email_contacto: "test-admin-inactivo@example.com",
      },
      proveedorFake
    );
    expect(checkout.ok).toBe(false);
    if (checkout.ok) return;
    expect(checkout.detalles?.[0].error).toBe("Producto no disponible");
  });
});
