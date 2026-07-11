"use client";
// D1 · Lista de productos del panel (H16, H17, H19).
//   · buscador real (GET /api/admin/productos?q=) — el panel ve inactivos
//   · "Agotado"/"Desactivado" siempre visibles
//   · toggle activo CON confirmación (efecto inmediato en tienda)
//   · edición rápida de existencias/precio POR VARIANTE: inválido → error
//     inline con el valor anterior intacto (no se envía ni sobreescribe)
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Precio } from "@/shared/ui/datos";
import { Boton, BotonIcono } from "@/shared/ui/boton";
import { Modal, Toast, ToastDock } from "@/shared/ui/feedback";
import { Input, Toggle } from "@/shared/ui/formularios";
import { EstadoVacio } from "@/shared/ui/feedback";
import { pesosACentavos } from "@/shared/precio/formatear";
import { etiquetaLargo, capitalizar } from "@/modules/catalogo/ui/tipos";
import { BarraAdmin, NavAdmin, type ProductoAdmin } from "./comunes";

const ERROR_PRECIO = "El precio debe ser mayor a $0. No se sobrescribió.";
const ERROR_EXISTENCIAS = "Las existencias no pueden ser negativas. No se sobrescribió.";

interface EdicionVariante {
  precio: string; // pesos, como en el diseño
  existencias: string;
  errorPrecio?: string;
  errorExistencias?: string;
}

function stockTotal(p: ProductoAdmin): number {
  return p.variantes.reduce((s, v) => s + v.existencias, 0);
}

