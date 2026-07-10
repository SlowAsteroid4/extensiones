// Verificación de firma del webhook de MercadoPago (spec §7: rechazo explícito
// si no valida). Mecanismo vigente según la doc oficial de MP:
//   headers `x-signature` ("ts=<unix>,v1=<hmac-hex>") y `x-request-id`, más el
//   query param `data.id`; el manifest firmado con HMAC-SHA256 es
//   "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" y la clave es la "clave
//   secreta" del panel de webhooks de la aplicación (env MERCADOPAGO_WEBHOOK_SECRET).
import { createHmac, timingSafeEqual } from "node:crypto";

export function construirManifiesto(dataId: string, requestId: string, ts: string): string {
  // MP indica data.id en minúsculas si es alfanumérico (los ids de pago son numéricos).
  return `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
}

export function firmarManifiesto(manifiesto: string, secreto: string): string {
  return createHmac("sha256", secreto).update(manifiesto).digest("hex");
}

export interface VerificacionFirma {
  valida: boolean;
  motivo?: string;
}

export function verificarFirmaWebhook(parametros: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secreto: string;
}): VerificacionFirma {
  const { xSignature, xRequestId, dataId, secreto } = parametros;
  if (!xSignature) return { valida: false, motivo: "falta header x-signature" };
  if (!xRequestId) return { valida: false, motivo: "falta header x-request-id" };
  if (!dataId) return { valida: false, motivo: "falta query param data.id" };

  const partes = new Map<string, string>();
  for (const segmento of xSignature.split(",")) {
    const [clave, valor] = segmento.split("=", 2).map((s) => s?.trim());
    if (clave && valor) partes.set(clave, valor);
  }
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1) return { valida: false, motivo: "x-signature malformado (se espera ts=…,v1=…)" };

  const esperado = firmarManifiesto(construirManifiesto(dataId, xRequestId, ts), secreto);
  const bufferEsperado = Buffer.from(esperado, "hex");
  let bufferRecibido: Buffer;
  try {
    bufferRecibido = Buffer.from(v1, "hex");
  } catch {
    return { valida: false, motivo: "v1 no es hexadecimal" };
  }
  if (bufferRecibido.length !== bufferEsperado.length) {
    return { valida: false, motivo: "firma no coincide" };
  }
  // Comparación en tiempo constante.
  if (!timingSafeEqual(bufferEsperado, bufferRecibido)) {
    return { valida: false, motivo: "firma no coincide" };
  }
  return { valida: true };
}
