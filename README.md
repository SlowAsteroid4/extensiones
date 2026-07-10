# Extensiones

Tienda en línea de extensiones de cabello 100% natural. Next.js (App Router) +
TypeScript + Tailwind CSS + PostgreSQL + Prisma.

## Levantar en 3 pasos

Requisitos: Node 24+, Docker.

```bash
# 1. Variables de entorno (valores de desarrollo listos para usar)
cp .env.example .env

# 2. Dependencias + base de datos local
npm install && docker compose up -d

# 3. Migraciones + seed + servidor de desarrollo
npm run setup && npm run dev
```

La tienda queda en http://localhost:3000. El seed crea 72 productos en 5
familias de tono, 6 testimonios y una cuenta admin (credenciales en tu `.env`).

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
| `npm test` | unit + integración (Vitest; necesita el Postgres de Docker — crea y seedea `extensiones_test`) |
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
