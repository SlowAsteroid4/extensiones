"use client";
// CTA de WhatsApp = para DUDAS (regla vinculante 3.D). Número vía
// NEXT_PUBLIC_WHATSAPP_NUMERO; si falta, el botón NO se renderiza.
// Si WhatsApp no abre (popup bloqueado) → toast con número copiable (A1).
import { useState } from "react";
import { Boton } from "@/shared/ui/boton";
import { Toast, ToastDock } from "@/shared/ui/feedback";

const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO;

function formatearNumeroVisible(numero: string): string {
  const digitos = numero.replace(/\D/g, "").replace(/^52/, "");
  return digitos.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3");
}

export function BotonWhatsApp({
  mensaje,
  etiqueta = "¿Dudas de tono? Escríbenos",
  size = "md",
  fullWidth = true,
}: {
  /** texto prellenado del chat */
  mensaje?: string;
  etiqueta?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const [toastVisible, setToastVisible] = useState(false);
  const [copiado, setCopiado] = useState(false);
  if (!NUMERO) return null;

  const digitos = NUMERO.replace(/\D/g, "");
  const url = `https://wa.me/${digitos}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
  const visible = formatearNumeroVisible(NUMERO);

  const abrir = () => {
    const ventana = window.open(url, "_blank", "noopener,noreferrer");
    if (!ventana) setToastVisible(true);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(visible);
      setCopiado(true);
    } catch {
      // el número queda visible en el toast
    }
  };

  return (
    <>
      <Boton variant="whatsapp" size={size} fullWidth={fullWidth} onClick={abrir}>
        {etiqueta}
      </Boton>
      {toastVisible && (
        <ToastDock>
          <Toast
            tone="info"
            message={copiado ? "Número copiado" : `No pudimos abrir WhatsApp. Copia el número: ${visible}`}
            actionLabel="Copiar"
            onAction={copiar}
            onClose={() => {
              setToastVisible(false);
              setCopiado(false);
            }}
          />
        </ToastDock>
      )}
    </>
  );
}
