"use client";
// D3 · Testimonios (H18, H13): lista por orden con toggle visible/oculto,
// alta con errores por campo sin perder lo capturado, y eliminar con
// confirmación destructiva. El GET público solo sirve los activos.
import { useEffect, useState } from "react";
import { Boton, BotonIcono } from "@/shared/ui/boton";
import { Divider, Label } from "@/shared/ui/datos";
import { Modal, Toast, ToastDock } from "@/shared/ui/feedback";
import { CampoFormulario, Toggle } from "@/shared/ui/formularios";
import { BarraAdmin, NavAdmin, type TestimonioAdmin } from "./comunes";

export function TestimoniosAdmin() {
  const [testimonios, setTestimonios] = useState<TestimonioAdmin[]>([]);
  const [recarga, setRecarga] = useState(0);
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [agregando, setAgregando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState<TestimonioAdmin | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/testimonios")
      .then((r) => (r.ok ? (r.json() as Promise<TestimonioAdmin[]>) : []))
      .then((lista) => setTestimonios(Array.isArray(lista) ? lista : []))
      .catch(() => {});
  }, [recarga]);

  const agregar = async () => {
    setErrores({});
    setAgregando(true);
    try {
      const orden = testimonios.reduce((mayor, t) => Math.max(mayor, t.orden), 0) + 1;
      const respuesta = await fetch("/api/admin/testimonios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, texto, orden, activo: true }),
      });
      if (respuesta.ok) {
        setNombre("");
        setTexto("");
        setRecarga((n) => n + 1);
        return;
      }
      const datos = (await respuesta.json()) as { errores?: { campo: string; mensaje: string }[] };
      if (datos.errores?.length) {
        setErrores(Object.fromEntries(datos.errores.map((e) => [e.campo, e.mensaje])));
      }
    } catch {
      setToastError("No pudimos guardar. Tus cambios siguen aquí.");
    } finally {
      setAgregando(false);
    }
  };

  const alternarVisible = async (t: TestimonioAdmin) => {
    // Optimista con reversión (patrón cerrado).
    setTestimonios((prev) => prev.map((x) => (x.id === t.id ? { ...x, activo: !t.activo } : x)));
    try {
      const respuesta = await fetch(`/api/admin/testimonios/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !t.activo }),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
    } catch {
      setTestimonios((prev) => prev.map((x) => (x.id === t.id ? { ...x, activo: t.activo } : x)));
      setToastError("No pudimos guardar el cambio. Inténtalo otra vez.");
    }
  };

  const eliminar = async () => {
    if (!confirmarBorrado) return;
    setBorrando(true);
    try {
      const respuesta = await fetch(`/api/admin/testimonios/${confirmarBorrado.id}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      setConfirmarBorrado(null);
      setRecarga((n) => n + 1);
    } catch {
      setToastError("No pudimos eliminar el testimonio. Inténtalo otra vez.");
      setConfirmarBorrado(null);
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraAdmin title="Testimonios" />
      <NavAdmin activa="testimonios" />
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-col gap-2.5">
          {testimonios.map((t) => (
            <div
              key={t.id}
              className={[
                "flex items-start gap-3 rounded-lg border border-border bg-fondo p-3.5",
                t.activo ? "" : "opacity-65",
              ].join(" ")}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[14px] font-bold text-text-strong">{t.nombre}</span>
                <span className="text-[13px] font-medium leading-[1.45] text-text-muted">{t.texto}</span>
              </div>
              <div className="flex flex-col items-end gap-2.5">
                <Toggle
                  checked={t.activo}
                  onChange={() => void alternarVisible(t)}
                  ariaLabel={`Testimonio de ${t.nombre} visible`}
                />
                <BotonIcono
                  icon="trash"
                  variant="ghost"
                  size="sm"
                  ariaLabel={`Eliminar testimonio de ${t.nombre}`}
                  onClick={() => setConfirmarBorrado(t)}
                />
              </div>
            </div>
          ))}
        </div>

        <Divider />

        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void agregar();
          }}
        >
          <Label>Agregar testimonio</Label>
          <CampoFormulario
            label="Nombre"
            htmlFor="d3-nombre"
            placeholder="Nombre de la clienta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={!!errores.nombre}
            errorText={errores.nombre}
          />
          <CampoFormulario
            label="Testimonio"
            htmlFor="d3-texto"
            placeholder="Lo que compartió sobre su tono…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            error={!!errores.texto}
            errorText={errores.texto}
          />
          <div>
            <Boton type="submit" variant="primary" icon="plus" loading={agregando}>
              Agregar
            </Boton>
          </div>
        </form>
      </div>

      {confirmarBorrado && (
        <Modal
          variant="confirm-destructive"
          title="¿Eliminar este testimonio?"
          primaryLabel="Eliminar"
          onPrimary={() => void eliminar()}
          primaryLoading={borrando}
          secondaryLabel="Cancelar"
          onSecondary={() => setConfirmarBorrado(null)}
          onClose={() => setConfirmarBorrado(null)}
        >
          Se quitará el testimonio de {confirmarBorrado.nombre} de forma permanente. Esta acción no se
          puede deshacer.
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
