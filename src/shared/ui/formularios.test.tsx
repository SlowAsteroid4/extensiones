// @vitest-environment jsdom
// T6 · Regla vinculante 3.D: errores INLINE sin perder lo capturado — el
// formulario nunca se vacía ante un error (C1, B2, D2).
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CampoFormulario, SelectorVariantes } from "./formularios";
import { formatearPrecioMXN } from "@/shared/precio/formatear";

afterEach(cleanup);

function CampoConError() {
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError("El correo no tiene un formato válido");
      }}
    >
      <CampoFormulario
        label="Correo electrónico"
        htmlFor="prueba-email"
        type="email"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        error={!!error}
        errorText={error ?? undefined}
      />
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("CampoFormulario · error inline sin pérdida", () => {
  it("muestra el error bajo el campo y conserva lo capturado", () => {
    render(<CampoConError />);
    const input = screen.getByLabelText("Correo electrónico") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ana@correo" } });
    fireEvent.click(screen.getByText("Enviar"));

    expect(screen.getByText("El correo no tiene un formato válido")).toBeDefined();
    expect(input.value).toBe("ana@correo"); // no se vació
  });
});

describe("SelectorVariantes · agotado visible y no comprable", () => {
  it("la variante agotada se muestra deshabilitada con su badge", () => {
    render(
      <SelectorVariantes
        options={[
          { value: "v18", label: '18"', price: 229000 },
          { value: "v20", label: '20"', price: 249000, soldOut: true },
        ]}
        value="v18"
        formatearPrecio={formatearPrecioMXN}
      />
    );
    expect(screen.getByText("Agotado")).toBeDefined(); // nunca se oculta
    const botones = screen.getAllByRole("button");
    const agotada = botones.find((b) => b.textContent?.includes('20"')) as HTMLButtonElement;
    expect(agotada.disabled).toBe(true);
  });
});
