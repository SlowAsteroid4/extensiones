# Prueba de carga (T9 · BLOQUE 5)

Scripts de [k6](https://k6.io) (`brew install k6`) contra la **URL pública**.
Objetivo: saber si la tienda aguanta tráfico moderado con los planes gratuitos
(Vercel Hobby + Neon Free), no romperla.

## Regla de oro

**Producción real + cuotas gratuitas = subir gradualmente.** Siempre en este
orden, revisando entre paso y paso el dashboard de Neon (CU-hrs) y Vercel:

```bash
# 1. Humo: 5 usuarias, 30 segundos. Si esto degrada, DETENTE y reporta.
k6 run -e BASE_URL=https://<url-publica> -e SMOKE=1 load/navegacion.js

# 2. Navegación completa: rampa 10 → 25 → 50 usuarias, meseta de 2 min.
k6 run -e BASE_URL=https://<url-publica> load/navegacion.js

# 3. Checkouts: 10 compras concurrentes (crea pedidos de prueba, ver abajo).
k6 run -e BASE_URL=https://<url-publica> load/checkout.js
```

Si en cualquier punto la tasa de error sube o Neon se acerca a su cuota,
se corta la prueba (Ctrl+C) — k6 imprime igual los percentiles acumulados.

## Qué reportar

De la salida de k6: `http_req_duration` (p50 = med, p95, p99), `http_req_failed`,
e iteraciones completadas. Interpretación en lenguaje llano en el handoff.

## Limpieza (solo checkout.js)

`checkout.js` crea pedidos **pendientes** (no tocan stock) marcados con
`k6-carga-…@prueba.local`. Borrarlos y demostrarlo:

```sql
SELECT count(*) FROM "Pedido" WHERE email_contacto LIKE 'k6-carga-%@prueba.local';
DELETE FROM "PedidoItem" WHERE pedido_id IN
  (SELECT id FROM "Pedido" WHERE email_contacto LIKE 'k6-carga-%@prueba.local');
DELETE FROM "Pedido" WHERE email_contacto LIKE 'k6-carga-%@prueba.local';
SELECT count(*) FROM "Pedido" WHERE email_contacto LIKE 'k6-carga-%@prueba.local'; -- 0
```
