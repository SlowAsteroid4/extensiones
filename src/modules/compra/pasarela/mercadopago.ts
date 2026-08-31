// Adapter real de MercadoPago Checkout Pro (ADR-004). Código de producción:
// se activa con PASARELA_PROVIDER=mercadopago + MERCADOPAGO_ACCESS_TOKEN de env.
// FASE B pendiente: aún sin ejercitar contra el sandbox real (sin credenciales).
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { urlApp } from "@/shared/config/app-url";
import type { EstadoPagoPasarela, InfoPago, PasarelaProvider, PreferenciaCreada } from "./provider";

// Mapeo de estados de pago de MP → estados de la pasarela (función pura, testeable).
export function mapearEstadoMP(status: string | undefined): EstadoPagoPasarela {
  switch (status) {
    case "approved":
      return "aprobado";
    case "rejected":
    case "cancelled":
      return "rechazado";
    default:
      // pending, in_process, refunded, charged_back… — fase 1 no los procesa.
      return "otro";
  }
}

export function crearProveedorMercadoPago(): PasarelaProvider {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "Falta MERCADOPAGO_ACCESS_TOKEN en el entorno (usa PASARELA_PROVIDER=fake mientras tanto)."
    );
  }
  // T8: sale de env (APP_URL en Vercel, o VERCEL_URL en previews). Es lo que
  // hace que notification_url y back_urls apunten al dominio real sin tocar código.
  const appUrl = urlApp();
  const cliente = new MercadoPagoConfig({ accessToken });

  return {
    nombre: "mercadopago",

    async crearPreferencia({ folio, items, email_comprador }): Promise<PreferenciaCreada> {
      const preferencia = await new Preference(cliente).create({
        body: {
          external_reference: folio,
          items: items.map((item, indice) => ({
            id: `${folio}-${indice + 1}`,
            title: item.titulo,
            quantity: item.cantidad,
            currency_id: "MXN",
            // MP espera unidades de moneda; el proyecto guarda centavos.
            unit_price: item.precio_unitario_centavos / 100,
          })),
          payer: { email: email_comprador },
          notification_url: `${appUrl}/api/webhooks/mercadopago`,
          // Delta autorizado (encargo 10): back_urls apuntan a las rutas
          // REALES de confirmación del flujo B — éxito/pendiente a la
          // confirmación (B4) y rechazo a su pantalla de retorno (B3).
          back_urls: {
            success: `${appUrl}/pedido/${folio}`,
            pending: `${appUrl}/pedido/${folio}`,
            failure: `${appUrl}/pedido/${folio}/rechazado`,
          },
        },
      });

      if (!preferencia.id || !preferencia.init_point) {
        throw new Error("MercadoPago no devolvió id/init_point de la preferencia");
      }
      return { pasarela_ref: preferencia.id, init_point: preferencia.init_point };
    },

    async obtenerPago(idPago: string): Promise<InfoPago | null> {
      const pago = await new Payment(cliente).get({ id: idPago }).catch(() => null);
      if (!pago || !pago.external_reference) return null;
      return {
        pasarela_ref: String(pago.id),
        folio: pago.external_reference,
        estado: mapearEstadoMP(pago.status),
      };
    },
  };
}
