# Extensiones

Tienda en línea de extensiones de cabello 100% natural. Next.js (App Router) +
TypeScript + Tailwind CSS + PostgreSQL + Prisma.

## Correr todo en localhost

Requisitos: Node 24+, Docker (con el daemon corriendo).

```bash
# 1. Variables de entorno (valores de desarrollo listos para usar)
cp .env.example .env

# 2. Dependencias + base de datos local
npm install && docker compose up -d

# 3. Migraciones + seed + servidor de desarrollo
npm run setup && npm run dev
```

La tienda queda en http://localhost:3000. El seed crea 72 productos en 5
familias de tono, 6 testimonios y una cuenta admin.

### Cuenta admin del seed

El panel vive en http://localhost:3000/admin. Entra por
http://localhost:3000/login con las credenciales de tu `.env`
(valores de desarrollo por defecto):

- Correo: `admin@extensiones.local` (`SEED_ADMIN_EMAIL`)
- Contraseña: `admin-dev-cambiame-1234` (`SEED_ADMIN_PASSWORD`)

Una cuenta de clienta se crea desde http://localhost:3000/registro.

### Cómo simular un pago (sin credenciales de MercadoPago)

Con `PASARELA_PROVIDER=fake` (el default de `.env.example`), el checkout
redirige a la confirmación local `/pedido/{folio}?pago=simulado` con el pedido
**pendiente**. Para aprobarlo (o rechazarlo) se dispara un webhook sintético
firmado con el secreto fixture:

```bash
# compra algo en la tienda y toma el folio de la confirmación (LS-XXXXXX)
npm run simular-pago -- LS-XXXXXX               # pendiente → pagado_sandbox
npm run simular-pago -- LS-XXXXXX --rechazado   # pendiente → rechazado
```

Recarga la confirmación: el estado cambia, el stock se decrementa (solo al
pagar) y el carrito se limpia únicamente en pago exitoso. El WhatsApp del
layout usa `NEXT_PUBLIC_WHATSAPP_NUMERO` (si falta, el botón se oculta).

## Estructura

