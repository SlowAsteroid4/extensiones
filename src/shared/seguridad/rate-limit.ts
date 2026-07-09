// Rate limit básico de login (spec §7, cerrado en 3.D.5 de T4):
// máx 5 intentos fallidos por email en ventana de 15 minutos → 429.
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

  registrarFallo(clave: string): void {
    this.intentos.set(clave, [...this.vigentes(clave), this.ahora()]);
  }

  limpiar(clave: string): void {
    this.intentos.delete(clave);
  }
}

const VENTANA_LOGIN_MS = 15 * 60 * 1000;
const MAX_INTENTOS_LOGIN = 5;

// Singleton vía globalThis para sobrevivir el hot-reload de next dev.
const globalConLimitador = globalThis as unknown as { limitadorLogin?: LimitadorIntentos };

export const limitadorLogin =
  globalConLimitador.limitadorLogin ?? new LimitadorIntentos(MAX_INTENTOS_LOGIN, VENTANA_LOGIN_MS);

if (process.env.NODE_ENV !== "production") {
  globalConLimitador.limitadorLogin = limitadorLogin;
}
