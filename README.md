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
| `npm test` | unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run db:migrate` | migraciones Prisma |
| `npm run db:seed` | seed idempotente (re-ejecutable) |

## Convenciones

- El dinero se guarda como **enteros en centavos de MXN**.
- `familia_tono` es un enum **editable**: la lista vive en
  `src/shared/validacion/familias.ts`, no en Postgres.
- Sin HTML libre en descripciones ni testimonios (validado con zod).
- Un branch por encargo → PR a `main` con CI verde.
