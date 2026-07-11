"use client";
// B2 · Checkout (H05). Invitada: correo obligatorio + teléfono opcional.
// Con sesión: NO se pide lo que la sesión ya sabe (el correo va precargado
// del token). El carrito ya viene CONSOLIDADO por variante_id (la API
// rechaza repetidos con 400). Errores de la API:
//   · 400 de formato → inline en su campo, sin vaciar nada
//   · 400/409 con `detalles` POR ITEM → pintados en la fila correspondiente
//   · 502 (falla al iniciar pago) → modal con Reintentar / Volver al carrito
// Éxito → SIEMPRE redirige a init_point (venga del provider que venga).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/shared/ui/boton";
import { Enlace } from "@/shared/ui/datos";
import { Modal } from "@/shared/ui/feedback";
import { CampoFormulario } from "@/shared/ui/formularios";
import { BarraSuperior } from "@/shared/ui/producto";
import { checkoutSchema } from "@/shared/validacion/schemas";
import { useCarrito } from "./carrito-contexto";
import { ResumenPedido, type LineaPedido } from "./resumen-pedido";

interface DetalleItemAPI {
  variante_id: string;
  error: string;
}

export function CheckoutPagina({ emailSesion }: { emailSesion?: string }) {
  const router = useRouter();
  const { items, totalPiezas, listo } = useCarrito();

  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorTelefono, setErrorTelefono] = useState<string | null>(null);
  const [erroresPorItem, setErroresPorItem] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [fallaPago, setFallaPago] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const conSesion = !!emailSesion;
  const emailContacto = conSesion ? emailSesion : email;

  const lineas: LineaPedido[] = useMemo(
    () =>
      items.map((i) => ({
        clave: i.variante_id,
        nombre: i.nombre_tono,
        largo: i.largo,
        cantidad: i.cantidad,
        importe_mxn: i.cantidad * i.precio_mxn,
        error: erroresPorItem[i.variante_id],
      })),
    [items, erroresPorItem]
  );
  const total = items.reduce((s, i) => s + i.cantidad * i.precio_mxn, 0);

  const pagar = async () => {
    setErrorEmail(null);
    setErrorTelefono(null);
    setErroresPorItem({});
    setErrorGeneral(null);

    const cuerpo = {
      items: items.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad })),
      email_contacto: emailContacto ?? "",
      ...(telefono.trim() ? { telefono_contacto: telefono.replace(/\D/g, "") } : {}),
    };

    // Misma validación del backend (mensajes idénticos), sin perder lo capturado.
    const validacion = checkoutSchema.safeParse(cuerpo);
    if (!validacion.success) {
      for (const issue of validacion.error.issues) {
        if (issue.path[0] === "email_contacto" && !conSesion) setErrorEmail(issue.message);
        else if (issue.path[0] === "telefono_contacto") setErrorTelefono(issue.message);
        else setErrorGeneral(issue.message);
      }
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (respuesta.status === 201) {
        const pedido = (await respuesta.json()) as { init_point: string };
        // SIEMPRE a init_point (fake → confirmación local; MP → checkout real).
        window.location.assign(pedido.init_point);
        return;
      }
      const datos = (await respuesta.json()) as { error?: string; detalles?: DetalleItemAPI[] };
      if (respuesta.status === 502) {
        setFallaPago(true);
      } else if (datos.detalles && datos.detalles.length > 0) {
        setErroresPorItem(Object.fromEntries(datos.detalles.map((d) => [d.variante_id, d.error])));
      } else if (datos.error?.toLowerCase().includes("correo")) {
        setErrorEmail(datos.error);
      } else if (datos.error?.toLowerCase().includes("teléfono")) {
        setErrorTelefono(datos.error);
      } else {
        setErrorGeneral(datos.error ?? "No pudimos crear tu pedido. Inténtalo otra vez.");
      }
    } catch {
      setFallaPago(true);
    } finally {
      setEnviando(false);
    }
  };

  // Sin items no hay checkout: de vuelta al carrito (su empty state con CTA).
  const carritoVacio = listo && items.length === 0 && !enviando;
  useEffect(() => {
    if (carritoVacio) router.replace("/carrito");
  }, [carritoVacio, router]);
  if (carritoVacio) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraSuperior title="Datos de contacto" cartCount={totalPiezas} backHref="/carrito" />
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 p-4">
        <form
          noValidate
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            void pagar();
          }}
        >
          {conSesion ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-text-strong">Tu pedido llegará a</span>
              <span className="text-[14px] font-medium text-text-muted">{emailSesion}</span>
            </div>
          ) : (
            <>
              <span className="text-[14px] font-semibold text-text-strong">Comprar como invitada</span>
              <CampoFormulario
                label="Correo electrónico"
                htmlFor="checkout-email"
                required
                type="email"
                placeholder="tu@correo.com"
                helpText="Te enviaremos el folio de tu pedido aquí."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errorEmail}
                errorText={errorEmail ?? undefined}
              />
            </>
          )}
          <CampoFormulario
            label="Teléfono (opcional)"
            htmlFor="checkout-telefono"
            type="tel"
            placeholder="55 1234 5678"
            prefix="+52"
            helpText="Para coordinar la entrega por WhatsApp."
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            error={!!errorTelefono}
            errorText={errorTelefono ?? undefined}
          />
          {!conSesion && <Enlace href={`/login?volverA=${encodeURIComponent("/checkout")}`}>¿Ya tienes cuenta? Inicia sesión</Enlace>}

          <ResumenPedido lineas={lineas} totalCentavos={total} />

          {errorGeneral && (
            <div className="rounded-md bg-error-surface p-3.5 text-[14px] font-semibold text-error">
              {errorGeneral}
            </div>
          )}

          <Boton type="submit" variant="primary" size="lg" fullWidth loading={enviando} iconRight="arrow-right">
            Ir a pagar
          </Boton>
          <span className="text-center text-[12px] font-medium text-text-subtle">
            Pago seguro con MercadoPago
          </span>
        </form>
      </div>

      {fallaPago && (
        <Modal
          variant="error"
          title="No pudimos iniciar el pago"
          primaryLabel="Reintentar"
          onPrimary={() => {
            setFallaPago(false);
            void pagar();
          }}
          secondaryLabel="Volver al carrito"
          onSecondary={() => router.push("/carrito")}
          onClose={() => setFallaPago(false)}
        >
          Tu carrito sigue intacto. Inténtalo de nuevo en un momento.
        </Modal>
      )}
    </div>
  );
}
