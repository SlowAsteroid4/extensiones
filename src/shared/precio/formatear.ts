// El dinero se almacena como enteros en CENTAVOS de MXN (ver prisma/schema.prisma).

const FORMATO_ENTERO = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FORMATO_CON_CENTAVOS = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un monto en centavos de MXN para mostrar: "$1,990" si es cantidad
 * exacta de pesos, "$1,990.50" si lleva centavos.
 */
export function formatearPrecioMXN(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new TypeError(`El monto debe ser un entero en centavos, se recibió: ${centavos}`);
  }
  if (centavos < 0) {
    throw new RangeError(`El monto no puede ser negativo: ${centavos}`);
  }
  const pesos = centavos / 100;
  return centavos % 100 === 0 ? FORMATO_ENTERO.format(pesos) : FORMATO_CON_CENTAVOS.format(pesos);
}

/** Convierte pesos (puede llevar decimales de centavo) a centavos enteros. */
export function pesosACentavos(pesos: number): number {
  if (!Number.isFinite(pesos)) {
    throw new TypeError(`Cantidad de pesos inválida: ${pesos}`);
  }
  const centavos = Math.round(pesos * 100);
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError(`Cantidad fuera de rango: ${pesos}`);
  }
  return centavos;
}
