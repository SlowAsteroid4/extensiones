// Clave de localStorage del tema.
//
// Vive en su propio módulo SIN "use client" a propósito: la importan tanto el
// store de cliente (tema.tsx) como ScriptTema, que es Server Component. Si se
// importara desde tema.tsx —que sí es "use client"— el servidor recibiría una
// referencia de cliente y no el string: el script quedaba con
// localStorage.getItem(undefined) y el tema guardado nunca se aplicaba.
export const CLAVE_TEMA = "ls-tema";