function FotoMini({ producto, grande = false }: { producto: ProductoAdmin; grande?: boolean }) {
  return (
    <div
      className={[
        "foto-placeholder shrink-0 rounded-md",
        grande ? "h-14 w-14" : "h-11 w-11",
        producto.activo ? "" : "grayscale-[0.5]",
      ].join(" ")}
      style={
        producto.fotos[0]
          ? { backgroundImage: `url(${producto.fotos[0]})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    />
  );
}

export function ProductosLista() {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoAdmin[] | null>(null);
  const [q, setQ] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [confirmarToggle, setConfirmarToggle] = useState<ProductoAdmin | null>(null);
  const [toggleEnCurso, setToggleEnCurso] = useState(false);
  const [edicionRapidaId, setEdicionRapidaId] = useState<string | null>(null);
  const [ediciones, setEdiciones] = useState<Record<string, EdicionVariante>>({});
  const [guardandoRapida, setGuardandoRapida] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  // Buscador con debounce contra la API real.
  useEffect(() => {
    const control = new AbortController();
    const temporizador = setTimeout(() => {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      fetch(`/api/admin/productos${query}`, { signal: control.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ productos: ProductoAdmin[] }>) : null))
        .then((datos) => datos && setProductos(datos.productos))
        .catch(() => {});
    }, 250);
    return () => {
      control.abort();
      clearTimeout(temporizador);
    };
  }, [q, recarga]);

  const abrirEdicionRapida = (p: ProductoAdmin) => {
    setEdicionRapidaId(p.id);
    setEdiciones(
      Object.fromEntries(
        p.variantes.map((v) => [
          v.id,
          { precio: String(v.precio_mxn / 100), existencias: String(v.existencias) },
        ])
      )
    );
  };

  const guardarEdicionRapida = async (p: ProductoAdmin) => {
    // Validación con los MISMOS límites del contrato; inválido → error inline
    // en su campo y NO se envía (el valor anterior queda intacto).
    const cambios: { varianteId: string; body: { precio_mxn?: number; existencias?: number } }[] = [];
    const siguientes = { ...ediciones };
    let hayInvalido = false;
    for (const v of p.variantes) {
      const edicion = siguientes[v.id];
      if (!edicion) continue;
      const body: { precio_mxn?: number; existencias?: number } = {};
      const precio = Number(edicion.precio);
      const existencias = Number(edicion.existencias);
      let errorPrecio: string | undefined;
      let errorExistencias: string | undefined;
      if (edicion.precio.trim() === "" || !Number.isFinite(precio) || precio <= 0) {
        errorPrecio = ERROR_PRECIO;
      } else if (pesosACentavos(precio) !== v.precio_mxn) {
        body.precio_mxn = pesosACentavos(precio);
      }
      if (edicion.existencias.trim() === "" || !Number.isInteger(existencias) || existencias < 0) {
        errorExistencias = ERROR_EXISTENCIAS;
      } else if (existencias !== v.existencias) {
        body.existencias = existencias;
      }
      siguientes[v.id] = { ...edicion, errorPrecio, errorExistencias };
      if (errorPrecio || errorExistencias) hayInvalido = true;
      else if (Object.keys(body).length > 0) cambios.push({ varianteId: v.id, body });
    }
    setEdiciones(siguientes);
    if (hayInvalido) return;

    setGuardandoRapida(true);
    try {
      for (const cambio of cambios) {
        const respuesta = await fetch(`/api/admin/variantes/${cambio.varianteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cambio.body),
        });
        if (!respuesta.ok) {
          const datos = (await respuesta.json()) as { error?: string };
          setEdiciones((prev) => ({
            ...prev,
            [cambio.varianteId]: {
              ...prev[cambio.varianteId],
              errorPrecio: datos.error ?? "No se pudo guardar. No se sobrescribió.",
            },
          }));
          setGuardandoRapida(false);
          return;
        }
      }
      setEdicionRapidaId(null);
      setRecarga((n) => n + 1);
    } catch {
      setToastError("No pudimos guardar. Tus cambios siguen aquí.");
    } finally {
      setGuardandoRapida(false);
    }
  };

  const alternarActivo = async () => {
    if (!confirmarToggle) return;
    setToggleEnCurso(true);
    try {
      const respuesta = await fetch(`/api/admin/productos/${confirmarToggle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !confirmarToggle.activo }),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      setConfirmarToggle(null);
      setRecarga((n) => n + 1);
    } catch {
      setToastError("No pudimos guardar el cambio. Inténtalo otra vez.");
      setConfirmarToggle(null);
    } finally {
      setToggleEnCurso(false);
    }
  };

  const badges = (p: ProductoAdmin) => (
    <>
      {!p.activo && <Badge tone="unavailable">Desactivado</Badge>}
      {stockTotal(p) === 0 && <Badge tone="sold-out">Agotado</Badge>}
    </>
  );

  const edicionRapida = (p: ProductoAdmin) => (
    <div className="mt-1 flex flex-col gap-2">
      {p.variantes.map((v) => {
        const edicion = ediciones[v.id];
        if (!edicion) return null;
        return (
          <div key={v.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[13px] font-bold text-text-strong">
                {etiquetaLargo(v.largo_pulgadas)}
              </span>
              <Input
                prefix="$"
                type="number"
                value={edicion.precio}
                error={!!edicion.errorPrecio}
                onChange={(e) =>
                  setEdiciones((prev) => ({
                    ...prev,
                    [v.id]: { ...prev[v.id], precio: e.target.value, errorPrecio: undefined },
                  }))
                }
                contenedorClassName="max-w-[130px]"
                aria-label={`Precio ${etiquetaLargo(v.largo_pulgadas)}`}
              />
              <Input
                type="number"
                value={edicion.existencias}
                error={!!edicion.errorExistencias}
                onChange={(e) =>
                  setEdiciones((prev) => ({
                    ...prev,
                    [v.id]: { ...prev[v.id], existencias: e.target.value, errorExistencias: undefined },
                  }))
                }
                contenedorClassName="max-w-[110px]"
                aria-label={`Existencias ${etiquetaLargo(v.largo_pulgadas)}`}
              />
            </div>
            {(edicion.errorPrecio || edicion.errorExistencias) && (
              <span className="text-[12px] font-semibold text-error">
                {edicion.errorPrecio ?? edicion.errorExistencias}
              </span>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <Boton variant="primary" size="sm" loading={guardandoRapida} onClick={() => void guardarEdicionRapida(p)}>
          Guardar
        </Boton>
        <Boton variant="secondary" size="sm" onClick={() => setEdicionRapidaId(null)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );

  const filas = useMemo(() => productos ?? [], [productos]);

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraAdmin title="Productos" action="Nuevo" actionHref="/admin/productos/nuevo" />
      <NavAdmin activa="productos" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="lg:max-w-[360px]">
          <Input icon="search" placeholder="Buscar por tono o familia…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {productos !== null && filas.length === 0 && (
          <EstadoVacio
            icon="search"
            title="No encontramos productos con esa búsqueda"
            message="Prueba con otro tono."
            actionLabel="Ver todos"
            onAction={() => setQ("")}
          />
        )}

        {/* Mobile: cards (composición D1ListMobile) */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {filas.map((p) => {
            const variante = p.variantes[0];
            return (
              <div
                key={p.id}
                className={[
                  "flex items-start gap-3 rounded-lg border border-border bg-fondo p-3",
                  p.activo ? "" : "opacity-70",
                ].join(" ")}
              >
                <FotoMini producto={p} grande />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[15px] font-bold text-text-strong">{p.nombre_tono}</span>
                    {badges(p)}
                  </div>
                  <span className="text-[12px] font-medium text-text-muted">
                    {capitalizar(p.familia_tono)} · {p.variantes.length}{" "}
                    {p.variantes.length === 1 ? "variante" : "variantes"}
                  </span>
                  {edicionRapidaId === p.id ? (
                    edicionRapida(p)
                  ) : (
                    <div className="mt-0.5 flex items-center gap-2.5">
                      {variante && <Precio centavos={variante.precio_mxn} size="sm" />}
                      <span
                        className={[
                          "text-[12px] font-semibold",
                          stockTotal(p) > 0 ? "text-text-muted" : "text-error",
                        ].join(" ")}
                      >
                        · {stockTotal(p)} en stock
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  <Toggle
                    checked={p.activo}
                    onChange={() => setConfirmarToggle(p)}
                    ariaLabel={`Activar ${p.nombre_tono}`}
                  />
                  <div className="flex gap-1">
                    <BotonIcono icon="edit" variant="ghost" size="sm" ariaLabel={`Editar ${p.nombre_tono}`} onClick={() => router.push(`/admin/productos/${p.id}`)} />
                    <BotonIcono
                      icon="edit"
                      variant="tonal"
                      size="sm"
                      ariaLabel={`Edición rápida ${p.nombre_tono}`}
                      onClick={() => (edicionRapidaId === p.id ? setEdicionRapidaId(null) : abrirEdicionRapida(p))}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop 1280: tabla (composición D1ListDesktop) */}
        <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
          <div className="grid grid-cols-[56px_1.6fr_1fr_0.8fr_1fr_0.8fr_88px] items-center gap-4 bg-surface-muted px-5 py-3">
            <span />
            {["Producto", "Familia", "Variantes", "Precio", "Activo", "Acción"].map((h) => (
              <span key={h} className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-muted">
                {h}
              </span>
            ))}
          </div>
          {filas.map((p) => {
            const variante = p.variantes[0];
            return (
              <div key={p.id} className="border-t border-border">
                <div
                  className={[
                    "grid grid-cols-[56px_1.6fr_1fr_0.8fr_1fr_0.8fr_88px] items-center gap-4 px-5 py-3.5",
                    p.activo ? "" : "opacity-65",
                  ].join(" ")}
                >
                  <FotoMini producto={p} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-text-strong">{p.nombre_tono}</span>
                    {badges(p)}
                  </div>
                  <span className="text-[14px] font-medium text-text-muted">{capitalizar(p.familia_tono)}</span>
                  <span className="text-[14px] font-semibold text-text-strong">{p.variantes.length}</span>
                  <div className="flex flex-col">
                    {variante && <Precio centavos={variante.precio_mxn} size="sm" />}
                    <span
                      className={[
                        "text-[12px] font-medium",
                        stockTotal(p) > 0 ? "text-text-muted" : "text-error",
                      ].join(" ")}
                    >
                      {stockTotal(p)} en stock
                    </span>
                  </div>
                  <Toggle checked={p.activo} onChange={() => setConfirmarToggle(p)} ariaLabel={`Activar ${p.nombre_tono}`} />
                  <div className="flex gap-1">
                    <BotonIcono icon="edit" variant="ghost" size="sm" ariaLabel={`Editar ${p.nombre_tono}`} onClick={() => router.push(`/admin/productos/${p.id}`)} />
                    <BotonIcono
                      icon="edit"
                      variant="tonal"
                      size="sm"
                      ariaLabel={`Edición rápida ${p.nombre_tono}`}
                      onClick={() => (edicionRapidaId === p.id ? setEdicionRapidaId(null) : abrirEdicionRapida(p))}
                    />
                  </div>
                </div>
                {edicionRapidaId === p.id && <div className="px-5 pb-4 pl-[92px]">{edicionRapida(p)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Toggle activo CON confirmación (encargo 10) */}
      {confirmarToggle && (
        <Modal
          variant="base"
          icon="alert"
          title={confirmarToggle.activo ? "¿Desactivar este producto?" : "¿Activar este producto?"}
          primaryLabel={confirmarToggle.activo ? "Desactivar" : "Activar"}
          onPrimary={() => void alternarActivo()}
          primaryLoading={toggleEnCurso}
          secondaryLabel="Cancelar"
          onSecondary={() => setConfirmarToggle(null)}
          onClose={() => setConfirmarToggle(null)}
        >
          {confirmarToggle.activo
            ? `"${confirmarToggle.nombre_tono}" dejará de verse en la tienda de inmediato.`
            : `"${confirmarToggle.nombre_tono}" volverá a verse en la tienda de inmediato.`}
        </Modal>
      )}

      {toastError && (
        <ToastDock>
          <Toast tone="error" message={toastError} onClose={() => setToastError(null)} />
        </ToastDock>
      )}
    </div>
  );
}
