"use client";
// Carrito EN EL CLIENTE (H04): estado + localStorage.
// Reglas cerradas del encargo 10:
//   · CONSOLIDA por variante_id (items repetidos → una línea; la API rechaza
//     variantes repetidas con 400)
//   · respeta el stock máximo por variante (tope al agregar y en el stepper)
//   · el precio mostrado es informativo: el total REAL siempre lo calcula el
//     backend (precios congelados server-side)
//   · se limpia SOLO en pago exitoso (H05: pedido rechazado conserva el carrito)
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface ItemCarrito {
  variante_id: string;
  producto_slug: string;
  nombre_tono: string;
  /** etiqueta visible del largo, ej. `20"` */
  largo: string;
  /** precio unitario en CENTAVOS (informativo) */
  precio_mxn: number;
  cantidad: number;
  /** existencias conocidas al agregar (tope del stepper) */
  max_existencias: number;
  foto?: string;
}

const CLAVE_STORAGE = "ls-carrito-v1";

function leerStorage(): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE_STORAGE);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (i): i is ItemCarrito =>
        typeof i === "object" && i !== null && typeof (i as ItemCarrito).variante_id === "string"
    );
  } catch {
    return [];
  }
}

/** Consolidación pura por variante_id (testeable): suma cantidades y respeta tope. */
export function consolidarItem(items: ItemCarrito[], nuevo: ItemCarrito): ItemCarrito[] {
  const existente = items.find((i) => i.variante_id === nuevo.variante_id);
  if (!existente) {
    return [...items, { ...nuevo, cantidad: Math.min(nuevo.cantidad, nuevo.max_existencias) }];
  }
  return items.map((i) =>
    i.variante_id === nuevo.variante_id
      ? {
          ...i,
          ...nuevo,
          cantidad: Math.min(i.cantidad + nuevo.cantidad, nuevo.max_existencias),
        }
      : i
  );
}

interface ContextoCarrito {
  items: ItemCarrito[];
  /** total de piezas (badge del navbar) */
  totalPiezas: number;
  /** subtotal informativo en centavos */
  subtotalCentavos: number;
  agregar: (item: Omit<ItemCarrito, "cantidad"> & { cantidad?: number }) => void;
  cambiarCantidad: (varianteId: string, cantidad: number) => void;
  quitar: (varianteId: string) => void;
  /** SOLO al confirmar pago exitoso (H05) */
  vaciar: () => void;
  listo: boolean;
}

const Contexto = createContext<ContextoCarrito | null>(null);

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [listo, setListo] = useState(false);

  // Hidrata desde localStorage al montar, en microtarea (evita mismatch SSR
  // y setState síncrono dentro del effect).
  useEffect(() => {
    let cancelado = false;
    queueMicrotask(() => {
      if (cancelado) return;
      setItems(leerStorage());
      setListo(true);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!listo) return;
    window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
  }, [items, listo]);

  const agregar = useCallback((item: Omit<ItemCarrito, "cantidad"> & { cantidad?: number }) => {
    setItems((prev) => consolidarItem(prev, { ...item, cantidad: item.cantidad ?? 1 }));
  }, []);

  const cambiarCantidad = useCallback((varianteId: string, cantidad: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.variante_id === varianteId
          ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.max_existencias)) }
          : i
      )
    );
  }, []);

  const quitar = useCallback((varianteId: string) => {
    setItems((prev) => prev.filter((i) => i.variante_id !== varianteId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const valor = useMemo<ContextoCarrito>(
    () => ({
      items,
      totalPiezas: items.reduce((n, i) => n + i.cantidad, 0),
      subtotalCentavos: items.reduce((n, i) => n + i.cantidad * i.precio_mxn, 0),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
      listo,
    }),
    [items, listo, agregar, cambiarCantidad, quitar, vaciar]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): ContextoCarrito {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrito requiere <ProveedorCarrito>");
  return ctx;
}
