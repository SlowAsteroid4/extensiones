"use client";
// C1 · Registro (H07). Errores INLINE con los mensajes EXACTOS de la API
// (`revisarEmail` y `evaluarPassword` son los MISMOS módulos que valida el
// backend, importados, así el texto nunca diverge) · nunca se pierde lo
// capturado. Al crear la cuenta se inicia sesión y se vuelve a `volverA`
// (así el favorito pendiente de C5 se guarda solo).
//
// Lo que hace el formulario mientras la clienta escribe:
//   · correo → se revisa la forma al salir del campo y, si es válida, se
//     pregunta al servidor si ya tiene cuenta (POST, con retardo de ~½ s y
//     cancelando la consulta anterior). Enterarse aquí y no al final es la
//     diferencia entre corregir un dedazo y volver a escribirlo todo.
//   · contraseña → medidor en vivo con los requisitos de la política OWASP;
//     cada requisito cumplido se marca con un check animado.
//   · aviso de Bloq Mayús, que es la causa nº 1 del "no me deja entrar".
//   · campo trampa invisible: el alta automatizada lo rellena y se corta sin
//     molestar a nadie con un CAPTCHA.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { revisarEmail } from "@/shared/validacion/email";
import { evaluarPassword } from "@/shared/validacion/password";
import { CAMPO_TRAMPA } from "@/shared/validacion/schemas";
import { Boton } from "@/shared/ui/boton";
import { Enlace } from "@/shared/ui/datos";
import { CampoFormulario } from "@/shared/ui/formularios";
import { Icono } from "@/shared/ui/icono";
import { AvisoSuperficie } from "@/shared/ui/producto";
import { EncabezadoAuth, MarcoAuth } from "./auth-ui";
import { MedidorPassword } from "./medidor-password";

const RETARDO_CONSULTA_MS = 550;
const MENSAJE_SIN_RED = "No pudimos crear tu cuenta. Revisa tu conexión e inténtalo otra vez.";

type EstadoEmail =
  | { tipo: "inactivo" }
  | { tipo: "verificando" }
  | { tipo: "disponible" }
  | { tipo: "ocupado" }
  | { tipo: "aviso"; mensaje: string };

interface ErroresRegistro {
  email?: string;
  password?: string;
  nombre?: string;
  general?: string;
}

