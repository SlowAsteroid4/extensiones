// Interfaz de pasarela (3.D.1): el código de pedidos SOLO conoce esta interfaz;
// el SDK de MercadoPago vive únicamente en el adapter.

export interface ItemPreferencia {
  titulo: string;
  cantidad: number;
  /** En CENTAVOS de MXN (convención del proyecto). */
  precio_unitario_centavos: number;
}

export interface DatosPreferencia {
  folio: string;
  items: ItemPreferencia[];
  email_comprador: string;
}

export interface PreferenciaCreada {
  /** Referencia de la pasarela (id de la preferencia). */
  pasarela_ref: string;
  /** URL de pago a la que la UI mandará a la clienta. */
  init_point: string;
}

export type EstadoPagoPasarela = "aprobado" | "rechazado" | "otro";

export interface InfoPago {
  /** Id del pago en la pasarela. */
  pasarela_ref: string;
  /** external_reference: nuestro folio LS-XXXXXX. */
  folio: string;
  estado: EstadoPagoPasarela;
}

export interface PasarelaProvider {
  nombre: string;
  crearPreferencia(datos: DatosPreferencia): Promise<PreferenciaCreada>;
  /** Consulta el pago notificado por el webhook. null = pago desconocido. */
  obtenerPago(idPago: string): Promise<InfoPago | null>;
}
