// Provider FAKE (Fase A del encargo 08, autorizado por la mesa): permite probar
// pedidos/webhook/stock completos SIN credenciales reales de MercadoPago.
// Convención de fixture para obtenerPago: el id del pago sintético codifica el
// resultado y el folio →  fake-pago-aprobado-LS-XXXXXX · fake-pago-rechazado-LS-XXXXXX
// NUNCA usar en producción: se selecciona con PASARELA_PROVIDER=fake.
import { urlApp } from "@/shared/config/app-url";
import type { InfoPago, PasarelaProvider, PreferenciaCreada } from "./provider";

const PATRON_PAGO_FAKE = /^fake-pago-(aprobado|rechazado|otro)-(.+)$/;

export const proveedorFake: PasarelaProvider = {
  nombre: "fake",

  async crearPreferencia({ folio }): Promise<PreferenciaCreada> {
    // Delta autorizado (encargo 10): el init_point apunta a la confirmación
    // local para que el flujo de compra no muera en un dominio falso. La UI
    // SIEMPRE redirige a init_point: cuando entre el provider real de
    // MercadoPago devolverá su init_point real y la UI no cambia.
    const appUrl = urlApp();
    return {
      pasarela_ref: `fake-pref-${folio}`,
      init_point: `${appUrl}/pedido/${folio}?pago=simulado`,
    };
  },

  async obtenerPago(idPago: string): Promise<InfoPago | null> {
    const coincidencia = PATRON_PAGO_FAKE.exec(idPago);
    if (!coincidencia) return null;
    const [, resultado, folio] = coincidencia;
    return {
      pasarela_ref: idPago,
      folio,
      estado: resultado === "aprobado" ? "aprobado" : resultado === "rechazado" ? "rechazado" : "otro",
    };
  },
};
