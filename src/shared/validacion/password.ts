// Política de contraseña — OWASP ASVS v4 §2.1 + NIST SP 800-63B §5.1.1.2.
//
//   · 2.1.1  mínimo 12 caracteres (antes 8: el mínimo de la norma subió)
//   · 2.1.2  máximo alto (128) y SIN truncar — argon2 recibe la contraseña entera
//   · 2.1.3  se permite cualquier carácter imprimible, espacios y Unicode incluidos
//   · 2.1.7  se rechazan las contraseñas comunes, las obvias (secuencias y
//            repeticiones) y las que reciclan datos públicos de la persona o de
//            la tienda — el vector OSINT: lo que cualquiera puede averiguar
//            (su correo, su nombre, el nombre del negocio) no es un secreto
//   · 2.1.9  SIN reglas de composición obligatorias: exigir "una mayúscula y un
//            símbolo" empeora las contraseñas reales. La variedad solo alimenta
//            el medidor de fuerza, que es informativo y NUNCA bloquea.
//
// Módulo puro (sin node, sin DOM): lo importa el cliente para pintar la lista
// de requisitos y el servidor para decidir, así el veredicto y el texto que ve
// la clienta no pueden divergir. El chequeo contra filtraciones reales (HIBP)
// es server-only y vive en `@/shared/seguridad/passwords-filtradas`.

export const LONGITUD_MINIMA_PASSWORD = 12;
export const LONGITUD_MAXIMA_PASSWORD = 128;

export const MENSAJE_PASSWORD_CORTA = `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`;
export const MENSAJE_PASSWORD_LARGA = `La contraseña no puede pasar de ${LONGITUD_MAXIMA_PASSWORD} caracteres`;
export const MENSAJE_PASSWORD_OBVIA = "Esa contraseña es demasiado común o predecible: elige otra";
export const MENSAJE_PASSWORD_PERSONAL =
  "La contraseña no puede contener tu correo, tu nombre ni el de la tienda";
export const MENSAJE_PASSWORD_FILTRADA =
  "Esa contraseña aparece en filtraciones públicas: elige otra";

// Top de contraseñas de las listas públicas (rockyou / SecLists), recortado a
// las que de verdad aparecen en un registro en español. La base va sin dígitos
// finales a propósito: `evaluarPassword` prueba también la raíz de la
// contraseña (contraseña2024 → contraseña).
const RAICES_COMUNES = new Set([
  "password",
  "passw0rd",
  "contrasena",
  "contrasenia",
  "clave",
  "secreto",
  "qwerty",
  "qwertyui",
  "qwertyuiop",
  "asdfgh",
  "asdfghjk",
  "zxcvbnm",
  "iloveyou",
  "teamo",
  "teamomucho",
  "princesa",
  "princess",
  "hermosa",
  "bonita",
  "guapa",
  "mialma",
  "mivida",
  "micorazon",
  "amordemivida",
  "hola",
  "holahola",
  "holamundo",
  "bienvenida",
  "letmein",
  "welcome",
  "admin",
  "administrador",
  "usuario",
  "invitado",
  "sistema",
  "master",
  "dragon",
  "monkey",
  "football",
  "futbol",
  "beisbol",
  "chivas",
  "america",
  "mexico",
  "guadalajara",
  "monterrey",
  "sunshine",
  "shadow",
  "michael",
  "jennifer",
  "jessica",
  "daniela",
  "fernanda",
  "guadalupe",
  "alejandra",
  "mariana",
  "familia",
  "gatito",
  "perrito",
  "estrella",
  "mariposa",
  "chocolate",
]);
// Los términos de la tienda (lizzy, extensiones, cabello…) NO viven aquí: los
// cubre el requisito de datos adivinables, cuyo mensaje explica mejor el porqué.

// Términos del negocio: adivinables por cualquiera que entre a la tienda.
const TERMINOS_DEL_SITIO = ["lizzy", "stephy", "extensiones", "extension", "cabello", "tienda"];

const LONGITUD_MINIMA_TOKEN = 4;

/* ── Normalización ─────────────────────────────────────────────────────────
   Comparaciones sin acentos, sin mayúsculas y sin los sustitutos de siempre
   (a→4, e→3, i→1, o→0, s→5): "C0ntr@señ4" es la misma contraseña de siempre. */

