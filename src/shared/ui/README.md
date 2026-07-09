# Lib de UI · tokens "Magenta audaz"

Los tokens viven en [`src/app/globals.css`](../../app/globals.css) (`@theme` de
Tailwind v4) y generan las utilidades:

| Token | Utilidades | Valor |
|---|---|---|
| fondo | `bg-fondo` | `#FFFFFF` |
| primario | `bg-primario` / `text-primario` | `#FF0891` |
| secundario | `bg-secundario` / `text-secundario` | `#C6006E` |
| acento | `bg-acento` / `text-acento` | `#FF8FC4` |
| texto | `text-texto` | `#2B1620` |
| superficie | `bg-superficie` | `#FCE0EF` |
| H1 | `text-h1` | 40px / 800 |
| H2 | `text-h2` | 18px / 800 |
| cuerpo | `text-cuerpo` / `text-cuerpo-sm` | 14px–13px / 500 |
| precio | `text-precio` | 16px / 800 |

**Regla:** el magenta jamás en texto de cuerpo pequeño.

Los componentes compartidos se agregan aquí conforme lleguen los encargos de UI
(convención del estudio: primero en librería de componentes, luego integrados).
