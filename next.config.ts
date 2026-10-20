import type { NextConfig } from "next";

// T9 · Headers de seguridad (BLOQUE 2.5) en TODAS las respuestas.
//   · HSTS: 2 años + subdominios + preload. Vercel ya lo manda en *.vercel.app,
//     pero fijarlo aquí lo garantiza también con el dominio propio (T11).
//   · Anti-embebido por partida doble: X-Frame-Options (navegadores viejos) y
//     CSP frame-ancestors (el estándar actual). Solo frame-ancestors — una CSP
//     completa rompería los scripts/estilos inline de Next y excede el alcance.
//   · nosniff + Referrer-Policy + Permissions-Policy (la app no usa cámara,
//     micrófono ni geolocalización: se apagan explícitamente).
const HEADERS_SEGURIDAD = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: HEADERS_SEGURIDAD }];
  },
};

export default nextConfig;
