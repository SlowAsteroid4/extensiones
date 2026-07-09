import { registrarCuenta } from "@/modules/cuenta/registro";

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido" }, { status: 400 });
  }

  const resultado = await registrarCuenta(cuerpo);
  if (!resultado.ok) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  return Response.json(resultado.cuenta, { status: 201 });
}
