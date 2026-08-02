// @vitest-environment jsdom
// C1 · alta de cuenta: los requisitos de la contraseña se marcan mientras se
// escribe, el correo se comprueba contra el servidor y —regla vinculante 3.D—
// el error sale INLINE sin vaciar lo capturado.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const signIn = vi.fn(async () => ({ error: undefined }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("next-auth/react", () => ({ signIn: (...args: unknown[]) => signIn(...(args as [])) }));

import { ProveedorCarrito } from "@/modules/compra/ui/carrito-contexto";
import { RegistroCliente } from "./registro-cliente";

/** Respuestas del servidor por ruta; cada test declara solo lo que necesita. */
function servidor(respuestas: {
  disponible?: boolean;
  alta?: { status: number; cuerpo: unknown };
}) {
  return vi.fn(async (url: string, opciones?: RequestInit) => {
    if (String(url).includes("email-disponible")) {
      return new Response(JSON.stringify({ disponible: respuestas.disponible ?? true }), { status: 200 });
    }
    const alta = respuestas.alta ?? { status: 201, cuerpo: { id: "c1", email: "ana@example.com" } };
    void opciones;
    return new Response(JSON.stringify(alta.cuerpo), { status: alta.status });
  });
}

const pintar = () =>
  render(
    <ProveedorCarrito>
      <RegistroCliente />
    </ProveedorCarrito>
  );

// Los campos obligatorios llevan un "*" pegado a la etiqueta: se ancla al inicio.
const escribir = (etiqueta: string, valor: string) => {
  const campo = screen.getByLabelText(new RegExp(`^${etiqueta}`)) as HTMLInputElement;
  fireEvent.change(campo, { target: { value: valor } });
  return campo;
};

const cuerpoDelAlta = (fetchMock: ReturnType<typeof servidor>) => {
  const llamada = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/cuenta/registro"));
  return llamada ? (JSON.parse(String((llamada[1] as RequestInit).body)) as Record<string, unknown>) : null;
};

beforeEach(() => {
  push.mockClear();
  signIn.mockClear();
});

afterEach(cleanup);

describe("RegistroCliente · requisitos de contraseña en vivo", () => {
  it("marca cada requisito conforme se cumple, sin bloquear por composición", () => {
    vi.stubGlobal("fetch", servidor({}));
    pintar();

    escribir("Contraseña", "hola");
    expect(screen.getByText(/Al menos 12 caracteres/).textContent).toContain("Falta:");

    escribir("Contraseña", "bicicleta-verde-77");
    for (const requisito of [/Al menos 12 caracteres/, /No es una contraseña común/, /No usa tu correo/]) {
      expect(screen.getByText(requisito).textContent).toContain("Cumplido:");
    }
    // Solo minúsculas y guiones: la variedad suma fuerza, no es obligatoria.
    expect(screen.getByText("Fuerte")).toBeDefined();
  });

  it("una contraseña común no se marca como cumplida aunque sea larga", () => {
    vi.stubGlobal("fetch", servidor({}));
    pintar();
    escribir("Contraseña", "contraseña2024");
    expect(screen.getByText(/No es una contraseña común/).textContent).toContain("Falta:");
  });
});

describe("RegistroCliente · comprobación del correo", () => {
  it("avisa que el correo está disponible", async () => {
    vi.stubGlobal("fetch", servidor({ disponible: true }));
    pintar();
    escribir("Correo electrónico", "ana@example.com");
    await waitFor(() => expect(screen.getByText("Correo disponible")).toBeDefined(), { timeout: 3000 });
  });

  it("si ya tiene cuenta lo dice y ofrece iniciar sesión, sin mandar el alta", async () => {
    const fetchMock = servidor({ disponible: false });
    vi.stubGlobal("fetch", fetchMock);
    pintar();

    escribir("Correo electrónico", "ana@example.com");
    escribir("Contraseña", "bicicleta-verde-77");
    await waitFor(() => expect(screen.getByText("Ese correo ya tiene cuenta")).toBeDefined(), {
      timeout: 3000,
    });
    expect(screen.getByText("Iniciar sesión")).toBeDefined();

    fireEvent.click(screen.getByText("Crear cuenta"));
    await waitFor(() => expect(screen.getByText("Ese correo ya está registrado.")).toBeDefined());
    expect(cuerpoDelAlta(fetchMock)).toBeNull(); // no se llegó a intentar el alta
  });

  it("no consulta al servidor mientras el correo está a medias", () => {
    const fetchMock = servidor({});
    vi.stubGlobal("fetch", fetchMock);
    pintar();
    escribir("Correo electrónico", "ana@");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("RegistroCliente · envío", () => {
  it("error inline por contraseña débil y NO se pierde lo capturado (3.D)", async () => {
    const fetchMock = servidor({});
    vi.stubGlobal("fetch", fetchMock);
    pintar();

    const correo = escribir("Correo electrónico", "ana@example.com");
    const password = escribir("Contraseña", "hola123");
    fireEvent.click(screen.getByText("Crear cuenta"));

    await waitFor(() =>
      expect(screen.getByText("La contraseña debe tener al menos 12 caracteres")).toBeDefined()
    );
    expect(correo.value).toBe("ana@example.com");
    expect(password.value).toBe("hola123");
    expect(cuerpoDelAlta(fetchMock)).toBeNull();
  });

  it("alta correcta: manda nombre y campo trampa vacío, y confirma antes de entrar", async () => {
    const fetchMock = servidor({ disponible: true, alta: { status: 201, cuerpo: { id: "c1" } } });
    vi.stubGlobal("fetch", fetchMock);
    pintar();

    escribir("Tu nombre", "Ana Torres");
    escribir("Correo electrónico", "ana@example.com");
    escribir("Contraseña", "bicicleta-verde-77");
    fireEvent.click(screen.getByText("Crear cuenta"));

    await waitFor(() => expect(screen.getByText("¡Cuenta creada!")).toBeDefined());
    expect(cuerpoDelAlta(fetchMock)).toMatchObject({
      email: "ana@example.com",
      nombre: "Ana Torres",
      sitio_web: "",
    });
    await waitFor(() => expect(signIn).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("el 429 del servidor se muestra tal cual", async () => {
    vi.stubGlobal(
      "fetch",
      servidor({ alta: { status: 429, cuerpo: { error: "Demasiadas cuentas. Espera una hora." } } })
    );
    pintar();

    escribir("Correo electrónico", "ana@example.com");
    escribir("Contraseña", "bicicleta-verde-77");
    fireEvent.click(screen.getByText("Crear cuenta"));

    await waitFor(() => expect(screen.getByText("Demasiadas cuentas. Espera una hora.")).toBeDefined());
  });
});