```
src/
├── app/          # rutas (App Router), layout base con tokens
├── modules/
│   ├── catalogo/ # M-CAT: home, categoría, producto, testimonios
│   ├── compra/   # M-COMPRA: carrito, checkout, pedidos
│   ├── cuenta/   # M-CUENTA: registro/login, favoritos
│   └── admin/    # M-ADMIN: /admin protegido por rol
└── shared/       # schema/db, validación zod, formato de precio, tokens de UI
prisma/           # schema, migraciones, seed
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run simular-pago -- LS-XXXXXX` | aprueba un pedido en localhost (webhook firmado; `--rechazado` para rechazarlo) |
| `npm test` | unit + integración + component tests (Vitest; necesita el Postgres de Docker — crea y seedea `extensiones_test`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run db:migrate` | migraciones Prisma |
| `npm run db:seed` | seed de desarrollo, idempotente (72 productos) |
| `npm run db:seed-produccion` | seed de producción: 3 categorías + 1 admin, **cero catálogo** |
| `npm run build` | build de producción local (sin migraciones) |
| `npm run vercel-build` | build que corre Vercel: `prisma migrate deploy` + `next build` |

## API (fases 1 y 2 · T4+T5)

Colección Postman en `postman/extensiones.postman_collection.json` (todos los
endpoints con caso happy y unhappy).

Fase 1 (T4):

- `GET /api/categorias` · `GET /api/testimonios`
- `GET /api/productos?familia&tipo&largo&q&categoria` (AND estricto) ·
  `GET /api/productos/facetas` · `GET /api/productos/[slug]`
- `POST /api/cuenta/registro` (política de contraseña OWASP, campo trampa
  anti-bot, máx 5 altas por IP/hora → 429) ·
  `POST /api/cuenta/email-disponible` (¿el correo ya tiene cuenta?; máx 30
  consultas por IP/10 min → 429)
- Auth.js: `GET /api/auth/csrf` · `POST /api/auth/callback/credentials` (login,
  rate limit 5 fallos/15 min → 429) · `GET /api/auth/session` · `POST /api/auth/signout`
- `GET/POST/DELETE /api/favoritos` (sesión requerida; DELETE con `?producto_id=`)

Fase 2 (T5):

- `POST /api/pedidos` (checkout: valida stock POR item, congela precios, total
  server-side, folio `LS-XXXXXX`; invitada o con sesión) ·
  `GET /api/pedidos/[folio]` (consulta pública, solo lectura)
- `POST /api/webhooks/mercadopago` (firma HMAC verificada; 401 si no valida;
  transición de estados idempotente + decremento de stock transaccional)
- Panel (solo rol admin — 401 sin sesión, 403 clienta):
  `GET|POST /api/admin/productos` · `PATCH /api/admin/productos/[id]` (incluye
  toggle `activo`) · `PATCH /api/admin/variantes/[id]` (existencias/precio) ·
  `GET|POST /api/admin/testimonios` · `PATCH|DELETE /api/admin/testimonios/[id]`

Pasarela: `PASARELA_PROVIDER=fake` (fixture local) o `mercadopago` (requiere
`MERCADOPAGO_ACCESS_TOKEN`; ver `.env.example`).

## Seguridad del alta de cuenta

Política y controles (detalle y decisiones en `src/modules/cuenta/README.md`):

| Control | Dónde |
|---|---|
| Contraseña: mín. 12 · máx. 128 · sin comunes, secuencias ni datos propios | `src/shared/validacion/password.ts` |
| Correo: forma estricta, dominio ASCII, sin buzones automáticos ni desechables | `src/shared/validacion/email.ts` |
| Contraste opcional contra filtraciones (HIBP k-anonymity, `PWNED_PASSWORDS_CHECK`) | `src/shared/seguridad/passwords-filtradas.ts` |
| argon2id con parámetros explícitos (64 MiB · 3 pasadas · 4 hilos) | `src/modules/cuenta/registro.ts` |
| Rate limit por IP, tope de cuerpo (4 KB) y respuestas `no-store` | `src/shared/seguridad/` |
| Campo trampa anti-bot (sin CAPTCHA) | `CAMPO_TRAMPA` en `src/shared/validacion/schemas.ts` |

La MISMA evaluación corre en el navegador (medidor animado con los requisitos)
y en el servidor, así que lo que se ve marcado en verde es exactamente lo que
acepta la API.

## Producción

**URL pública:** _(pendiente — se llena en cuanto el dueño autorice el proyecto en Vercel)_

Hosting **Vercel** (plan Hobby) + base de datos **Neon** (Postgres gestionado).

### Cómo se despliega

`push a main → producción`. Vercel está conectado al repo: cada push a `main`
dispara un despliegue. No hay paso manual.

El build que corre Vercel es el script **`vercel-build`** de `package.json`
(Vercel lo prefiere sobre `build` cuando existe):

```
prisma migrate deploy && next build
```

Es decir: **las migraciones pendientes se aplican solas en cada despliegue**.
Un cambio de schema se sube como migración en el PR y se aplica al mergear.
`npm run build` (sin `vercel-`) se deja sin migraciones para que el build local
nunca toque una base ajena.

### Las dos cadenas de Neon

Prisma en serverless necesita dos conexiones distintas y **no son
intercambiables**:

| Variable | Host | Quién la usa |
|---|---|---|
| `DATABASE_URL` | el que lleva `-pooler` | la app en runtime (`src/shared/db/client.ts`) |
| `DIRECT_URL` | el mismo **sin** `-pooler` | solo la CLI de Prisma (`migrate deploy`) |

El pooler de Neon es PgBouncer en modo transacción: aguanta las ráfagas de
conexiones del serverless, pero rompe el DDL de las migraciones. Por eso
`prisma.config.ts` —que solo lee la CLI— usa `DIRECT_URL`, con caída a
`DATABASE_URL` cuando no está definida (desarrollo local, donde no hay pooler).

Nota de Prisma 7: el bloque `datasource` del schema ya no acepta `directUrl`;
la separación se hace por capa, en `prisma.config.ts`.

### Variables de entorno en Vercel

Todas se cargan en el proyecto de Vercel (Settings → Environment Variables),
nunca en el repo. `.env.example` documenta cada una.

| Variable | Valor en producción | Para qué |
|---|---|---|
| `DATABASE_URL` | cadena **pooled** de Neon | conexión de la app |
| `DIRECT_URL` | cadena **directa** de Neon | `prisma migrate deploy` del build |
| `AUTH_SECRET` | uno **nuevo**, `openssl rand -base64 32` | firma la cookie de sesión. Nunca el de desarrollo |
| `APP_URL` | la URL pública | base de `back_urls`/`notification_url` y del retorno de pago |
| `PASARELA_PROVIDER` | `fake` | pago simulado mientras no lleguen las credenciales de MP |
| `MERCADOPAGO_ACCESS_TOKEN` | *(vacío)* | lo llena T10 |
| `MERCADOPAGO_WEBHOOK_SECRET` | valor propio, no el fixture | verifica la firma HMAC del webhook |
| `PWNED_PASSWORDS_CHECK` | `on` | contrasta contraseñas contra filtraciones al registrarse |
| `NEXT_PUBLIC_WHATSAPP_NUMERO` | el número real de la tienda | CTA de WhatsApp. **Se incrusta en el bundle del navegador: nunca un secreto con prefijo `NEXT_PUBLIC_`** |

No se cargan en Vercel: `SEED_ADMIN_*` (las lee el seed, que se corre a mano),
ni `POSTGRES_*` (son del docker-compose local).

`AUTH_URL`/`NEXTAUTH_URL` **no hacen falta**: la config de Auth.js usa
`trustHost: true` y deduce el host de la petición.

### Estado de la base de producción

Arranca **vacía de catálogo**, por decisión de la mesa: solo las 3 categorías
base y la cuenta admin de la clienta. El catálogo real lo carga ella desde el
panel. Sembrar es idempotente y se corre a mano:

```bash
DATABASE_URL="<pooled de Neon>" SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed-produccion
```

### Swap de MercadoPago (T10)

No se toca código — el adapter real ya existe desde T5 y sale de
`src/modules/compra/pasarela/mercadopago.ts`. Cuando lleguen las credenciales:

1. En Vercel: `PASARELA_PROVIDER=mercadopago`, `MERCADOPAGO_ACCESS_TOKEN=<token>`
   y `MERCADOPAGO_WEBHOOK_SECRET=<el del panel de webhooks de MP>`.
2. En el panel de MercadoPago, apuntar el webhook a
   `https://<dominio>/api/webhooks/mercadopago`.
3. Redesplegar (Vercel → Deployments → Redeploy). Las variables solo se leen al
   arrancar; sin redespliegue el cambio no toma efecto.

### Dominio propio (T11)

Cuando haya acceso al DNS de `lys-extensiones.com`:

1. Vercel → Settings → Domains → agregar el dominio; Vercel dicta los registros
   DNS (`A`/`CNAME`) y emite el certificado.
2. Cambiar `APP_URL` a `https://lys-extensiones.com` y **redesplegar** — de ahí
   salen `back_urls` y `notification_url`, así que sin este paso los retornos de
   pago seguirían apuntando a `*.vercel.app`.
3. Si ya estaba MercadoPago conectado, actualizar también la URL del webhook.

## Convenciones

- El dinero se guarda como **enteros en centavos de MXN**.
- `familia_tono` es un enum **editable**: la lista vive en
  `src/shared/validacion/familias.ts`, no en Postgres.
- Sin HTML libre en descripciones ni testimonios (validado con zod).
- Un branch por encargo → PR a `main` con CI verde.
