# M-COMPRA · Compra

**Frontera (spec §3):** pedidos, adapter de pasarela, webhook. Consume catálogo
READ-ONLY. El carrito vive en el CLIENTE: el backend recibe items en el checkout
y los valida contra stock en ese momento.

Contenido (T5):

- `pedidos.ts` — checkout (stock por item, precios congelados, total server-side,
  folio LS-XXXXXX, invitada/sesión), transición de estados idempotente del
  webhook (decremento de stock SOLO al pasar a `pagado_sandbox`, transaccional),
  consulta por folio.
- `folio.ts` — folio corto `LS-` + 6 alfanuméricos sin ambiguos (3.D.2).
- `pasarela/` — interfaz `PasarelaProvider` + adapters:
  - `mercadopago.ts` — Checkout Pro real (ADR-004); requiere
    `MERCADOPAGO_ACCESS_TOKEN`. Único lugar que importa el SDK.
  - `fake.ts` — fixture de Fase A/tests (`PASARELA_PROVIDER=fake`).
  - `firma.ts` — verificación HMAC-SHA256 del webhook (`x-signature`).

La UI de confirmación llega en T6; el pedido ya es consultable por folio.
