"use client";
// Favoritos (H10–H12): UI optimista con reversión ante falla (patrón cerrado).
//   · con sesión: GET/POST/DELETE /api/favoritos (persistencia real en DB)
//   · sin sesión: el corazón dispara el modal C5 (invitación a sesión); al
//     completar el acceso, el favorito PENDIENTE se guarda (H10)
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

const CLAVE_PENDIENTE = "ls-favorito-pendiente";

interface ContextoFavoritos {
  /** ids de producto favoritos de la sesión actual */
  ids: Set<string>;
  esFavorito: (productoId: string) => boolean;
  /** Alterna favorito. Sin sesión → abre C5 (guarda el pendiente). */
  alternar: (productoId: string, nombre?: string) => Promise<void>;
  /** producto que disparó C5 (para el copy del modal) */
  modalAbierto: { id: string; nombre?: string } | null;
  /** cierra C5 conservando el favorito pendiente (ej. al ir a login) */
  cerrarModal: () => void;
  /** cierra C5 y descarta el pendiente ("Seguir viendo") */
  descartarPendiente: () => void;
  /** falla al guardar/quitar → toast con reintento */
  errorToast: { productoId: string; accion: "guardar" | "quitar" } | null;
  cerrarErrorToast: () => void;
  reintentarError: () => void;
  haySesion: boolean;
  cargado: boolean;
}

const Contexto = createContext<ContextoFavoritos | null>(null);

export function ProveedorFavoritos({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const haySesion = status === "authenticated";
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [cargado, setCargado] = useState(false);
  const [modalAbierto, setModalAbierto] = useState<{ id: string; nombre?: string } | null>(null);
  const [errorToast, setErrorToast] = useState<ContextoFavoritos["errorToast"]>(null);
  const guardoPendiente = useRef(false);

  // Carga inicial (y tras login) de los favoritos persistidos.
  useEffect(() => {
    let cancelado = false;
    if (!haySesion) {
      queueMicrotask(() => {
        if (cancelado) return;
        setIds(new Set());
        setCargado(status !== "loading");
      });
      return () => {
        cancelado = true;
      };
    }
    fetch("/api/favoritos")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: { producto_id: string }[]) => {
        if (cancelado) return;
        setIds(new Set(lista.map((f) => f.producto_id)));
        setCargado(true);
      })
      .catch(() => {
        if (!cancelado) setCargado(true);
      });
    return () => {
      cancelado = true;
    };
  }, [haySesion, status]);

  const persistir = useCallback(
    async (productoId: string, accion: "guardar" | "quitar") => {
      const respuesta =
        accion === "guardar"
          ? await fetch("/api/favoritos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ producto_id: productoId }),
            })
          : await fetch(`/api/favoritos?producto_id=${encodeURIComponent(productoId)}`, {
              method: "DELETE",
            });
      if (!respuesta.ok && respuesta.status !== 409) {
        throw new Error(`favoritos ${accion} → ${respuesta.status}`);
      }
    },
    []
  );

  const alternar = useCallback(
    async (productoId: string, nombre?: string) => {
      if (!haySesion) {
        window.localStorage.setItem(CLAVE_PENDIENTE, productoId);
        setModalAbierto({ id: productoId, nombre });
        return;
      }
      const eraFavorito = ids.has(productoId);
      const accion = eraFavorito ? "quitar" : "guardar";
      // Optimista: pinta primero, revierte si la API falla.
      setIds((prev) => {
        const siguiente = new Set(prev);
        if (eraFavorito) siguiente.delete(productoId);
        else siguiente.add(productoId);
        return siguiente;
      });
      try {
        await persistir(productoId, accion);
      } catch {
        setIds((prev) => {
          const revertido = new Set(prev);
          if (eraFavorito) revertido.add(productoId);
          else revertido.delete(productoId);
          return revertido;
        });
        setErrorToast({ productoId, accion });
      }
    },
    [haySesion, ids, persistir]
  );

  // H10: al completar el acceso, guarda el favorito pendiente.
  useEffect(() => {
    if (!haySesion || !cargado || guardoPendiente.current) return;
    const pendiente = window.localStorage.getItem(CLAVE_PENDIENTE);
    if (!pendiente) return;
    guardoPendiente.current = true;
    window.localStorage.removeItem(CLAVE_PENDIENTE);
    if (ids.has(pendiente)) return;
    queueMicrotask(() => {
      setIds((prev) => new Set(prev).add(pendiente));
      persistir(pendiente, "guardar").catch(() => {
        setIds((prev) => {
          const revertido = new Set(prev);
          revertido.delete(pendiente);
          return revertido;
        });
        setErrorToast({ productoId: pendiente, accion: "guardar" });
      });
    });
  }, [haySesion, cargado, ids, persistir]);

  const valor = useMemo<ContextoFavoritos>(
    () => ({
      ids,
      esFavorito: (id) => ids.has(id),
      alternar,
      modalAbierto,
      cerrarModal: () => setModalAbierto(null),
      descartarPendiente: () => {
        window.localStorage.removeItem(CLAVE_PENDIENTE);
        setModalAbierto(null);
      },
      errorToast,
      cerrarErrorToast: () => setErrorToast(null),
      reintentarError: () => {
        if (!errorToast) return;
        const { productoId } = errorToast;
        setErrorToast(null);
        void alternar(productoId);
      },
      haySesion,
      cargado,
    }),
    [ids, alternar, modalAbierto, errorToast, haySesion, cargado]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useFavoritos(): ContextoFavoritos {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useFavoritos requiere <ProveedorFavoritos>");
  return ctx;
}
