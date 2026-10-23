// T9 · Humo de solo lecturas, tolerante a catálogo vacío (producción arranca
// sin productos por decisión de la mesa; load/navegacion.js aborta ahí).
// Solo GET: no crea datos, no hay nada que limpiar.
//
//   k6 run -e BASE_URL=https://<url> load/lecturas.js
//
// Rampa de humo: 5 usuarias, 30 s. Para más carga usa navegacion.js con catálogo.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error("Falta -e BASE_URL=https://… (la URL pública, sin / final)");

export const options = {
  scenarios: {
    lecturas: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 5 },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

export function setup() {
  const res = http.get(`${BASE}/api/health`);
  if (res.status !== 200) throw new Error(`setup: /api/health respondió ${res.status}`);
}

export default function lecturas() {
  check(http.get(`${BASE}/`), { "inicio 200": (r) => r.status === 200 });
  sleep(Math.random() * 2 + 0.5);

  check(http.get(`${BASE}/catalogo`), { "catálogo HTML 200": (r) => r.status === 200 });
  check(http.get(`${BASE}/api/categorias`), { "categorías 200": (r) => r.status === 200 });
  check(http.get(`${BASE}/api/productos`), { "lista 200": (r) => r.status === 200 });
  check(http.get(`${BASE}/api/productos/facetas`), { "facetas 200": (r) => r.status === 200 });
  sleep(Math.random() * 2 + 0.5);

  check(http.get(`${BASE}/api/health`), { "health 200": (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);
}