export function RegistroCliente() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const volverA = searchParams.get("volverA") ?? "/cuenta";
  const irALogin = `/login?volverA=${encodeURIComponent(volverA)}`;

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trampa, setTrampa] = useState("");

  const [tocadoEmail, setTocadoEmail] = useState(false);
  const [verMedidor, setVerMedidor] = useState(false);
  const [mayusculasActivas, setMayusculasActivas] = useState(false);

  // Solo se guarda lo que dijo el servidor y para QUÉ correo; "verificando" e
  // "inactivo" se derivan, así el efecto no tiene que sincronizar nada.
  const [respuestaCorreo, setRespuestaCorreo] = useState<{ email: string; estado: EstadoEmail } | null>(
    null
  );
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [sacudir, setSacudir] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  const campoEmail = useRef<HTMLInputElement>(null);

  const revision = useMemo(() => revisarEmail(email), [email]);
  const veredicto = useMemo(() => evaluarPassword(password, { email, nombre }), [password, email, nombre]);

  const estadoEmail: EstadoEmail = !revision.ok || exito
    ? { tipo: "inactivo" }
    : respuestaCorreo?.email === revision.email
      ? respuestaCorreo.estado
      : { tipo: "verificando" };

  // Consulta de disponibilidad: solo con el correo bien formado, con retardo
  // para no disparar una petición por tecla y cancelando la anterior.
  useEffect(() => {
    if (exito || !revision.ok) return;
    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      const anotar = (estado: EstadoEmail) => setRespuestaCorreo({ email: revision.email, estado });
      try {
        const respuesta = await fetch("/api/cuenta/email-disponible", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: revision.email }),
          signal: control.signal,
        });
        const datos = (await respuesta.json()) as { disponible?: boolean; error?: string };
        if (respuesta.status === 429) {
          anotar({ tipo: "aviso", mensaje: datos.error ?? "" });
          return;
        }
        if (!respuesta.ok) {
          // Forma rechazada por el servidor (desechable, sin buzón…): se
          // muestra su motivo tal cual, que es más específico que el nuestro.
          setErrores((previos) => ({ ...previos, email: datos.error }));
          anotar({ tipo: "inactivo" });
          return;
        }
        anotar({ tipo: datos.disponible ? "disponible" : "ocupado" });
      } catch {
        // Cancelada o sin red: silencio. El POST del alta es el que decide.
        if (!control.signal.aborted) anotar({ tipo: "inactivo" });
      }
    }, RETARDO_CONSULTA_MS);

    return () => {
      control.abort();
      clearTimeout(temporizador);
    };
  }, [revision, exito]);

  const errorEmail =
    errores.email ?? (tocadoEmail && email.trim() !== "" && !revision.ok ? revision.motivo : undefined);
  const correoOcupado = estadoEmail.tipo === "ocupado";

  const fallar = (nuevos: ErroresRegistro) => {
    setErrores(nuevos);
    setSacudir(true);
  };

  const enviar = async () => {
    setErrores({});
    setTocadoEmail(true);

    if (!revision.ok) {
      fallar({ email: email.trim() === "" ? "Escribe tu correo electrónico" : revision.motivo });
      campoEmail.current?.focus();
      return;
    }
    if (correoOcupado) {
      fallar({ email: "Ese correo ya está registrado." });
      return;
    }
    if (!veredicto.valida) {
      setVerMedidor(true);
      fallar({ password: veredicto.motivo ?? "Elige una contraseña más segura" });
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/cuenta/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: revision.email,
          password,
          nombre: nombre.trim() || undefined,
          [CAMPO_TRAMPA]: trampa,
        }),
      });

      if (respuesta.status === 201) {
        // Se enseña el "listo" un momento y, mientras, se inicia sesión con las
        // mismas credenciales (si el login automático fallara, la cuenta ya
        // existe: se la lleva al login).
        setExito(true);
        const [acceso] = await Promise.all([
          signIn("credentials", { redirect: false, email: revision.email, password }),
          new Promise((listo) => setTimeout(listo, 700)),
        ]);
        router.push(acceso && !acceso.error ? volverA : irALogin);
        router.refresh();
        return;
      }

      const datos = (await respuesta.json()) as {
        error?: string;
        campo?: "email" | "password" | "nombre" | "general";
        duplicado?: boolean;
      };
      const mensaje = datos.error ?? MENSAJE_SIN_RED;
      if (datos.duplicado) {
        setRespuestaCorreo({ email: revision.email, estado: { tipo: "ocupado" } });
        fallar({ email: mensaje });
      } else if (datos.campo === "email") {
        fallar({ email: mensaje });
      } else if (datos.campo === "password") {
        setVerMedidor(true);
        fallar({ password: mensaje });
      } else if (datos.campo === "nombre") {
        fallar({ nombre: mensaje });
      } else {
        fallar({ general: mensaje });
      }
    } catch {
      fallar({ general: MENSAJE_SIN_RED });
    } finally {
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <MarcoAuth>
        <div className="animate-ls-item-in flex flex-1 flex-col items-center justify-center gap-3 pb-24 text-center">
          <span className="animate-ls-check-pop inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-surface">
            <Icono name="check-circle" size={34} color="var(--color-success)" />
          </span>
          <h1 className="text-[22px] font-extrabold text-text-strong">¡Cuenta creada!</h1>
          <p role="status" className="text-[14px] font-medium text-text-muted">
            Entrando a tu cuenta…
          </p>
        </div>
      </MarcoAuth>
    );
  }

  return (
    <MarcoAuth>
      <EncabezadoAuth title="Crea tu cuenta" sub="Guarda tus tonos favoritos y sigue tus pedidos." />
      <form
        noValidate
        className={["flex flex-col gap-3.5", sacudir ? "animate-ls-shake" : ""].join(" ")}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setSacudir(false);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        {/* Campo trampa: fuera de la vista, fuera del tabulador y fuera del
            lector de pantalla. Si llega con texto, el alta no es de una persona. */}
        <input
          type="text"
          name={CAMPO_TRAMPA}
          value={trampa}
          onChange={(e) => setTrampa(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <CampoFormulario
          label="Tu nombre"
          htmlFor="registro-nombre"
          type="text"
          placeholder="¿Cómo te llamamos?"
          autoComplete="given-name"
          helpText="Opcional. Lo usamos para saludarte y en tus pedidos."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={!!errores.nombre}
          errorText={errores.nombre}
        />

        <div>
          <CampoFormulario
            label="Correo electrónico"
            htmlFor="registro-email"
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="tu@correo.com"
            ref={campoEmail}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrores((previos) => ({ ...previos, email: undefined }));
            }}
            onBlur={() => setTocadoEmail(true)}
            error={!!errorEmail}
            errorText={errorEmail}
          />
          <EstadoDelCorreo estado={estadoEmail} conError={!!errorEmail} />
        </div>

        <div>
          <CampoFormulario
            label="Contraseña"
            htmlFor="registro-password"
            required
            type="password"
            autoComplete="new-password"
            placeholder="Crea tu contraseña"
            aria-describedby="registro-requisitos"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrores((previos) => ({ ...previos, password: undefined }));
            }}
            onFocus={() => setVerMedidor(true)}
            onKeyUp={(e) => setMayusculasActivas(e.getModifierState("CapsLock"))}
            error={!!errores.password}
            errorText={errores.password}
          />
          {mayusculasActivas && (
            <div className="animate-ls-item-in mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-text-muted">
              <Icono name="info" size={14} />
              <span>Bloq Mayús está activado.</span>
            </div>
          )}
          {(verMedidor || password.length > 0) && (
            <MedidorPassword id="registro-requisitos" evaluacion={veredicto} vacia={password.length === 0} />
          )}
        </div>

        {correoOcupado && (
          <AvisoSuperficie>
            Ya existe una cuenta con este correo. <Enlace href={irALogin}>Iniciar sesión</Enlace>
          </AvisoSuperficie>
        )}
        {estadoEmail.tipo === "aviso" && estadoEmail.mensaje && (
          <AvisoSuperficie>{estadoEmail.mensaje}</AvisoSuperficie>
        )}
        {errores.general && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-md bg-error-surface p-3.5 text-[14px] font-semibold text-error"
          >
            <Icono name="alert" size={20} color="var(--color-error)" className="shrink-0" />
            {errores.general}
          </div>
        )}

        <Boton type="submit" variant="primary" size="lg" fullWidth loading={enviando}>
          Crear cuenta
        </Boton>
      </form>
      <div className="text-center">
        <span className="text-[14px] font-medium text-text-muted">¿Ya tienes cuenta? </span>
        <Enlace href={irALogin}>Inicia sesión</Enlace>
      </div>
    </MarcoAuth>
  );
}

/* ── Línea de estado del correo: verificando · libre · ya registrado. ── */

function EstadoDelCorreo({ estado, conError }: { estado: EstadoEmail; conError: boolean }) {
  if (conError || estado.tipo === "inactivo" || estado.tipo === "aviso") return null;

  if (estado.tipo === "verificando") {
    return (
      <div
        aria-live="polite"
        className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-text-muted"
      >
        <span
          className="inline-block h-3.5 w-3.5 animate-ls-spin rounded-full border-2 border-border-strong"
          style={{ borderTopColor: "var(--color-secundario)" }}
        />
        <span>Comprobando el correo…</span>
      </div>
    );
  }

  const libre = estado.tipo === "disponible";
  return (
    <div
      aria-live="polite"
      className={[
        "animate-ls-item-in mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold",
        libre ? "text-success" : "text-text-strong",
      ].join(" ")}
    >
      <span className="animate-ls-check-pop inline-flex">
        <Icono
          name={libre ? "check-circle" : "info"}
          size={15}
          color={libre ? "var(--color-success)" : "var(--color-secundario)"}
        />
      </span>
      <span>{libre ? "Correo disponible" : "Ese correo ya tiene cuenta"}</span>
    </div>
  );
}
