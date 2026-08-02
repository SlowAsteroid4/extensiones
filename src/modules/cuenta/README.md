# M-CUENTA · Cuenta

**Frontera (spec §3):** registro/login/logout, favoritos, "mi cuenta".
La configuración de Auth.js vive en `src/shared/auth/`.

## Alta de cuenta (H07)

| Pieza | Archivo |
|---|---|
| Política de contraseña (pura, cliente + servidor) | `src/shared/validacion/password.ts` |
| Revisión del correo (pura, cliente + servidor) | `src/shared/validacion/email.ts` |
| Alta: duplicado, hash, campo trampa | `registro.ts` |
| ¿El correo ya tiene cuenta? | `disponibilidad.ts` |
| Formulario y medidor animado | `ui/registro-cliente.tsx`, `ui/medidor-password.tsx` |

### Política de contraseña (OWASP ASVS v4 §2.1 · NIST SP 800-63B)

Obligatorio (bloquea el alta y se pinta como lista de requisitos):

1. **12–128 caracteres.** Cualquier carácter vale: espacios, acentos, emoji. No
   se trunca nada antes de hashear.
2. **Ni común ni obvia.** Lista de raíces frecuentes (también con el año o los
   signos pegados detrás: `contraseña2024`), repeticiones, secuencias y paseos
   por el teclado. Los sustitutos de siempre no engañan: `C0ntr@señ4` se lee
   como `contraseña`.
3. **Sin datos adivinables (OSINT).** No puede contener la parte local del
   correo, su dominio, el nombre que escribió ni el nombre de la tienda: lo que
   cualquiera puede averiguar no es un secreto.

Informativo (nunca bloquea, ASVS 2.1.9 desaconseja exigir composición): el
medidor de fuerza y las señales de variedad (mayúsculas, números, símbolos,
16+). Exigir "una mayúscula y un símbolo" produce `Password1!`, no seguridad.

Opcional: con `PWNED_PASSWORDS_CHECK=on` se contrasta contra Have I Been Pwned
por k-anonymity (salen 5 caracteres del SHA-1, nunca la contraseña). Falla
abierto: si el servicio no responde, el alta sigue.

### Enumeración de correos — decisión, no descuido

`POST /api/cuenta/email-disponible` dice si un correo ya tiene cuenta, así que
es un oráculo de enumeración. Se acepta porque el alta **ya lo era** (el 409
responde "Ese correo ya está registrado", cerrado en T4) y porque enterarse al
final —después de escribir la contraseña— es peor para la clienta. Se encarece
con rate limit por IP (30 consultas/10 min), POST en vez de GET (el correo no
acaba en la URL ni en los logs del proxy), respuesta `no-store` y un cuerpo que
solo lleva `{ disponible }`.

Si el día de mañana se quiere cerrar el oráculo, hay que cambiar **las dos**
cosas a la vez: quitar este endpoint y hacer que el alta responda 202 con
"te mandamos un correo" tanto si existe como si no.

### Otros controles del alta

- **argon2id** con parámetros explícitos (64 MiB · 3 pasadas · 4 hilos), no los
  de la librería: un cambio de default no puede debilitar el hash sin querer.
- **Rate limit por IP**: 5 altas/hora, fallidas incluidas (el alta masiva son
  miles de POST inválidos tanteando correos).
- **Cuerpo máximo 4 KB** y `Content-Type` JSON: un POST de 50 MB no llega ni a
  `JSON.parse` ni a argon2.
- **Campo trampa** (`CAMPO_TRAMPA`): input invisible, fuera del tabulador y del
  lector de pantalla. Si llega con texto, se responde el error genérico. Es un
  freno barato al bot que rellena todo, sin el peaje de un CAPTCHA.
- La respuesta del alta **nunca** incluye el hash ni nada más que la cuenta.

## Login (H08)

Credenciales verificadas en `credenciales.ts`; el error es siempre genérico (no
revela si falló el correo o la contraseña) y hay rate limit de 5 fallos por
correo en 15 minutos (`src/shared/seguridad/rate-limit.ts`). La política nueva
NO se aplica al login: las cuentas creadas antes siguen entrando con su
contraseña de entonces.
