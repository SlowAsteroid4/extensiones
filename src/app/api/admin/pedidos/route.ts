import type { NextRequest } from "next/server";
import { requiereAdmin } from "@/modules/admin/guardia";
import { listarPedidosAdmin } from "@/modules/admin/pedidos";
import { filtrosPedidosAdminSchema } from "@/shared/validacion/schemas";

const CLAVES_FILTRO = ["estado", "pagina", "por_pagina"] as const;

// T9 · Bitácora: lista paginada, orden por fecha desc, filtro por estado.
export async function GET(request: NextRequest) {
  const guardia = await requiereAdmin();
  if (!guardia.ok) return guardia.respuesta;

  const query = request.nextUrl.searchParams;
  const crudos: Record<string, string> = {};
  for (const clave of CLAVES_FILTRO) {
    const valor = query.get(clave);
    if (valor !== null) crudos[clave] = valor;
  }

  const parseado = filtrosPedidosAdminSchema.safeParse(crudos);
  if (!parseado.success) {
    return Response.json(
      { error: parseado.error.issues[0]?.message ?? "Filtros inválidos" },
      { status: 400 }
    );
  }

  return Response.json(await listarPedidosAdmin(parseado.data));
}
