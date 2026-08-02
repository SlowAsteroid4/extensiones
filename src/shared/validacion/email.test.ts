// Revisión del correo del alta (ASVS §5.1 + higiene OSINT del contacto).
import { describe, expect, it } from "vitest";
import {
  MENSAJE_EMAIL,
  MENSAJE_EMAIL_DESECHABLE,
  MENSAJE_EMAIL_DOMINIO,
  MENSAJE_EMAIL_LARGO,
  MENSAJE_EMAIL_SIN_BUZON,
  MENSAJE_EMAIL_UNICODE,
  normalizarEmail,
  revisarEmail,
} from "./email";

const motivo = (valor: unknown) => {
  const revision = revisarEmail(valor);
  return revision.ok ? null : revision.motivo;
};

describe("revisarEmail · forma", () => {
  it("acepta correos corrientes y los normaliza", () => {
    for (const valor of ["Ana@Example.com", "  ana.torres+tienda@correo.com.mx  ", "a_b-c@sub.dominio.mx"]) {
      const revision = revisarEmail(valor);
      expect(revision.ok, valor).toBe(true);
      expect(revision.ok && revision.email).toBe(normalizarEmail(valor));
    }
  });

  it("rechaza lo que no es un correo", () => {
    for (const valor of ["no-es-email", "ana@", "@example.com", "ana..torres@example.com", 42, null]) {
      expect(motivo(valor), String(valor)).not.toBeNull();
    }
  });

  it("rechaza el dominio sin punto y la IP literal", () => {
    expect(motivo("ana@localhost")).toBe(MENSAJE_EMAIL_DOMINIO);
    expect(motivo("ana@192.168.0.1")).toBe(MENSAJE_EMAIL_DOMINIO);
    expect(motivo("ana@[192.168.0.1]")).toBe(MENSAJE_EMAIL_DOMINIO);
  });

  it("rechaza el correo más largo que el máximo del RFC", () => {
    expect(motivo(`${"a".repeat(250)}@example.com`)).toBe(MENSAJE_EMAIL_LARGO);
  });

  it("la entrada vacía cae en el mensaje de formato", () => {
    expect(motivo("   ")).toBe(MENSAJE_EMAIL);
  });
});

describe("revisarEmail · riesgos (OSINT)", () => {
  it("rechaza el dominio homógrafo con letras de otro alfabeto", () => {
    // "gmаil" con 'а' cirílica: a ojo es idéntico a gmail.com.
    expect(motivo("ana@gmаil.com")).toBe(MENSAJE_EMAIL_UNICODE);
  });

  it("rechaza los buzones que no reciben correo", () => {
    expect(motivo("no-reply@example.com")).toBe(MENSAJE_EMAIL_SIN_BUZON);
    expect(motivo("mailer-daemon@example.com")).toBe(MENSAJE_EMAIL_SIN_BUZON);
  });

  it("rechaza dominios desechables, también en subdominio", () => {
    expect(motivo("ana@mailinator.com")).toBe(MENSAJE_EMAIL_DESECHABLE);
    expect(motivo("ana@correo.yopmail.com")).toBe(MENSAJE_EMAIL_DESECHABLE);
  });

  it("no confunde un dominio legítimo con uno desechable", () => {
    expect(revisarEmail("ana@gmail.com").ok).toBe(true);
    expect(revisarEmail("ana@tempmailer.example.mx").ok).toBe(true);
  });
});
