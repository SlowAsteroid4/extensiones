# M-ADMIN · Administración

**Frontera (spec §3):** `/api/admin/*` protegido por rol admin (401 sin sesión,
403 con sesión de clienta): CRUD de producto y variantes, existencias/precios,
activar/desactivar, testimonios.

Contenido (T5):

- `guardia.ts` — `requiereAdmin()` (spec §7) y errores POR CAMPO desde zod.
- `productos.ts` — H15 crear (slug/sku autogenerados), H16 editar (base +
  agregar/editar/quitar variantes), H17 actualización rápida de
  existencias/precio, H19 toggle activo con efecto inmediato en tienda.
- `testimonios.ts` — H18 alta/edición/baja + toggle activo + orden; lo activo se
  refleja al instante en `GET /api/testimonios`.

La UI del panel llega en T7; estos endpoints ya la soportan completa.
