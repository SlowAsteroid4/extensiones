import type { NextRequest } from "next/server";
import { agregarFavorito, listarFavoritos, quitarFavorito } from "@/modules/cuenta/favoritos";
import { auth } from "@/shared/auth/config";
import { favoritoSchema } from "@/shared/validacion/schemas";

const SIN_SESION = { error: "Inicia sesión para continuar." };

// H12: favoritos de la cuenta en sesión (persisten en DB).
export async function GET() {
  const sesion = await auth();
  if (!sesion?.user?.id) return Response.json(SIN_SESION, { status: 401 });

  return Response.json(await listarFavoritos(sesion.user.id));
}

// H10: agregar requiere sesión.
export async function POST(request: NextRequest) {
  const sesion = await auth();
  if (!sesion?.user?.id) return Response.json(SIN_SESION, { status: 401 });

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const parseado = favoritoSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json(
      { error: parseado.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const resultado = await agregarFavorito(sesion.user.id, parseado.data.producto_id);
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  return Response.json(resultado.favorito, { status: 201 });
}

// H11: quitar es idempotente — producto_id va por query param.
export async function DELETE(request: NextRequest) {
  const sesion = await auth();
  if (!sesion?.user?.id) return Response.json(SIN_SESION, { status: 401 });

  const parseado = favoritoSchema.safeParse({
    producto_id: request.nextUrl.searchParams.get("producto_id") ?? "",
  });
  if (!parseado.success) {
    return Response.json(
      { error: parseado.error.issues[0]?.message ?? "producto_id es requerido" },
      { status: 400 }
    );
  }

  return Response.json(await quitarFavorito(sesion.user.id, parseado.data.producto_id));
}
