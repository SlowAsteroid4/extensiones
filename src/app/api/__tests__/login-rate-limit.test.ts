// Rate limit de la ruta de login (3.D.5): 5 fallos → el 6.º intento recibe 429
// SIN llegar a Auth.js. Se mockean los handlers de Auth.js para aislar el wrapper.
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const respuestaFallo = () =>
  new Response(null, {
    status: 302,
    headers: { location: "http://localhost:3000/api/auth/error?error=CredentialsSignin" },
  });

const postAuthJs = vi.fn<(req: Request) => Promise<Response>>(async () => respuestaFallo());

vi.mock("@/shared/auth/config", () => ({
  handlers: { GET: vi.fn(), POST: (req: Request) => postAuthJs(req) },
}));

import { POST } from "../auth/[...nextauth]/route";

function requestLogin(email: string) {
  return new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    body: new URLSearchParams({ csrfToken: "x", email, password: "incorrecta" }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
}

describe("rate limit de login (H08 / 3.D.5)", () => {
  it("los primeros 5 fallos pasan a Auth.js; el 6.º recibe 429 sin tocar Auth.js", async () => {
    const email = `bloqueo-${Date.now()}@example.com`;

    for (let intento = 1; intento <= 5; intento++) {
      const res = await POST(requestLogin(email));
      expect(res.status).toBe(302); // delegado a Auth.js (fallo genérico)
    }
    expect(postAuthJs).toHaveBeenCalledTimes(5);

    const sexto = await POST(requestLogin(email));
    expect(sexto.status).toBe(429);
    const cuerpo = (await sexto.json()) as { error: string };
    expect(cuerpo.error).toContain("15 minutos");
    expect(postAuthJs).toHaveBeenCalledTimes(5); // el 6.º NO llegó a Auth.js
  });

  it("el bloqueo es por email: otro email no está bloqueado", async () => {
    const res = await POST(requestLogin(`otro-${Date.now()}@example.com`));
    expect(res.status).toBe(302);
  });
});
