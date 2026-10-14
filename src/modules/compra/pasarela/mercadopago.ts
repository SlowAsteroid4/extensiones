// Adapter real de MercadoPago Checkout Pro (ADR-004). Código de producción:
// se activa con PASARELA_PROVIDER=mercadopago + MERCADOPAGO_ACCESS_TOKEN de env.
import { MercadoPagoConfig, Payment, Preference, User } from "mercadopago";
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

// Con una cuenta vendedora DE PRUEBA, el checkout de pruebas es
// sandbox_init_point; init_point abre el de producción. La cuenta misma
// declara si es de prueba (tag `test_user` de /users/me), así que cambiar el
// token de prueba por el de producción basta: no hay bandera que olvidar.
export function elegirUrlCheckout(
  urls: { init_point?: string; sandbox_init_point?: string },
  cuentaDePrueba: boolean
): string | undefined {
  return cuentaDePrueba ? urls.sandbox_init_point : urls.init_point;
}

// Una consulta a /users/me por token y proceso. Un fallo no se guarda: el
// siguiente checkout vuelve a consultar.
const cuentaDePruebaPorToken = new Map<string, boolean>();

// Falla cerrado: si no se puede saber qué tipo de cuenta es, el error sube y el
// pedido responde 502 sin quedar huérfano. Nunca se supone producción.
async function esCuentaDePrueba(cliente: MercadoPagoConfig, accessToken: string) {
  const guardado = cuentaDePruebaPorToken.get(accessToken);
  if (guardado !== undefined) return guardado;

  const usuario = await new User(cliente).get();
  if (!Array.isArray(usuario.tags)) {
    throw new Error("MercadoPago /users/me no devolvió tags: no se puede elegir el checkout");
  }
  const esPrueba = usuario.tags.includes("test_user");
  cuentaDePruebaPorToken.set(accessToken, esPrueba);
  return esPrueba;
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
      // Antes de crear nada en MP: si la cuenta no se puede verificar, no
      // queda una preferencia suelta.
      const cuentaDePrueba = await esCuentaDePrueba(cliente, accessToken);
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

      const urlCheckout = elegirUrlCheckout(preferencia, cuentaDePrueba);
      if (!preferencia.id || !urlCheckout) {
        const campo = cuentaDePrueba ? "sandbox_init_point" : "init_point";
        throw new Error(`MercadoPago no devolvió id/${campo} de la preferencia`);
      }
      return { pasarela_ref: preferencia.id, init_point: urlCheckout };
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
