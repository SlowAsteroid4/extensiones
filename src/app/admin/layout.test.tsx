// @vitest-environment jsdom
// T7 · Guard del panel (spec §7): sin sesión → login · clienta → 403 VISIBLE
// · admin → contenido. El layout es un server component: se invoca como
// función async con auth() simulada.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const authSimulada = vi.hoisted(() => vi.fn());
vi.mock("@/shared/auth/config", () => ({ auth: authSimulada }));

import LayoutAdmin from "./layout";

afterEach(() => {
  cleanup();
  authSimulada.mockReset();
});

describe("guard de /admin", () => {
  it("sin sesión → redirige al login con retorno al panel", async () => {
    authSimulada.mockResolvedValue(null);
    // redirect() de Next lanza un error de control con digest NEXT_REDIRECT.
    await expect(LayoutAdmin({ children: <div>panel</div> })).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("sesión clienta → 403 diseñado, visible (no ve el panel)", async () => {
    authSimulada.mockResolvedValue({ user: { id: "c1", rol: "clienta" } });
    render(await LayoutAdmin({ children: <div>contenido-del-panel</div> }));
    expect(screen.getByText("No tienes acceso al panel")).toBeDefined();
    expect(screen.getByText("Requiere rol de administradora.")).toBeDefined();
    expect(screen.queryByText("contenido-del-panel")).toBeNull();
  });

  it("sesión admin → ve el panel", async () => {
    authSimulada.mockResolvedValue({ user: { id: "a1", rol: "admin" } });
    render(await LayoutAdmin({ children: <div>contenido-del-panel</div> }));
    expect(screen.getByText("contenido-del-panel")).toBeDefined();
  });
});
