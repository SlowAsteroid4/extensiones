// Ruta /api/favoritos con auth() mockeado: 401 sin sesión, flujo completo con sesión.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/auth/config", () => ({ auth: vi.fn() }));

import { auth } from "@/shared/auth/config";
import { prisma } from "@/shared/db/client";
import { DELETE, GET, POST } from "../favoritos/route";

const authMock = vi.mocked(auth as unknown as () => Promise<unknown>);
const EMAIL = "test-favoritos-ruta@example.com";
const PRODUCTO = "prod_neg_001";
let cuentaId: string;

const post = (cuerpo: unknown) =>
  new NextRequest("http://localhost:3000/api/favoritos", {
    method: "POST",
    body: JSON.stringify(cuerpo),
    headers: { "content-type": "application/json" },
  });
const del = (query: string) =>
  new NextRequest(`http://localhost:3000/api/favoritos${query}`, { method: "DELETE" });

beforeAll(async () => {
  const cuenta = await prisma.cuenta.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, nombre: "Fav Ruta", rol: "clienta", hash_password: "x" },
    update: {},
  });
  cuentaId = cuenta.id;
  await prisma.favorito.deleteMany({ where: { cuenta_id: cuentaId } });
});

afterAll(async () => {
  await prisma.favorito.deleteMany({ where: { cuenta_id: cuentaId } });
  await prisma.cuenta.deleteMany({ where: { email: EMAIL } });
});

describe("/api/favoritos sin sesión (H10)", () => {
  it("GET, POST y DELETE responden 401 con { error }", async () => {
    authMock.mockResolvedValue(null);

    const resGet = await GET();
    const resPost = await POST(post({ producto_id: PRODUCTO }));
    const resDelete = await DELETE(del(`?producto_id=${PRODUCTO}`));

    for (const res of [resGet, resPost, resDelete]) {
      expect(res.status).toBe(401);
      expect(typeof ((await res.json()) as { error: string }).error).toBe("string");
    }
  });
});

describe("/api/favoritos con sesión", () => {
  it("POST agrega (201), GET lista, DELETE quita idempotente", async () => {
    authMock.mockResolvedValue({ user: { id: cuentaId, rol: "clienta" } });

    const resPost = await POST(post({ producto_id: PRODUCTO }));
    expect(resPost.status).toBe(201);

    const resGet = await GET();
    expect(resGet.status).toBe(200);
    const lista = (await resGet.json()) as Array<{ producto: { id: string } }>;
    expect(lista).toHaveLength(1);
    expect(lista[0].producto.id).toBe(PRODUCTO);

    const resDel1 = await DELETE(del(`?producto_id=${PRODUCTO}`));
    expect(resDel1.status).toBe(200);
    expect(await resDel1.json()).toEqual({ eliminado: true });

    // H11: idempotente — segunda vez responde 200, sin error.
    const resDel2 = await DELETE(del(`?producto_id=${PRODUCTO}`));
    expect(resDel2.status).toBe(200);
    expect(await resDel2.json()).toEqual({ eliminado: false });
  });

  it("POST con cuerpo inválido → 400", async () => {
    authMock.mockResolvedValue({ user: { id: cuentaId, rol: "clienta" } });
    expect((await POST(post({}))).status).toBe(400);
  });

  it("DELETE sin producto_id → 400", async () => {
    authMock.mockResolvedValue({ user: { id: cuentaId, rol: "clienta" } });
    expect((await DELETE(del(""))).status).toBe(400);
  });
});
