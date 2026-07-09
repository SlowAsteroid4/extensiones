import { describe, expect, it } from "vitest";
import { LimitadorIntentos } from "./rate-limit";

const VENTANA = 15 * 60 * 1000;

function limitadorConReloj(inicio = 0) {
  let momento = inicio;
  const limitador = new LimitadorIntentos(5, VENTANA, () => momento);
  return { limitador, avanzar: (ms: number) => (momento += ms) };
}

describe("LimitadorIntentos (login: 5 fallos / 15 min)", () => {
  it("no bloquea con 4 fallos", () => {
    const { limitador } = limitadorConReloj();
    for (let i = 0; i < 4; i++) limitador.registrarFallo("a@x.com");
    expect(limitador.bloqueado("a@x.com")).toBe(false);
  });

  it("bloquea el 6.º intento tras 5 fallos", () => {
    const { limitador } = limitadorConReloj();
    for (let i = 0; i < 5; i++) limitador.registrarFallo("a@x.com");
    expect(limitador.bloqueado("a@x.com")).toBe(true);
  });

  it("desbloquea cuando la ventana de 15 minutos expira", () => {
    const { limitador, avanzar } = limitadorConReloj();
    for (let i = 0; i < 5; i++) limitador.registrarFallo("a@x.com");
    avanzar(VENTANA + 1);
    expect(limitador.bloqueado("a@x.com")).toBe(false);
  });

  it("solo cuenta los fallos dentro de la ventana", () => {
    const { limitador, avanzar } = limitadorConReloj();
    limitador.registrarFallo("a@x.com");
    limitador.registrarFallo("a@x.com");
    avanzar(VENTANA + 1); // los dos primeros expiran
    for (let i = 0; i < 3; i++) limitador.registrarFallo("a@x.com");
    expect(limitador.bloqueado("a@x.com")).toBe(false);
  });

  it("el login exitoso limpia el contador", () => {
    const { limitador } = limitadorConReloj();
    for (let i = 0; i < 5; i++) limitador.registrarFallo("a@x.com");
    limitador.limpiar("a@x.com");
    expect(limitador.bloqueado("a@x.com")).toBe(false);
  });

  it("aísla contadores por clave (email)", () => {
    const { limitador } = limitadorConReloj();
    for (let i = 0; i < 5; i++) limitador.registrarFallo("a@x.com");
    expect(limitador.bloqueado("b@x.com")).toBe(false);
  });
});
