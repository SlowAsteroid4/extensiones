// Política de contraseña (OWASP ASVS §2.1). La misma evaluación pinta la lista
// animada del formulario y decide el POST, así que lo que se prueba aquí es
// exactamente lo que ve la clienta.
import { describe, expect, it } from "vitest";
import {
  evaluarPassword,
  LONGITUD_MAXIMA_PASSWORD,
  LONGITUD_MINIMA_PASSWORD,
  MENSAJE_PASSWORD_CORTA,
  MENSAJE_PASSWORD_LARGA,
  MENSAJE_PASSWORD_OBVIA,
  MENSAJE_PASSWORD_PERSONAL,
} from "./password";

const requisito = (password: string, id: string, contexto = {}) =>
  evaluarPassword(password, contexto).requisitos.find((r) => r.id === id)!;

describe("evaluarPassword · longitud (ASVS 2.1.1 / 2.1.2)", () => {
  it("acepta desde el mínimo exacto", () => {
    const justa = "a".repeat(LONGITUD_MINIMA_PASSWORD - 1) + "B7!";
    expect(evaluarPassword(justa).requisitos[0].cumple).toBe(true);
  });

  it("rechaza por debajo del mínimo con el mensaje del requisito", () => {
    const veredicto = evaluarPassword("Corta-12");
    expect(veredicto.valida).toBe(false);
    expect(veredicto.motivo).toBe(MENSAJE_PASSWORD_CORTA);
  });

  it("rechaza pasada la longitud máxima (no se trunca en silencio)", () => {
    const veredicto = evaluarPassword("Aa1!".repeat(LONGITUD_MAXIMA_PASSWORD));
    expect(veredicto.valida).toBe(false);
    expect(veredicto.motivo).toBe(MENSAJE_PASSWORD_LARGA);
  });

  it("acepta espacios y acentos: no se recorta el juego de caracteres", () => {
    expect(evaluarPassword("mi jardín tiene 4 gatos").valida).toBe(true);
  });
});

describe("evaluarPassword · obvias (ASVS 2.1.7)", () => {
  it("rechaza contraseñas de las listas públicas aunque lleven dígitos detrás", () => {
    for (const password of ["contraseña2024", "password12345", "TeAmoMucho99", "iloveyou1234"]) {
      expect(evaluarPassword(password).motivo, password).toBe(MENSAJE_PASSWORD_OBVIA);
    }
  });

  it("rechaza secuencias, repeticiones y filas de teclado largas", () => {
    for (const password of ["123456789012", "aaaaaaaaaaaaaa", "abcdefghijkl", "qwertyuiop12"]) {
      expect(evaluarPassword(password).requisitos[1].cumple, password).toBe(false);
    }
  });

  it("no se deja engañar por los sustitutos de siempre (@ 4 3 0 $)", () => {
    expect(evaluarPassword("C0ntr@señ4!!").requisitos[1].cumple).toBe(false);
  });

  it("una frase larga y propia pasa el requisito", () => {
    expect(requisito("dos gatos en el tejado", "no-obvia").cumple).toBe(true);
  });
});

describe("evaluarPassword · datos adivinables (OSINT)", () => {
  const contexto = { email: "ana.torres@example.com", nombre: "Ana Torres" };

  it("rechaza la que contiene la parte local del correo", () => {
    const veredicto = evaluarPassword("torres-en-la-playa", contexto);
    expect(veredicto.valida).toBe(false);
    expect(veredicto.motivo).toBe(MENSAJE_PASSWORD_PERSONAL);
  });

  it("rechaza la que contiene el nombre del negocio", () => {
    expect(evaluarPassword("Extensiones2026!").motivo).toBe(MENSAJE_PASSWORD_PERSONAL);
  });

  it("no castiga a quien no repite sus datos", () => {
    expect(evaluarPassword("bicicleta-verde-77", contexto).valida).toBe(true);
  });
});

describe("evaluarPassword · fuerza y señales (informativas, ASVS 2.1.9)", () => {
  it("la variedad NO es obligatoria: solo minúsculas también vale", () => {
    const veredicto = evaluarPassword("caminata por el bosque");
    expect(veredicto.valida).toBe(true);
    expect(veredicto.senales.find((s) => s.id === "mayusculas")!.cumple).toBe(false);
  });

  it("la fuerza sube con longitud y variedad", () => {
    const floja = evaluarPassword("solo-palabras12");
    const buena = evaluarPassword("Rk7#tejado-Violeta-92x");
    expect(buena.fuerza).toBeGreaterThan(floja.fuerza);
    expect(buena.etiquetaFuerza).toBe("Excelente");
  });

  it("sin contraseña: fuerza 0 y ningún requisito marcado", () => {
    const veredicto = evaluarPassword("");
    expect(veredicto.fuerza).toBe(0);
    expect(veredicto.requisitos.every((r) => !r.cumple)).toBe(true);
    expect(veredicto.valida).toBe(false);
  });

  it("una contraseña rechazada nunca se pinta como fuerte", () => {
    expect(evaluarPassword("qwertyuiopasdfghjkl").fuerza).toBeLessThanOrEqual(1);
  });
});
