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
| `npm run db:seed` | seed idempotente (re-ejecutable) |

## API (fases 1 y 2 · T4+T5)

Colección Postman en `postman/extensiones.postman_collection.json` (todos los
endpoints con caso happy y unhappy).

Fase 1 (T4):

- `GET /api/categorias` · `GET /api/testimonios`
- `GET /api/productos?familia&tipo&largo&q&categoria` (AND estricto) ·
  `GET /api/productos/facetas` · `GET /api/productos/[slug]`
- `POST /api/cuenta/registro`
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

## Convenciones

- El dinero se guarda como **enteros en centavos de MXN**.
- `familia_tono` es un enum **editable**: la lista vive en
  `src/shared/validacion/familias.ts`, no en Postgres.
- Sin HTML libre en descripciones ni testimonios (validado con zod).
- Un branch por encargo → PR a `main` con CI verde.
