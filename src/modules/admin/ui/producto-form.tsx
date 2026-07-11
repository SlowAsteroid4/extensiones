"use client";
// D2 · Crear / editar producto (H15, H16).
//   · errores inline POR CAMPO con los mensajes de la API (400 → errores[])
//     y SIN perder lo capturado
//   · foto vía uploader con requisitos exactos (mín 800×800, máx 5 MB);
//     se persiste como data-URL reducida dentro de fotos[] (contrato cerrado:
//     strings — no existe endpoint de subida de archivos)
//   · variantes repetibles (agregar/quitar fila)
//   · falla de conexión → toast con reintento, cambios conservados
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FAMILIAS_TONO } from "@/shared/validacion/familias";
import { pesosACentavos } from "@/shared/precio/formatear";
import { Boton } from "@/shared/ui/boton";
import { Divider, Label } from "@/shared/ui/datos";
import { Toast, ToastDock } from "@/shared/ui/feedback";
import { CampoFormulario, Chip, FilaVarianteEditable, SubidorImagen } from "@/shared/ui/formularios";
import { capitalizar } from "@/modules/catalogo/ui/tipos";
import { BarraAdmin, NavAdmin, type ProductoAdmin } from "./comunes";

const ERROR_FOTO = "La imagen debe ser mín. 800×800 y pesar máx. 5 MB. Sube otra sin perder el formulario.";

interface FilaVariante {
  clave: string;
  id?: string;
  largo: string;
  precio: string; // pesos
  existencias: string;
}

interface CategoriaAPI {
  id: string;
  nombre: string;
}

let contadorFila = 0;
const nuevaFila = (): FilaVariante => ({ clave: `fila-${++contadorFila}`, largo: "", precio: "", existencias: "" });

