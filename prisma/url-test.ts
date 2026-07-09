// La base de test vive en el mismo Postgres que la de dev, con otro nombre —
// los tests de integración nunca tocan los datos de desarrollo.
export const NOMBRE_BASE_TEST = "extensiones_test";

export function urlBaseDeTest(urlDev: string): string {
  const url = new URL(urlDev);
  url.pathname = `/${NOMBRE_BASE_TEST}`;
  return url.toString();
}
