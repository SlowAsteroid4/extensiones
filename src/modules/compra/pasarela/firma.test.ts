// Verificación de firma del webhook (spec §7) — firmas sintéticas con secreto
// de FIXTURE (Fase A autorizada por la mesa; nunca el secreto real de MP).
import { describe, expect, it } from "vitest";
import { construirManifiesto, firmarManifiesto, verificarFirmaWebhook } from "./firma";

const SECRETO = "test-secret-local-only";

function firmaValida(dataId: string, requestId: string, ts: string): string {
  return `ts=${ts},v1=${firmarManifiesto(construirManifiesto(dataId, requestId, ts), SECRETO)}`;
}

describe("verificarFirmaWebhook", () => {
  const dataId = "123456789";
  const requestId = "req-abc-123";
  const ts = "1720548000";

  it("acepta una firma HMAC-SHA256 correcta", () => {
    const resultado = verificarFirmaWebhook({
      xSignature: firmaValida(dataId, requestId, ts),
      xRequestId: requestId,
      dataId,
      secreto: SECRETO,
    });
    expect(resultado).toEqual({ valida: true });
  });

  it("rechaza si el hash fue alterado", () => {
    const firma = firmaValida(dataId, requestId, ts);
    const alterada = firma.slice(0, -4) + (firma.endsWith("aaaa") ? "bbbb" : "aaaa");
    const resultado = verificarFirmaWebhook({
      xSignature: alterada,
      xRequestId: requestId,
      dataId,
      secreto: SECRETO,
    });
    expect(resultado.valida).toBe(false);
  });

  it("rechaza si el secreto no coincide", () => {
    const resultado = verificarFirmaWebhook({
      xSignature: firmaValida(dataId, requestId, ts),
      xRequestId: requestId,
      dataId,
      secreto: "otro-secreto",
    });
    expect(resultado.valida).toBe(false);
    expect(resultado.motivo).toBe("firma no coincide");
  });

  it("rechaza si data.id difiere del firmado (manifest distinto)", () => {
    const resultado = verificarFirmaWebhook({
      xSignature: firmaValida(dataId, requestId, ts),
      xRequestId: requestId,
      dataId: "987654321",
      secreto: SECRETO,
    });
    expect(resultado.valida).toBe(false);
  });

  it("rechaza headers faltantes o malformados con motivo explícito", () => {
    expect(
      verificarFirmaWebhook({ xSignature: null, xRequestId: requestId, dataId, secreto: SECRETO })
    ).toEqual({ valida: false, motivo: "falta header x-signature" });
    expect(
      verificarFirmaWebhook({
        xSignature: "sin-formato",
        xRequestId: requestId,
        dataId,
        secreto: SECRETO,
      }).motivo
    ).toContain("malformado");
    expect(
      verificarFirmaWebhook({
        xSignature: firmaValida(dataId, requestId, ts),
        xRequestId: null,
        dataId,
        secreto: SECRETO,
      }).motivo
    ).toBe("falta header x-request-id");
  });
});