/** Reduce la imagen a ≤1000px por lado y la codifica como JPEG data-URL. */
async function fotoADataUrl(archivo: File): Promise<{ dataUrl: string } | { error: string }> {
  if (!["image/png", "image/jpeg"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
    return { error: ERROR_FOTO };
  }
  const bitmap = await createImageBitmap(archivo).catch(() => null);
  if (!bitmap) return { error: ERROR_FOTO };
  if (bitmap.width < 800 || bitmap.height < 800) return { error: ERROR_FOTO };
  const escala = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext("2d")?.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  return { dataUrl: lienzo.toDataURL("image/jpeg", 0.82) };
}

export function ProductoForm({ inicial }: { inicial?: ProductoAdmin }) {
  const router = useRouter();
  const editando = !!inicial;

  const [nombre, setNombre] = useState(inicial?.nombre_tono ?? "");
  const [familia, setFamilia] = useState(inicial?.familia_tono ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? "");
  const [categoriaId, setCategoriaId] = useState(inicial?.categoria.id ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [foto, setFoto] = useState<string | undefined>(inicial?.fotos[0]);
  const [errorFoto, setErrorFoto] = useState(false);
  const [filas, setFilas] = useState<FilaVariante[]>(
    inicial
      ? inicial.variantes.map((v) => ({
          clave: v.id,
          id: v.id,
          largo: `${v.largo_pulgadas}"`,
          precio: String(v.precio_mxn / 100),
          existencias: String(v.existencias),
        }))
      : [nuevaFila()]
  );
  const [categorias, setCategorias] = useState<CategoriaAPI[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [toastFalla, setToastFalla] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => (r.ok ? (r.json() as Promise<CategoriaAPI[]>) : []))
      .then((lista) => setCategorias(Array.isArray(lista) ? lista : []))
      .catch(() => {});
    fetch("/api/productos/facetas")
      .then((r) => (r.ok ? (r.json() as Promise<{ tipos: string[] }>) : null))
      .then((datos) => datos && setTipos(datos.tipos))
      .catch(() => {});
  }, []);

  const seleccionarFoto = async (archivo: File | null) => {
    if (!archivo) return;
    const resultado = await fotoADataUrl(archivo);
    if ("error" in resultado) {
      setErrorFoto(true);
    } else {
      setErrorFoto(false);
      setFoto(resultado.dataUrl);
    }
  };

  const cuerpoBase = () => ({
    nombre_tono: nombre,
    familia_tono: familia,
    tipo,
    descripcion,
    categoria_id: categoriaId,
    fotos: foto ? [foto] : [],
  });

  const filaAVariante = (fila: FilaVariante) => ({
    largo_pulgadas: Number.parseInt(fila.largo.replace(/\D/g, ""), 10) || 0,
    precio_mxn: Number.isFinite(Number(fila.precio)) && Number(fila.precio) > 0 ? pesosACentavos(Number(fila.precio)) : 0,
    existencias: Number.isInteger(Number(fila.existencias)) && fila.existencias.trim() !== "" ? Number(fila.existencias) : -1,
  });

  const guardar = async () => {
    setErrores({});
    setGuardando(true);
    try {
      const respuesta = editando
        ? await fetch(`/api/admin/productos/${inicial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...cuerpoBase(),
              variantes: {
                crear: filas.filter((f) => !f.id).map(filaAVariante),
                actualizar: filas.filter((f) => f.id).map((f) => ({ id: f.id!, ...filaAVariante(f) })),
                eliminar: (inicial.variantes ?? [])
                  .filter((v) => !filas.some((f) => f.id === v.id))
                  .map((v) => v.id),
              },
            }),
          })
        : await fetch("/api/admin/productos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...cuerpoBase(), activo: true, variantes: filas.map(filaAVariante) }),
          });

      if (respuesta.ok) {
        router.push("/admin/productos");
        router.refresh();
        return;
      }
      const datos = (await respuesta.json()) as {
        error?: string;
        errores?: { campo: string; mensaje: string }[];
      };
      if (datos.errores?.length) {
        // Errores POR CAMPO de la API, pintados en su campo — lo capturado se conserva.
        const porCampo: Record<string, string> = {};
        for (const e of datos.errores) {
          const campo = e.campo
            .replace(/^variantes\.(crear|actualizar)\./, "variantes.")
            .replace(/\.(\d+)\./, ".$1.");
          if (!porCampo[campo]) porCampo[campo] = e.mensaje;
        }
        setErrores(porCampo);
      } else {
        setErrores({ general: datos.error ?? "No pudimos guardar." });
      }
    } catch {
      setToastFalla(true);
    } finally {
      setGuardando(false);
    }
  };

  const errorDeFila = (indice: number, campo: "largo_pulgadas" | "precio_mxn" | "existencias") =>
    errores[`variantes.${indice}.${campo}`];

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraAdmin title={editando ? "Editar producto" : "Nuevo producto"} />
      <NavAdmin activa="productos" />
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-4 p-4 lg:p-6">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
        >
          <CampoFormulario label="Foto del producto" required>
            <SubidorImagen
              preview={foto}
              error={errorFoto}
              errorText={errorFoto ? ERROR_FOTO : undefined}
              onSelect={(archivo) => void seleccionarFoto(archivo)}
              onRemove={() => setFoto(undefined)}
            />
          </CampoFormulario>

          <CampoFormulario
            label="Nombre del tono"
            htmlFor="d2-nombre"
            required
            placeholder="Ej. Rubio Miel"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={!!errores.nombre_tono}
            errorText={errores.nombre_tono}
          />

          <div className="flex flex-col gap-1.5">
            <Label required>Familia de tono</Label>
            <div className="flex flex-wrap gap-2">
              {FAMILIAS_TONO.map((f) => (
                <Chip key={f} active={familia === f} onClick={() => setFamilia(f)}>
                  {capitalizar(f)}
                </Chip>
              ))}
            </div>
            {errores.familia_tono && (
              <span className="text-[13px] font-medium text-error">{errores.familia_tono}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label required>Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {tipos.map((t) => (
                <Chip key={t} active={tipo === t} onClick={() => setTipo(t)}>
                  {capitalizar(t)}
                </Chip>
              ))}
            </div>
            {errores.tipo && <span className="text-[13px] font-medium text-error">{errores.tipo}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label required>Categoría</Label>
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <Chip key={c.id} active={categoriaId === c.id} onClick={() => setCategoriaId(c.id)}>
                  {c.nombre}
                </Chip>
              ))}
            </div>
            {errores.categoria_id && (
              <span className="text-[13px] font-medium text-error">{errores.categoria_id}</span>
            )}
          </div>

          <CampoFormulario
            label="Descripción"
            htmlFor="d2-descripcion"
            required
            placeholder="Describe el producto…"
            helpText="Cuenta el tono, el material y para qué look sirve."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            error={!!errores.descripcion}
            errorText={errores.descripcion}
          />

          <div className="flex flex-col gap-2">
            <Label>Variantes (largo · precio · existencias)</Label>
            {filas.map((fila, indice) => (
              <FilaVarianteEditable
                key={fila.clave}
                largo={fila.largo}
                precio={fila.precio}
                existencias={fila.existencias}
                errores={{
                  largo: errorDeFila(indice, "largo_pulgadas"),
                  precio: errorDeFila(indice, "precio_mxn"),
                  existencias: errorDeFila(indice, "existencias"),
                }}
                onChange={(cambio) =>
                  setFilas((prev) => prev.map((f) => (f.clave === fila.clave ? { ...f, ...cambio } : f)))
                }
                onRemove={() => setFilas((prev) => prev.filter((f) => f.clave !== fila.clave))}
              />
            ))}
            {errores.variantes && (
              <span className="text-[13px] font-semibold text-error">{errores.variantes}</span>
            )}
            <div>
              <Boton variant="secondary" size="sm" icon="plus" onClick={() => setFilas((prev) => [...prev, nuevaFila()])}>
                Agregar variante
              </Boton>
            </div>
          </div>

          {errores.general && (
            <div className="rounded-md bg-error-surface p-3.5 text-[14px] font-semibold text-error">
              {errores.general}
            </div>
          )}

          <Divider />
          <div className="flex gap-2.5">
            <Boton variant="secondary" fullWidth href="/admin/productos">
              Cancelar
            </Boton>
            <Boton type="submit" variant="primary" fullWidth loading={guardando}>
              Guardar producto
            </Boton>
          </div>
        </form>
      </div>

      {toastFalla && (
        <ToastDock>
          <Toast
            tone="error"
            message="No pudimos guardar. Tus cambios siguen aquí."
            actionLabel="Reintentar"
            onAction={() => {
              setToastFalla(false);
              void guardar();
            }}
            onClose={() => setToastFalla(false)}
          />
        </ToastDock>
      )}
    </div>
  );
}
