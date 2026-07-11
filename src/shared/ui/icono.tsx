// Icon del DS "Magenta audaz" (components/foundation/Icon.jsx, hash 3c9b4e2e395b).
// Estilo Lucide: trazo 2px, remates redondeados, caja 24×24, paths inline sin CDN.
// WhatsApp es glifo de marca (relleno sólido).
import type { CSSProperties, ReactNode, SVGProps } from "react";

export type NombreIcono =
  | "cart"
  | "heart"
  | "close"
  | "copy"
  | "plus"
  | "minus"
  | "search"
  | "filter"
  | "edit"
  | "trash"
  | "eye"
  | "eye-off"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "arrow-right"
  | "upload"
  | "info"
  | "alert"
  | "x-circle"
  | "check-circle"
  | "refresh"
  | "user"
  | "image"
  | "whatsapp";

const PATHS: Record<Exclude<NombreIcono, "whatsapp">, ReactNode> = {
  cart: (
    <>
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="18" cy="20" r="1.6" />
      <path d="M2.5 3h2.2l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6" />
    </>
  ),
  heart: <path d="M12 20.5 4.4 13a4.6 4.6 0 0 1 6.5-6.5l1.1 1.1 1.1-1.1A4.6 4.6 0 0 1 19.6 13Z" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M9.9 5.2A9.5 9.5 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-3 3.6" />
      <path d="M6.1 6.3A15 15 0 0 0 2.5 12S6 19 12 19a9 9 0 0 0 3.5-.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </>
  ),
  check: <path d="M4 12.5 9.5 18 20 6.5" />,
  "chevron-down": <path d="M5 9l7 7 7-7" />,
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  "arrow-right": (
    <>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </>
  ),
  upload: (
    <>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </>
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14-4.5L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14 4.5L21 15" />
      <path d="M21 20v-5h-5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.8" />
      <path d="m21 16-5-5L5 21" />
    </>
  ),
};

export interface IconoProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
  name: NombreIcono;
  size?: number;
  strokeWidth?: number;
  color?: string;
  filled?: boolean;
  style?: CSSProperties;
}

export function Icono({
  name,
  size = 20,
  strokeWidth = 2,
  color = "currentColor",
  filled = false,
  style,
  ...rest
}: IconoProps) {
  if (name === "whatsapp") {
    return <WhatsAppGlyph size={size} color={color} style={style} {...rest} />;
  }
  if (name === "heart" && filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={style} aria-hidden="true" {...rest}>
        <path d="M12 20.5 4.4 13a4.6 4.6 0 0 1 6.5-6.5l1.1 1.1 1.1-1.1A4.6 4.6 0 0 1 19.6 13Z" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name] ?? PATHS.info}
    </svg>
  );
}

export function WhatsAppGlyph({
  size = 20,
  color = "currentColor",
  style,
  ...rest
}: Omit<IconoProps, "name">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style} aria-hidden="true" {...rest}>
      <path d="M12.02 2C6.6 2 2.2 6.4 2.2 11.82c0 1.9.5 3.66 1.4 5.2L2 22l5.1-1.55a9.77 9.77 0 0 0 4.92 1.32h.01c5.42 0 9.82-4.4 9.82-9.82S17.44 2 12.02 2Zm5.75 13.9c-.24.68-1.4 1.3-1.94 1.34-.5.05-.98.24-3.28-.68-2.77-1.1-4.5-3.94-4.64-4.13-.13-.19-1.1-1.46-1.1-2.78s.7-1.98.94-2.25c.24-.27.53-.34.7-.34l.5.01c.16 0 .38-.06.6.46.23.55.77 1.9.84 2.03.07.14.11.3.02.48-.09.19-.14.3-.27.47-.14.16-.29.36-.4.48-.14.14-.28.29-.12.56.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.21 2.19 1.35.27.14.42.11.58-.07.16-.19.67-.78.85-1.05.18-.27.35-.22.6-.13.24.09 1.55.73 1.82.86.27.14.44.2.5.31.07.11.07.64-.17 1.32Z" />
    </svg>
  );
}
