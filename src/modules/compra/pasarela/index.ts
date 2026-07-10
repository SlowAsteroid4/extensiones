// Selección del provider por configuración (el "swap de una línea" del delta):
//   PASARELA_PROVIDER=fake        → fixture local (Fase A, sin credenciales)
//   PASARELA_PROVIDER=mercadopago → adapter real (requiere MERCADOPAGO_ACCESS_TOKEN)
import type { PasarelaProvider } from "./provider";
import { proveedorFake } from "./fake";
import { crearProveedorMercadoPago } from "./mercadopago";

export function obtenerProveedorPasarela(): PasarelaProvider {
  const nombre = process.env.PASARELA_PROVIDER ?? "mercadopago";
  if (nombre === "fake") return proveedorFake;
  if (nombre === "mercadopago") return crearProveedorMercadoPago();
  throw new Error(`PASARELA_PROVIDER desconocido: ${nombre} (usa "mercadopago" o "fake")`);
}
