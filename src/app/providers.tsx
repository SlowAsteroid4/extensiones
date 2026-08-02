"use client";
// Providers de cliente: sesión (Auth.js) + carrito + favoritos, y los
// overlays globales que dependen de ellos (modal C5 y toast de favoritos).
// El tema NO va aquí: useTema lee un store de módulo y no necesita provider.
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ProveedorCarrito } from "@/modules/compra/ui/carrito-contexto";
import { ProveedorFavoritos } from "@/modules/cuenta/ui/favoritos-contexto";
import { ModalSesionYToastFavoritos } from "@/modules/cuenta/ui/modal-sesion";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ProveedorCarrito>
        <ProveedorFavoritos>
          {children}
          <ModalSesionYToastFavoritos />
        </ProveedorFavoritos>
      </ProveedorCarrito>
    </SessionProvider>
  );
}
