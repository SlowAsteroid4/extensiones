"use client";
// C3 · Mi cuenta (H09): datos básicos + acceso a favoritos + cerrar sesión
// (falla al cerrar → toast con reintento y estado consistente).
import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Boton } from "@/shared/ui/boton";
import { Toast, ToastDock } from "@/shared/ui/feedback";
import { Icono, type NombreIcono } from "@/shared/ui/icono";
import { BarraSuperior } from "@/shared/ui/producto";
import { useCarrito } from "@/modules/compra/ui/carrito-contexto";
import { useFavoritos } from "./favoritos-contexto";

function FilaCuenta({
  icon,
  label,
  value,
  href,
}: {
  icon: NombreIcono;
  label: string;
  value?: string;
  href: string;
}) {
  return (
    <NextLink
      href={href}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-fondo px-4 py-3.5 text-left"
    >
      <Icono name={icon} size={20} color="var(--color-secundario)" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-text-muted">{label}</span>
        {value && <span className="text-[14px] font-semibold text-text-strong">{value}</span>}
      </div>
      <Icono name="chevron-right" size={18} color="var(--color-text-subtle)" />
    </NextLink>
  );
}

export function CuentaCliente({ nombre, email }: { nombre: string; email: string }) {
  const router = useRouter();
  const { totalPiezas } = useCarrito();
  const { ids, cargado } = useFavoritos();
  const [errorCierre, setErrorCierre] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const cerrarSesion = async () => {
    setCerrando(true);
    try {
      await signOut({ redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setErrorCierre(true);
    } finally {
      setCerrando(false);
    }
  };

  const conteoFavoritos = cargado
    ? `${ids.size} ${ids.size === 1 ? "tono guardado" : "tonos guardados"}`
    : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="Mi cuenta" cartCount={totalPiezas} backHref="/" />
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3.5 py-1">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-superficie">
            <Icono name="user" size={26} color="var(--color-primario)" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[17px] font-extrabold text-text-strong">{nombre}</span>
            <span className="text-[13px] font-medium text-text-muted">{email}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <FilaCuenta icon="heart" label="Mis favoritos" value={conteoFavoritos} href="/favoritos" />
        </div>
        <div className="mt-auto">
          <Boton variant="secondary" fullWidth icon="refresh" loading={cerrando} onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </Boton>
        </div>
      </div>
      {errorCierre && (
        <ToastDock>
          <Toast
            tone="error"
            message="No pudimos cerrar tu sesión. Inténtalo otra vez."
            actionLabel="Reintentar"
            onAction={() => {
              setErrorCierre(false);
              void cerrarSesion();
            }}
            onClose={() => setErrorCierre(false)}
          />
        </ToastDock>
      )}
    </div>
  );
}
