"use client";
// C2 · Login (H08) vía signIn('credentials') del cliente (contrato).
//   · credenciales malas → error GENÉRICO (no revela el campo)
//   · 6.º intento → 429: se muestra el mensaje de la API TAL CUAL y el
//     formulario queda deshabilitado. signIn de Auth.js truena con nuestra
//     respuesta 429 (el JSON no trae `url`), así que al atraparlo se repite el
//     POST para leer el mensaje exacto — con email bloqueado el backend
//     responde ANTES de Auth.js y sin registrar un intento nuevo.
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Boton } from "@/shared/ui/boton";
import { Enlace } from "@/shared/ui/datos";
import { CampoFormulario } from "@/shared/ui/formularios";
import { Icono } from "@/shared/ui/icono";
import { EncabezadoAuth, MarcoAuth } from "./auth-ui";

async function recuperarMensaje429(email: string, password: string): Promise<string | null> {
  const { csrfToken } = (await fetch("/api/auth/csrf").then((r) => r.json())) as { csrfToken: string };
  const respuesta = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: window.location.href }),
  });
  if (respuesta.status !== 429) return null;
  const datos = (await respuesta.json()) as { error?: string };
  return datos.error ?? null;
}

export function LoginCliente() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const volverA = searchParams.get("volverA") ?? "/cuenta";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorGenerico, setErrorGenerico] = useState(false);
  const [mensajeBloqueo, setMensajeBloqueo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const bloqueado = mensajeBloqueo !== null;

  const enviar = async () => {
    setErrorGenerico(false);
    setEnviando(true);
    try {
      // OJO: Auth.js responde 200 aun con credenciales malas — el fallo viaja
      // en `error` (p. ej. "CredentialsSignin"), no en `ok`.
      const resultado = await signIn("credentials", { redirect: false, email, password });
      if (resultado && !resultado.error) {
        router.push(volverA);
        router.refresh();
        return;
      }
      setErrorGenerico(true);
    } catch {
      try {
        const mensaje = await recuperarMensaje429(email, password);
        if (mensaje) setMensajeBloqueo(mensaje);
        else setErrorGenerico(true);
      } catch {
        setErrorGenerico(true);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <MarcoAuth>
      <EncabezadoAuth title="Inicia sesión" sub="Vuelve a tus favoritos y pedidos." />
      {errorGenerico && !bloqueado && (
        <div className="flex items-center gap-2.5 rounded-md bg-error-surface p-3.5">
          <Icono name="alert" size={20} color="var(--color-error)" className="shrink-0" />
          <span className="text-[14px] font-semibold text-error">
            Correo o contraseña incorrectos. Inténtalo de nuevo.
          </span>
        </div>
      )}
      {bloqueado && (
        <div className="flex items-center gap-2.5 rounded-md bg-surface-muted p-3.5">
          <Icono name="info" size={20} color="var(--color-text-muted)" className="shrink-0" />
          <span className="text-[14px] font-semibold text-text-strong">{mensajeBloqueo}</span>
        </div>
      )}
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!bloqueado) void enviar();
        }}
      >
        <CampoFormulario
          label="Correo electrónico"
          htmlFor="login-email"
          required
          type="email"
          placeholder="tu@correo.com"
          value={email}
          disabled={bloqueado}
          onChange={(e) => setEmail(e.target.value)}
        />
        <CampoFormulario
          label="Contraseña"
          htmlFor="login-password"
          required
          type="password"
          placeholder="Tu contraseña"
          value={password}
          disabled={bloqueado}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Boton type="submit" variant="primary" size="lg" fullWidth loading={enviando} disabled={bloqueado}>
          Entrar
        </Boton>
      </form>
      <div className="text-center">
        <span className="text-[14px] font-medium text-text-muted">¿Aún no tienes cuenta? </span>
        <Enlace href={`/registro?volverA=${encodeURIComponent(volverA)}`}>Créala aquí</Enlace>
      </div>
    </MarcoAuth>
  );
}