function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Deshace los sustitutos de dígitos (a→4, e→3, o→0, s→5, t→7, i→1). */
function sinDigitosDisfrazados(texto: string): string {
  return sinAcentos(texto.toLowerCase())
    .replace(/[@4]/g, "a")
    .replace(/[3€]/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

/** Además de los dígitos, `!` y `|` como "i" — "contr@señ4!!" y "h0l!ta". */
function aforma(texto: string): string {
  return sinDigitosDisfrazados(texto).replace(/[!|]/g, "i");
}

/* ── Patrones obvios ────────────────────────────────────────────────────── */

// Un solo carácter repetido (aaaaaaaaaaaa) o dos alternados (ababababab).
function esRepeticion(texto: string): boolean {
  const unicos = new Set(texto).size;
  return texto.length >= 4 && unicos <= 2;
}

// Corrida ascendente o descendente de códigos: 123456, abcdef, 987654.
function esSecuencia(texto: string): boolean {
  if (texto.length < 4) return false;
  let subiendo = true;
  let bajando = true;
  for (let i = 1; i < texto.length; i++) {
    const salto = texto.charCodeAt(i) - texto.charCodeAt(i - 1);
    if (salto !== 1) subiendo = false;
    if (salto !== -1) bajando = false;
  }
  return subiendo || bajando;
}

// Filas del teclado (se recorren también al revés y dando la vuelta: 890123).
const FILAS_TECLADO = ["qwertyuiop", "asdfghjklñ", "zxcvbnm", "1234567890"].flatMap((fila) => [
  fila.repeat(2),
  [...fila].reverse().join("").repeat(2),
]);

// Paseo por el teclado: la contraseña entera se cubre encadenando tramos de
// alguna fila (qwertyuiopasdfghjkl son dos tramos, no una sola fila).
function esCaminataDeTeclado(texto: string): boolean {
  const MINIMO_TRAMO = 4;
  if (texto.length < 6) return false;
  let desde = 0;
  while (desde < texto.length) {
    let mejor = 0;
    for (let largo = texto.length - desde; largo >= MINIMO_TRAMO; largo--) {
      const tramo = texto.slice(desde, desde + largo);
      if (FILAS_TECLADO.some((fila) => fila.includes(tramo))) {
        mejor = largo;
        break;
      }
    }
    if (mejor === 0) return false;
    desde += mejor;
  }
  return true;
}

// Quita la decoración de los extremos (123, 2024, !, .) para quedarse con la
// palabra: "contraseña2024" → "contrasena".
function soloLetrasEnLosBordes(texto: string): string {
  return texto.replace(/^[^a-z]+/, "").replace(/[^a-z]+$/, "");
}

// Se prueban varias lecturas de la misma contraseña porque el orden importa:
// "contraseña2024" hay que despellejarla ANTES de deshacer el leet (si no, el
// 2024 se convierte en letras) y "C0ntr@señ4!!" justo al revés.
function lecturas(password: string): string[] {
  const plana = sinAcentos(password.toLowerCase());
  const bases = [plana, sinDigitosDisfrazados(password), aforma(password)];
  const todas = [...bases, ...bases.map(soloLetrasEnLosBordes)];
  return [...new Set(todas)].filter((lectura) => lectura.length > 0);
}

function esObvia(password: string): boolean {
  if (password.length === 0) return false;
  return lecturas(password).some(
    (lectura) =>
      RAICES_COMUNES.has(lectura) ||
      (lectura.length >= LONGITUD_MINIMA_TOKEN &&
        (esRepeticion(lectura) || esSecuencia(lectura) || esCaminataDeTeclado(lectura)))
  );
}

/* ── Datos adivinables (OSINT) ─────────────────────────────────────────── */

export interface ContextoPassword {
  email?: string;
  nombre?: string;
}

// Trozos "adivinables": la parte local del correo, su dominio sin TLD, cada
// palabra del nombre y los términos de la tienda.
function tokensAdivinables({ email = "", nombre = "" }: ContextoPassword): string[] {
  const partes: string[] = [...TERMINOS_DEL_SITIO];
  const arroba = email.lastIndexOf("@");
  if (arroba > 0) {
    partes.push(email.slice(0, arroba));
    partes.push(...email.slice(arroba + 1).split("."));
  } else if (email) {
    partes.push(email);
  }
  partes.push(...nombre.split(/\s+/));
  return partes
    .flatMap((parte) => aforma(parte).split(/[^a-z0-9]+/))
    .filter((token) => token.length >= LONGITUD_MINIMA_TOKEN);
}

function usaDatosAdivinables(password: string, contexto: ContextoPassword): boolean {
  if (password.length === 0) return false;
  const normalizada = aforma(password);
  return tokensAdivinables(contexto).some((token) => normalizada.includes(token));
}

/* ── Fuerza (informativa) ──────────────────────────────────────────────── */

const CLASES: { prueba: RegExp; tamano: number }[] = [
  { prueba: /[a-z]/u, tamano: 26 },
  { prueba: /[A-Z]/u, tamano: 26 },
  { prueba: /[0-9]/u, tamano: 10 },
  { prueba: /[^a-zA-Z0-9]/u, tamano: 33 },
];

// Entropía aproximada: longitud × log2(alfabeto usado), castigada cuando la
// contraseña repite muy pocos caracteres distintos. No pretende ser zxcvbn:
// solo ordena "débil → excelente" de forma estable para el medidor.
function bitsAproximados(password: string): number {
  if (password.length === 0) return 0;
  const alfabeto = CLASES.reduce((suma, clase) => suma + (clase.prueba.test(password) ? clase.tamano : 0), 0);
  const bits = password.length * Math.log2(Math.max(alfabeto, 2));
  const variedad = new Set(password).size / password.length;
  return bits * (variedad < 0.4 ? 0.5 : 1);
}

export type NivelFuerza = 0 | 1 | 2 | 3 | 4;

const ETIQUETAS_FUERZA: Record<NivelFuerza, string> = {
  0: "Sin contraseña",
  1: "Débil",
  2: "Aceptable",
  3: "Fuerte",
  4: "Excelente",
};

/* ── Evaluación ────────────────────────────────────────────────────────── */

export type IdRequisito = "longitud" | "no-obvia" | "sin-datos";
export type IdSenal = "minusculas" | "mayusculas" | "numeros" | "simbolos" | "larga";

export interface RequisitoPassword {
  id: IdRequisito;
  etiqueta: string;
  cumple: boolean;
}

export interface SenalPassword {
  id: IdSenal;
  etiqueta: string;
  cumple: boolean;
}

export interface EvaluacionPassword {
  requisitos: RequisitoPassword[];
  /** Variedad: suma fuerza, nunca bloquea (ASVS 2.1.9). */
  senales: SenalPassword[];
  fuerza: NivelFuerza;
  etiquetaFuerza: string;
  valida: boolean;
  /** Mensaje del primer requisito incumplido — el que se muestra inline. */
  motivo?: string;
}

export function evaluarPassword(password: string, contexto: ContextoPassword = {}): EvaluacionPassword {
  const larga = password.length > LONGITUD_MAXIMA_PASSWORD;
  const requisitos: RequisitoPassword[] = [
    {
      id: "longitud",
      etiqueta: `Al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`,
      cumple: password.length >= LONGITUD_MINIMA_PASSWORD && !larga,
    },
    {
      id: "no-obvia",
      etiqueta: "No es una contraseña común ni una secuencia",
      cumple: password.length > 0 && !esObvia(password),
    },
    {
      id: "sin-datos",
      etiqueta: "No usa tu correo, tu nombre ni el de la tienda",
      cumple: password.length > 0 && !usaDatosAdivinables(password, contexto),
    },
  ];

  const senales: SenalPassword[] = [
    { id: "minusculas", etiqueta: "minúsculas", cumple: /[a-záéíóúüñ]/u.test(password) },
    { id: "mayusculas", etiqueta: "MAYÚSCULAS", cumple: /[A-ZÁÉÍÓÚÜÑ]/u.test(password) },
    { id: "numeros", etiqueta: "números", cumple: /[0-9]/u.test(password) },
    { id: "simbolos", etiqueta: "símbolos", cumple: /[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]/u.test(password) },
    { id: "larga", etiqueta: "16+ caracteres", cumple: password.length >= 16 },
  ];

  const cumpleTodo = requisitos.every((requisito) => requisito.cumple);
  const bits = cumpleTodo ? bitsAproximados(password) : Math.min(bitsAproximados(password), 28);
  const fuerza: NivelFuerza =
    password.length === 0 ? 0 : bits >= 115 ? 4 : bits >= 85 ? 3 : bits >= 60 ? 2 : 1;

  const motivo = larga
    ? MENSAJE_PASSWORD_LARGA
    : !requisitos[0].cumple
      ? MENSAJE_PASSWORD_CORTA
      : !requisitos[1].cumple
        ? MENSAJE_PASSWORD_OBVIA
        : !requisitos[2].cumple
          ? MENSAJE_PASSWORD_PERSONAL
          : undefined;

  return {
    requisitos,
    senales,
    fuerza,
    etiquetaFuerza: ETIQUETAS_FUERZA[fuerza],
    valida: cumpleTodo && !larga,
    motivo,
  };
}
