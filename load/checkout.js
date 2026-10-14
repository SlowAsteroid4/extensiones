// T9 · BLOQUE 5 — Escenario 2: 10 checkouts concurrentes.
//
//   k6 run -e BASE_URL=https://<url> load/checkout.js
//
// ⚠️ ESTE ESCENARIO CREA PEDIDOS REALES (quedan en "pendiente"; el stock NO se
// toca — solo se decrementa al pagar). Todos llevan el marcador
// k6-carga-…@prueba.local para poder limpiarlos y DEMOSTRAR la limpieza:
//
//   SELECT count(*) FROM "Pedido" WHERE email_contacto LIKE 'k6-carga-%@prueba.local';
//   DELETE FROM "PedidoItem" WHERE pedido_id IN
//     (SELECT id FROM "Pedido" WHERE email_contacto LIKE 'k6-carga-%@prueba.local');
//   DELETE FROM "Pedido" WHERE email_contacto LIKE 'k6-carga-%@prueba.local';
//   -- y de nuevo el SELECT: debe dar 0.
import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error("Falta -e BASE_URL=https://… (la URL pública, sin / final)");

export const options = {
  scenarios: {
    checkouts: {
      executor: "per-vu-iterations",
      vus: 10, // 10 compradoras a la vez…
      iterations: 1, // …una compra cada una
      maxDuration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

export function setup() {
  // Junta variantes CON existencias desde el catálogo público.
  const res = http.get(`${BASE}/api/productos`);
  if (res.status !== 200) throw new Error(`setup: /api/productos respondió ${res.status}`);
  const variantes = [];
  for (const p of res.json("productos")) {
    for (const v of p.variantes) {
      if (v.existencias > 0) variantes.push(v.id);
    }
  }
  if (variantes.length < 10) {
    throw new Error(`setup: solo ${variantes.length} variantes con stock — se necesitan ≥10`);
  }
  return { variantes };
}

export default function checkoutConcurrente(datos) {
  // Cada VU compra UNA variante distinta (evita el 409 por variante repetida
  // y reparte el golpe); cantidad 1 para no acercarse a agotar nada.
  const variante = datos.variantes[(__VU - 1) % datos.variantes.length];
  const res = http.post(
    `${BASE}/api/pedidos`,
    JSON.stringify({
      items: [{ variante_id: variante, cantidad: 1 }],
      email_contacto: `k6-carga-${__VU}@prueba.local`,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, {
    "checkout 201": (r) => r.status === 201,
    "trae folio": (r) => r.status === 201 && /^LS-/.test(r.json("folio")),
  });
}
