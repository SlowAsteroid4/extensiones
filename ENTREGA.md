# ENTREGA — Tienda Lizzy & Stephy

Guía de operación y traspaso. Está escrita para poder seguirse **sin ayuda
técnica**: cada sección dice qué apretar, dónde, y cómo saber que quedó bien.

> **La URL de la tienda.** Donde este documento dice `TU-URL.vercel.app`,
> pon la URL real del proyecto. La ves en Vercel → tu proyecto → arriba en
> **Domains**. (Cuando el dominio propio esté activo — sección 3 — la URL
> pasa a ser `lys-extensiones.com`.)

---

## 1 · Qué es y dónde vive

La tienda son dos piezas que trabajan juntas:

| Pieza | Servicio | Qué guarda / hace | Dónde se administra |
|---|---|---|---|
| **La aplicación** (páginas, panel, checkout) | **Vercel** (plan Hobby, gratuito) | Sirve la tienda en internet | [vercel.com](https://vercel.com) → proyecto |
| **La base de datos** (productos, pedidos, cuentas) | **Neon** (plan Free, gratuito) | Postgres gestionado | [neon.tech](https://neon.tech) → proyecto |

Se conectan mediante **variables de entorno**: en Vercel (Settings →
Environment Variables) vive la "dirección con contraseña" de la base de Neon
(`DATABASE_URL` y `DIRECT_URL`). La aplicación las lee al arrancar.

**Cómo llega un cambio de código a la tienda:** todo el código vive en GitHub
(`SlowAsteroid4/extensiones`). Cada vez que algo se sube a la rama `main`,
Vercel lo detecta, lo construye y lo publica solo — **push a main = deploy**.
No hay ningún paso manual; las migraciones de base de datos pendientes también
se aplican solas en cada deploy.

**Cómo saber que la tienda está viva:** abre
`https://TU-URL.vercel.app/api/health` — debe responder
`{"ok":true,"db":"ok"}`. Si responde otra cosa, la base no está contestando
(ver sección 5).

---

## 2 · Activar MercadoPago (cobros reales)

Hoy la tienda está en **modo simulado** (`PASARELA_PROVIDER=fake`): el checkout
funciona pero nadie paga de verdad. El código del cobro real ya existe y está
probado; activar MercadoPago es **solo configuración**, no requiere programar.

### 2.1 · Qué pedirle a la clienta

1. Una cuenta de **MercadoPago México** de vendedora (la de su celular sirve,
   con su RFC/datos fiscales cargados si va a facturar).
2. Que te dé acceso, o que ella misma siga los pasos 2.2 y 2.4 (son clics en
   su cuenta; las claves son suyas, no del programador).

### 2.2 · Sacar las credenciales en el panel de MercadoPago

1. Entra a <https://www.mercadopago.com.mx/developers> con la cuenta de la
   clienta y haz clic en **"Tus integraciones"**.
2. **Crear aplicación** → nombre: `Tienda Lizzy & Stephy` → producto:
   **CheckoutPro** → acepta y crea.
3. Dentro de la aplicación, menú **"Credenciales de producción"**. Ahí están:
   - **Access Token** — empieza con `APP_USR-…`. **Este es el que se copia.**
   - (El "Public Key" no se usa en esta tienda; ignóralo.)
4. Ese menú también tiene **"Credenciales de prueba"** (empiezan con `TEST-…`).
   Sirven para el ensayo del paso 2.6 — anótalas también.

### 2.3 · Configurar el webhook (aviso de pago) en MercadoPago

El "webhook" es la llamada con la que MercadoPago le avisa a la tienda "ya
pagaron el pedido tal". Sin esto los pedidos se quedan en "pago pendiente".

1. En la misma aplicación → menú **"Webhooks"** (o "Notificaciones Webhooks").
2. Modo **producción** → URL:

   ```
   https://TU-URL.vercel.app/api/webhooks/mercadopago
   ```

3. Eventos: marca **"Pagos"** (payment). Guarda.
4. Al guardar, el panel muestra una **clave secreta** (secret) para validar
   las firmas. **Cópiala** — es la tercera credencial.

### 2.4 · Cargar las credenciales en Vercel

1. [vercel.com](https://vercel.com) → tu proyecto → **Settings** →
   **Environment Variables**.
2. Cambia/crea estas tres (ambiente **Production**, y márcalas **Sensitive**):

   | Variable | Valor nuevo |
   |---|---|
   | `PASARELA_PROVIDER` | `mercadopago` (hoy dice `fake`) |
   | `MERCADOPAGO_ACCESS_TOKEN` | el `APP_USR-…` del paso 2.2 |
   | `MERCADOPAGO_WEBHOOK_SECRET` | la clave secreta del paso 2.3 |

3. Guarda cada una.

### 2.5 · Redesplegar (obligatorio)

Las variables solo se leen al arrancar; sin este paso **no pasa nada**:

1. Vercel → tu proyecto → pestaña **Deployments**.
2. En el deployment de más arriba, botón `⋯` → **Redeploy** → confirma.
3. Espera el ✓ verde (2–4 minutos).

### 2.6 · Verificar que quedó bien

**Ensayo sin dinero (recomendado primero):** repite 2.4 y 2.5 pero con el
Access Token de **prueba** (`TEST-…`). Compra algo en la tienda; MercadoPago
abre su pantalla de pago — usa una de sus
[tarjetas de prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)
(por ejemplo Mastercard `5474 9254 3267 0366`, código `123`, vencimiento
`11/30`, nombre `APRO`). Al terminar, el pedido en `/admin/pedidos` debe pasar
a **"Pagado"** solo (eso prueba que el webhook llegó). Después vuelve a poner
el token real `APP_USR-…` y redespliega otra vez.

**En real:** haz una compra pequeña con una tarjeta real. Verás el cargo en el
panel de MercadoPago y el pedido "Pagado" en `/admin/pedidos`. Puedes
reembolsarla desde MercadoPago (Actividad → el pago → Reembolsar).

### 2.7 · Si algo falla

| Síntoma | Causa típica | Arreglo |
|---|---|---|
| El checkout da error al ir a pagar | Access Token mal copiado o de otra cuenta | Recopia el token (paso 2.2), sin espacios, y redespliega |
| Se paga pero el pedido sigue "Pago pendiente" | Webhook: URL mal puesta o secret que no coincide | Revisa el paso 2.3 (la URL exacta) y que `MERCADOPAGO_WEBHOOK_SECRET` sea la clave de ESE panel; redespliega |
| "Pago rechazado" siempre (en ensayo) | Tarjeta de prueba con token real, o al revés | El token `TEST-…` va con tarjetas de prueba; el `APP_USR-…` con tarjetas reales |
| Nada cambia tras editar variables | Faltó el Redeploy | Paso 2.5 |

Para volver al modo simulado en cualquier momento: `PASARELA_PROVIDER=fake`
y Redeploy.

---

## 3 · Activar el dominio `lys-extensiones.com`

> ⚠️ **Advertencia importante:** hoy ese dominio muestra el WordPress viejo.
> Al completar esta sección, el dominio pasa a mostrar **esta tienda** y el
> WordPress **deja de verse ahí**. Es el efecto deseado, pero es un
> interruptor: decide el momento (mejor un día de poco movimiento).

### 3.1 · Agregar el dominio en Vercel

1. Vercel → tu proyecto → **Settings** → **Domains** → **Add**.
2. Escribe `lys-extensiones.com` → Add. Repite con `www.lys-extensiones.com`
   (Vercel ofrecerá redirigir el `www` al dominio pelón; acepta).
3. Vercel mostrará el dominio "Invalid Configuration" con una tabla de
   **registros DNS a crear**. Déjala abierta: son los valores del paso 3.2.

### 3.2 · Crear los registros DNS

Esto se hace **donde se administra el dominio** (el "registrador": GoDaddy,
Namecheap, el proveedor del WordPress, etc. — donde la clienta lo pague).
Busca la sección **DNS** / "Administrar DNS" y crea/edita:

| Tipo | Nombre/Host | Valor |
|---|---|---|
| `A` | `@` (o vacío, o `lys-extensiones.com`) | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

**Usa los valores que muestre TU pantalla de Vercel del paso 3.1** — si
difieren de esta tabla, los de Vercel mandan. Si ya existía un registro `A`
en `@` (el del WordPress), **edítalo** para poner el valor nuevo, no dupliques.

### 3.3 · Esperar y verificar

- La propagación tarda **de minutos a 48 horas** (típicamente < 1 hora).
- En Vercel → Settings → Domains, el dominio pasa a **"Valid Configuration"**
  con ✓ y el certificado (candado) se emite solo.
- Prueba: abre `https://lys-extensiones.com` — debe cargar la tienda con
  candado en el navegador.

### 3.4 · Actualizar `APP_URL` y redesplegar (no lo saltes)

De `APP_URL` salen las direcciones de retorno del pago. Si no lo cambias, al
pagar con MercadoPago la gente regresaría a la URL vieja `*.vercel.app`:

1. Vercel → Settings → Environment Variables → `APP_URL` →
   `https://lys-extensiones.com` → Save.
2. **Redeploy** (Deployments → `⋯` → Redeploy).
3. Si MercadoPago ya está activo, actualiza también la URL del webhook en su
   panel (sección 2.3) a
   `https://lys-extensiones.com/api/webhooks/mercadopago`.

---

## 4 · Operación diaria

### Para la clienta (todo desde el navegador, también en el celular)

- **Entrar al panel:** `https://TU-URL.vercel.app/login` con su correo y
  contraseña de administradora → la lleva a `/admin`.
- **Cargar un producto:** Panel → **Productos** → **Nuevo** → nombre del tono,
  familia, tipo, descripción, fotos (hasta 12), categoría y al menos una
  variante (largo, precio, existencias) → Guardar. Aparece en la tienda al
  instante.
- **Cambiar precio o existencias:** Productos → botón de edición rápida de la
  fila → corrige → Guardar.
- **Pausar un producto** (se acabó, ya no se vende): el interruptor "Activo"
  de la fila. Desaparece de la tienda de inmediato; se puede reactivar igual.
- **Ver sus ventas:** Panel → **Pedidos** — lista con folio, fecha, piezas,
  total y estado (Pago pendiente / Pagado / Pago rechazado), con filtros.
  Al entrar a un pedido está el detalle completo y el **contacto de la
  compradora**, con botón directo de **WhatsApp** para coordinar la entrega.
- **Testimonios:** Panel → **Testimonios** (crear, ordenar, activar/ocultar).

### Para quien toque el código

- Cambios = rama + Pull Request a `main` con CI en verde. Al mergear, Vercel
  despliega solo (2–4 min). No hay comandos de deploy.
- Salud tras cada deploy: `https://TU-URL.vercel.app/api/health`.
- Errores en producción: llegan al panel de **Sentry** (sección 5.3).
- **Activa las notificaciones de deploy fallido** (una vez, 1 minuto):
  Vercel → tu avatar → **Settings** → **Notifications** → en **Deployments**,
  activa **Failed** (correo y/o web). Así un deploy roto avisa solo.

---

## 5 · Riesgos conocidos y límites (y sus señales de alarma)

Nada de esto está roto hoy; son los límites del diseño actual y de los planes
gratuitos, con su señal de alarma y qué hacer.

### 5.1 · Las fotos viven dentro de la base de datos

Cada foto pesa ~231 KB dentro de la base (medido). Con el plan Free de Neon
(0.5 GB) caben **~185 productos con foto**; además, subir más de ~12 fotos
muy pesadas a UN producto puede chocar con el límite de subida de Vercel
(4.5 MB por petición).

- **Señal:** en Neon (Dashboard → Storage) el uso pasa de ~0.4 GB, o el panel
  da error al guardar un producto con muchas fotos.
- **Qué hacer:** corto plazo, fotos más ligeras (menos fotos por producto o
  comprimidas). Mediano plazo, pedir al equipo técnico mover las fotos a un
  almacén de archivos (Vercel Blob/S3) — cambio ya identificado, no urgente.

### 5.2 · Cuotas de los planes gratuitos

| Servicio | Límite del plan | Señal de alarma | Qué hacer |
|---|---|---|---|
| Neon Free | 0.5 GB de datos · 100 horas de cómputo/mes | Avisos de Neon por correo; tienda lenta a fin de mes | Revisar Dashboard de Neon; si es recurrente, plan Launch (~19 USD/mes) |
| Vercel Hobby | 100 GB de tráfico/mes · uso personal/no comercial estricto | Correo de Vercel de "usage" | Plan Pro (20 USD/mes); además el Hobby es para proyectos no comerciales — **cuando la tienda venda en serio, subir a Pro es lo correcto** |
| Primer clic lento | La base gratuita "se duerme" tras inactividad | La primera visita del día tarda 2–5 s | Es normal en el plan Free; el plan de pago lo elimina |

### 5.3 · Vigilancia (Sentry)

Los errores de la tienda (de servidor y de navegador) se reportan solos a
**Sentry** (plan gratuito, 5.000 eventos/mes). Panel: [sentry.io](https://sentry.io),
proyecto `extensiones`. Si llega un correo de Sentry con un error nuevo,
reenvíalo al equipo técnico — trae el detalle exacto.
La activación se hace cargando `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` en
Vercel (sección 6); sin esas variables la tienda funciona igual, solo que
sin vigilancia.

### 5.4 · Deuda técnica registrada (para el equipo técnico)

- **Límite de intentos de login en memoria:** es por instancia serverless y
  por correo (no por IP); se reinicia con cada instancia nueva. Suficiente
  hoy; para endurecerlo: contador en la base o Redis.
- **Webhook sin validación de frescura del `ts`:** un reenvío del mismo aviso
  es inocuo (la transición de estados es idempotente), pero validar la
  antigüedad de la firma sería más estricto.
- **next-auth v5 en beta:** funciona y está fijado; migrar a la versión
  estable cuando salga.
- **`npm audit`:** las vulnerabilidades corregibles sin mover versiones
  fijadas ya se corrigieron (2 críticas incluidas). Quedan 6 avisos "high"
  que solo se van subiendo Next.js 16.2.10 → 16.3.3 (ninguno explotable en
  esta app: el principal es de middleware, que esta app no usa). Hacer ese
  brinco de versión en un encargo propio, con la suite completa.
- **Fotos como data-URL** — ver 5.1.

---

## 6 · Credenciales: dónde viven y cómo se rotan

**Regla:** ninguna credencial vive en el código ni en GitHub. Viven en dos
lugares: las **variables de entorno de Vercel** (las lee la tienda) y los
paneles de cada servicio (Neon, MercadoPago, Sentry). Este documento no
contiene ningún valor — solo dice dónde están y cómo cambiarlas.

| Credencial | Dónde vive | Cómo se rota (si se filtró o por higiene) |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` (contraseña de la base) | Vercel → Env. Variables; se obtiene en Neon | Neon → Dashboard → Roles → **Reset password** → copiar las DOS cadenas nuevas (pooled y directa) a Vercel → Redeploy |
| `AUTH_SECRET` (firma las sesiones) | Vercel → Env. Variables | Generar uno nuevo en una terminal: `openssl rand -base64 32` → reemplazar en Vercel → Redeploy. Efecto: todas las sesiones se cierran (la gente vuelve a iniciar sesión; no se pierde nada) |
| `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` | Vercel → Env. Variables; se obtienen en el panel de MercadoPago | MercadoPago → Tus integraciones → la aplicación → Credenciales → **Renovar**; copiar el token nuevo a Vercel → Redeploy (y si se renueva el secret del webhook, actualizarlo igual) |
| Contraseña de la administradora (la clienta) | Solo en su cabeza (la base guarda un hash irreversible) | Hoy no hay pantalla de "cambiar contraseña": la rotación la hace el equipo técnico contra la base. Está anotado como mejora pendiente |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Vercel → Env. Variables; se obtiene en sentry.io → Settings → Projects → extensiones → Client Keys | No es un secreto crítico (solo permite ENVIAR reportes); si estorba, se regenera en ese mismo panel |
| `SEED_ADMIN_*` (solo para sembrar la base una vez) | NO viven en Vercel; se pasan a mano al correr el seed | No se rotan: se usan una vez y no quedan en ningún servidor |

**Al marcar variables en Vercel:** usar siempre la casilla **Sensitive** para
que ni siquiera se muestren en el dashboard una vez guardadas.
