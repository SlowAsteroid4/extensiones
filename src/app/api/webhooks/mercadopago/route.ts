import type { NextRequest } from "next/server";
import { aplicarResultadoPago } from "@/modules/compra/pedidos";
import { obtenerProveedorPasarela } from "@/modules/compra/pasarela";
import { verificarFirmaWebhook } from "@/modules/compra/pasarela/firma";

// Webhook de MercadoPago (spec §7): firma verificada, rechazo explícito si no
// valida. MP reintenta ante no-200: las transiciones son idempotentes (3.D.4),
// así que responder 200 a eventos ya procesados es correcto.
export async function POST(request: NextRequest) {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) {
    console.error("[webhook MP] MERCADOPAGO_WEBHOOK_SECRET no configurado — se rechaza");
    return Response.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const dataId = request.nextUrl.searchParams.get("data.id");
  const verificacion = verificarFirmaWebhook({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
    secreto,
  });
  if (!verificacion.valida) {
    console.warn(`[webhook MP] firma inválida (${verificacion.motivo}) · data.id=${dataId}`);
    return Response.json({ error: "Firma inválida" }, { status: 401 });
  }

  // Solo eventos de pago; otros tipos se aceptan sin procesar (MP no debe reintentar).
  let tipo = request.nextUrl.searchParams.get("type");
  try {
    const cuerpo = (await request.json()) as { type?: string };
    tipo = cuerpo.type ?? tipo;
  } catch {
    // cuerpo vacío o no-JSON: el tipo del query param decide
  }
  if (tipo !== "payment") {
    return Response.json({ procesado: false, motivo: `tipo no procesado: ${tipo}` });
  }

  const info = await obtenerProveedorPasarela().obtenerPago(dataId!);
  if (!info) {
    console.warn(`[webhook MP] pago desconocido data.id=${dataId}`);
    return Response.json({ procesado: false, motivo: "pago desconocido" });
  }

  const resultado = await aplicarResultadoPago(info.folio, info.estado, info.pasarela_ref);
  console.log(
    `[webhook MP] data.id=${dataId} folio=${info.folio} estado=${info.estado} → ${resultado}`
  );
  return Response.json({
    procesado: resultado === "pagado" || resultado === "rechazado",
    resultado,
  });
}
