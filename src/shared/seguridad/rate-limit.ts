// Rate limit básico (spec §7, cerrado en 3.D.5 de T4):
//   · login   → 5 intentos fallidos por email / 15 min → 429
//   · alta    → 5 cuentas por IP / hora (OWASP ASVS 2.2.1: el alta también es
//               un endpoint de autenticación y hay que frenar el alta masiva)
//   · consulta de correo → 30 por IP / 10 min (ver `disponibilidad.ts`: el
//               endpoint dice si un correo existe, así que el límite es lo que
//               impide barrer una lista de correos)
//
// PILOTO: vive en memoria del proceso — se reinicia con el servidor y no se
// comparte entre instancias. Suficiente según el encargo; para producción
// multi-instancia se movería a DB/Redis.

export class LimitadorIntentos {
  private intentos = new Map<string, number[]>();

  constructor(
    private readonly maxIntentos: number,
    private readonly ventanaMs: number,
    private readonly ahora: () => number = Date.now
  ) {}

  private vigentes(clave: string): number[] {
    const desde = this.ahora() - this.ventanaMs;
    const lista = (this.intentos.get(clave) ?? []).filter((momento) => momento > desde);
    if (lista.length === 0) {
      this.intentos.delete(clave);
    } else {
      this.intentos.set(clave, lista);
    }
    return lista;
  }

  bloqueado(clave: string): boolean {
    return this.vigentes(clave).length >= this.maxIntentos;
  }

  registrarIntento(clave: string): void {
    this.intentos.set(clave, [...this.vigentes(clave), this.ahora()]);
  }

  /** Alias histórico del limitador de login, donde solo cuentan los fallos. */
  registrarFallo(clave: string): void {
    this.registrarIntento(clave);
  }

  limpiar(clave: string): void {
    this.intentos.delete(clave);
  }
}

const VENTANA_LOGIN_MS = 15 * 60 * 1000;
const MAX_INTENTOS_LOGIN = 5;
const VENTANA_REGISTRO_MS = 60 * 60 * 1000;
const MAX_ALTAS_POR_IP = 5;
const VENTANA_CONSULTA_MS = 10 * 60 * 1000;
const MAX_CONSULTAS_POR_IP = 30;

// Singleton vía globalThis para sobrevivir el hot-reload de next dev.
const globalConLimitador = globalThis as unknown as {
  limitadorLogin?: LimitadorIntentos;
  limitadorRegistro?: LimitadorIntentos;
  limitadorConsultaEmail?: LimitadorIntentos;
};

export const limitadorLogin =
  globalConLimitador.limitadorLogin ?? new LimitadorIntentos(MAX_INTENTOS_LOGIN, VENTANA_LOGIN_MS);

export const limitadorRegistro =
  globalConLimitador.limitadorRegistro ?? new LimitadorIntentos(MAX_ALTAS_POR_IP, VENTANA_REGISTRO_MS);

export const limitadorConsultaEmail =
  globalConLimitador.limitadorConsultaEmail ??
  new LimitadorIntentos(MAX_CONSULTAS_POR_IP, VENTANA_CONSULTA_MS);

if (process.env.NODE_ENV !== "production") {
  globalConLimitador.limitadorLogin = limitadorLogin;
  globalConLimitador.limitadorRegistro = limitadorRegistro;
  globalConLimitador.limitadorConsultaEmail = limitadorConsultaEmail;
}

export const MENSAJE_LIMITE_REGISTRO =
  "Se crearon demasiadas cuentas desde esta conexión. Inténtalo de nuevo en una hora.";
export const MENSAJE_LIMITE_CONSULTA =
  "Demasiadas comprobaciones seguidas. Espera unos minutos e inténtalo de nuevo.";

/**
 * IP de la clienta para agrupar el rate limit. Detrás del proxy de la
 * plataforma el valor viaja en `x-forwarded-for`; en localhost no hay ninguno y
 * todas las peticiones caen en el mismo cubo ("local"), que es justo lo que se
 * quiere al probar. OJO: la cabecera es falsificable si el despliegue no está
 * detrás de un proxy que la reescriba — el límite por IP es una barrera de
 * fricción, no un control de autenticación.
 */
export function ipDeSolicitud(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "local";
}
