"use client";
// C5 · Modal de invitación a sesión (H10). Se dispara desde el corazón sin
// sesión; al completar el acceso, el favorito pendiente se guarda solo.
// También renderiza el toast global de falla de favorito (reversión + toast).
import { usePathname, useRouter } from "next/navigation";
import { Modal, Toast, ToastDock } from "@/shared/ui/feedback";
import { useFavoritos } from "./favoritos-contexto";

export function ModalSesionYToastFavoritos() {
  const { modalAbierto, cerrarModal, descartarPendiente, errorToast, cerrarErrorToast, reintentarError } =
    useFavoritos();
  const router = useRouter();
  const rutaActual = usePathname();

  const irA = (destino: "/login" | "/registro") => {
    cerrarModal();
    router.push(`${destino}?volverA=${encodeURIComponent(rutaActual)}`);
  };

  return (
    <>
      {modalAbierto && (
        <Modal
          variant="session"
          title="Inicia sesión para guardar tus favoritos"
          primaryLabel="Iniciar sesión"
          onPrimary={() => irA("/login")}
          secondaryLabel="Crear cuenta"
          onSecondary={() => irA("/registro")}
          tertiaryLabel="Seguir viendo"
          onTertiary={descartarPendiente}
          onClose={descartarPendiente}
        >
          {modalAbierto.nombre
            ? `Guardaremos "${modalAbierto.nombre}" en cuanto entres, y estará en tu cuenta cuando vuelvas.`
            : "Guarda tus tonos favoritos y encuéntralos en tu cuenta cuando vuelvas."}
        </Modal>
      )}
      {errorToast && (
        <ToastDock>
          <Toast
            tone="error"
            message={
              errorToast.accion === "guardar"
                ? "No pudimos guardar tu favorito. Inténtalo otra vez."
                : "No pudimos quitar tu favorito. Inténtalo otra vez."
            }
            actionLabel="Reintentar"
            onAction={reintentarError}
            onClose={cerrarErrorToast}
          />
        </ToastDock>
      )}
    </>
  );
}
