// DEV-ONLY (encargo 10, delta autorizado): simula el webhook "pago aprobado"
// de MercadoPago contra el endpoint local, firmado con el secreto fixture.
// Es la palanca para probar pendiente→pagado_sandbox en localhost mientras
// llegan las credenciales reales (requiere PASARELA_PROVIDER=fake).
//
//   npm run simular-pago -- LS-XXXXXX               → aprueba el pedido
//   npm run simular-pago -- LS-XXXXXX --rechazado   → lo rechaza
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { construirManifiesto, firmarManifiesto } from "../src/modules/compra/pasarela/firma";

async function main() {
  const argumentos = process.argv.slice(2).filter((a) => a !== "--");
  const folio = argumentos.find((a) => !a.startsWith("--"))?.toUpperCase();
  const rechazado = argumentos.includes("--rechazado");

  if (!folio || !/^LS-[A-Z0-9]+$/.test(folio)) {
    console.error("Uso: npm run simular-pago -- LS-XXXXXX [--rechazado]");
    process.exit(1);
  }

  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) {
    console.error("Falta MERCADOPAGO_WEBHOOK_SECRET en .env (ver .env.example).");
    process.exit(1);
  }
  if (process.env.PASARELA_PROVIDER !== "fake") {
    console.error(
      `PASARELA_PROVIDER=${process.env.PASARELA_PROVIDER ?? "(no definido)"} — el simulador solo funciona con "fake".`
    );
    process.exit(1);
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const dataId = `fake-pago-${rechazado ? "rechazado" : "aprobado"}-${folio}`;
  const requestId = randomUUID();
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = firmarManifiesto(construirManifiesto(dataId, requestId, ts), secreto);

  const url = `${appUrl}/api/webhooks/mercadopago?type=payment&data.id=${encodeURIComponent(dataId)}`;
  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    },
    body: JSON.stringify({ type: "payment", data: { id: dataId } }),
  });

  const cuerpo = await respuesta.json().catch(() => null);
  console.log(`POST ${url}`);
  console.log(`→ ${respuesta.status}`, JSON.stringify(cuerpo));

  if (respuesta.ok && cuerpo?.procesado) {
    console.log(`Pedido ${folio} → ${rechazado ? "rechazado" : "pagado_sandbox"} (${cuerpo.resultado}).`);
  } else if (cuerpo?.resultado === "no_encontrado") {
    console.error(`No existe un pedido con folio ${folio}.`);
    process.exit(1);
  } else if (cuerpo?.resultado === "ya_pagado") {
    console.log(`El pedido ${folio} ya estaba pagado — el webhook es idempotente, sin doble decremento.`);
  } else if (!respuesta.ok) {
    console.error("El webhook rechazó la petición (¿servidor corriendo? ¿secreto correcto?).");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
