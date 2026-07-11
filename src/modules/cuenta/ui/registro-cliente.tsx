"use client";
// C1 · Registro (H07). Errores INLINE con los mensajes EXACTOS de la API
// (registroSchema es la MISMA validación del backend, importada, así el texto
// nunca diverge) · duplicado 409 → aviso con link a login · nunca se pierde lo
// capturado. Al crear la cuenta se inicia sesión y se vuelve a `volverA`
// (así el favorito pendiente de C5 se guarda solo).
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { registroSchema } from "@/shared/validacion/schemas";
import { Boton } from "@/shared/ui/boton";
import { Enlace } from "@/shared/ui/datos";
import { CampoFormulario } from "@/shared/ui/formularios";
import { AvisoSuperficie } from "@/shared/ui/producto";
import { EncabezadoAuth, MarcoAuth } from "./auth-ui";

interface ErroresRegistro {
  email?: string;
  password?: string;
  duplicado?: boolean;
  general?: string;
}

export function RegistroCliente() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const volverA = searchParams.get("volverA") ?? "/cuenta";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [enviando, setEnviando] = useState(false);

  const validarLocal = (): ErroresRegistro => {
    const resultado = registroSchema.safeParse({ email, password });
    if (resultado.success) return {};
    const nuevos: ErroresRegistro = {};
    for (const issue of resultado.error.issues) {
      const campo = issue.path[0];
      if (campo === "email" && !nuevos.email) nuevos.email = issue.message;
      if (campo === "password" && !nuevos.password) nuevos.password = issue.message;
    }
    return nuevos;
  };

  const enviar = async () => {
    const locales = validarLocal();
    if (locales.email || locales.password) {
      setErrores(locales);
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/cuenta/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (respuesta.status === 201) {
        // Acceso inmediato con las mismas credenciales (si el login automático
        // fallara, la cuenta ya existe: se la lleva al login).
        const acceso = await signIn("credentials", { redirect: false, email, password });
        router.push(acceso && !acceso.error ? volverA : `/login?volverA=${encodeURIComponent(volverA)}`);
        router.refresh();
        return;
      }
      const datos = (await respuesta.json()) as { error?: string };
      const mensaje = datos.error ?? "No pudimos crear tu cuenta. Inténtalo otra vez.";
      if (respuesta.status === 409) {
        setErrores({ email: mensaje, duplicado: true });
      } else if (mensaje.toLowerCase().includes("contraseña")) {
        setErrores({ password: mensaje });
      } else {
        setErrores({ email: mensaje });
      }
    } catch {
      setErrores({ general: "No pudimos crear tu cuenta. Revisa tu conexión e inténtalo otra vez." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <MarcoAuth>
      <EncabezadoAuth title="Crea tu cuenta" sub="Guarda tus tonos favoritos y sigue tus pedidos." />
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <CampoFormulario
          label="Correo electrónico"
          htmlFor="registro-email"
          required
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!errores.email}
          errorText={errores.email}
        />
        <CampoFormulario
          label="Contraseña"
          htmlFor="registro-password"
          required
          type="password"
          placeholder="Crea tu contraseña"
          helpText="Mínimo 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!errores.password}
          errorText={errores.password}
        />
        {errores.duplicado && (
          <AvisoSuperficie>
            Ya existe una cuenta con este correo.{" "}
            <Enlace href={`/login?volverA=${encodeURIComponent(volverA)}`}>Iniciar sesión</Enlace>
          </AvisoSuperficie>
        )}
        {errores.general && (
          <div className="flex items-center gap-2.5 rounded-md bg-error-surface p-3.5 text-[14px] font-semibold text-error">
            {errores.general}
          </div>
        )}
        <Boton type="submit" variant="primary" size="lg" fullWidth loading={enviando}>
          Crear cuenta
        </Boton>
      </form>
      <div className="text-center">
        <span className="text-[14px] font-medium text-text-muted">¿Ya tienes cuenta? </span>
        <Enlace href={`/login?volverA=${encodeURIComponent(volverA)}`}>Inicia sesión</Enlace>
      </div>
    </MarcoAuth>
  );
}
