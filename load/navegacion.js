// T9 · BLOQUE 5 — Escenario 1: navegación de catálogo y ficha.
// 50 usuarias concurrentes durante 2 minutos, con subida GRADUAL (el plan
// free de Neon y el Hobby de Vercel se respetan: primero humo, luego rampa).
//
//   Humo (5 VUs, 30s):   k6 run -e BASE_URL=https://<url> -e SMOKE=1 load/navegacion.js
//   Completo:            k6 run -e BASE_URL=https://<url> load/navegacion.js
//
// Solo lecturas (GET): este escenario NO crea datos — no hay nada que limpiar.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error("Falta -e BASE_URL=https://… (la URL pública, sin / final)");

const RAMPA_COMPLETA = [
  { duration: "20s", target: 10 }, // arranque suave
  { duration: "20s", target: 25 }, // media carga
  { duration: "2m", target: 50 }, // meseta objetivo: 50 concurrentes × 2 min
  { duration: "20s", target: 0 }, // enfriamiento
];
const RAMPA_HUMO = [
  { duration: "15s", target: 5 },
  { duration: "15s", target: 0 },
];

export const options = {
  scenarios: {
    navegacion: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? RAMPA_HUMO : RAMPA_COMPLETA,
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    // Umbral honesto para serverless + Neon free (cold starts incluidos).
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

export function setup() {
  const res = http.get(`${BASE}/api/productos`);
  if (res.status !== 200) throw new Error(`setup: /api/productos respondió ${res.status}`);
  const slugs = res.json("productos").map((p) => p.slug);
  if (slugs.length === 0) throw new Error("setup: catálogo vacío — siembra antes de medir");
  return { slugs };
}

const FAMILIAS = ["rubios", "castaños", "negros", "rojizos", "mechas"];

export default function navegacion(datos) {
  // Recorrido típico: home → catálogo (API) → facetas → una ficha al azar.
  const home = http.get(`${BASE}/catalogo`);
  check(home, { "catálogo HTML 200": (r) => r.status === 200 });
  sleep(Math.random() * 2 + 0.5);

  const familia = FAMILIAS[Math.floor(Math.random() * FAMILIAS.length)];
  const lista = http.get(`${BASE}/api/productos?familia=${encodeURIComponent(familia)}`);
  check(lista, { "lista filtrada 200": (r) => r.status === 200 });

  const facetas = http.get(`${BASE}/api/productos/facetas`);
  check(facetas, { "facetas 200": (r) => r.status === 200 });
  sleep(Math.random() * 2 + 0.5);

  const slug = datos.slugs[Math.floor(Math.random() * datos.slugs.length)];
  const ficha = http.get(`${BASE}/api/productos/${slug}`);
  check(ficha, { "ficha 200": (r) => r.status === 200 });
  sleep(Math.random() * 3 + 1);
}
