// Script anti-parpadeo: corre ANTES del primer paint y deja el tema resuelto
// en <html data-tema>. Sin él, una recarga en oscuro muestra un flash blanco
// porque el HTML del servidor no sabe qué prefiere la usuaria.
//
// Va inline a propósito (no next/script): tiene que ejecutarse síncrono en el
// <head>, y `afterInteractive` —el default— es demasiado tarde.
// La clave se importa de ./clave (módulo sin "use client"): importarla de
// ./tema la haría cruzar la frontera RSC y llegaría undefined.
import { CLAVE_TEMA } from "./clave";

// Minificado a mano: es la única cosa que bloquea el render.
const SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(CLAVE_TEMA)});var r=(p==="claro"||p==="oscuro")?p:(matchMedia("(prefers-color-scheme: dark)").matches?"oscuro":"claro");document.documentElement.dataset.tema=r}catch(e){document.documentElement.dataset.tema="claro"}})()`;

export function ScriptTema() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
