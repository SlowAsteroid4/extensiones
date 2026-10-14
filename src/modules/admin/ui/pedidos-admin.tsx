"use client";
// T9 · Bitácora de ventas del panel (BLOQUE 3):
//   · lista paginada por fecha desc con filtro por estado (chips)
//   · empty state con mensaje (aún no hay ventas / sin resultados del filtro)
//   · detalle con items, precios congelados, total, contacto y botón de
//     WhatsApp hacia la COMPRADORA (excepción única autorizada del CTA:
//     coordinación de entrega)
import { useEffect, useState } from "react";
import NextLink from "next/link";
import { Badge, Precio } from "@/shared/ui/datos";
import { Boton } from "@/shared/ui/boton";
import { Chip } from "@/shared/ui/formularios";
import { EstadoVacio } from "@/shared/ui/feedback";
import { Icono } from "@/shared/ui/icono";
import type { TonoBadge } from "@/shared/ui/datos";
import {
  BarraAdmin,
  NavAdmin,
  type EstadoPedidoAdmin,
  type PedidoAdminDetalle,
  type PedidoAdminResumen,
} from "./comunes";

// Mismas etiquetas que la confirmación pública — un solo vocabulario de estados.
const ESTADOS: Record<EstadoPedidoAdmin, { etiqueta: string; tono: TonoBadge }> = {
  pendiente: { etiqueta: "Pago pendiente", tono: "accent" },
  pagado_sandbox: { etiqueta: "Pagado", tono: "success" },
  rechazado: { etiqueta: "Pago rechazado", tono: "unavailable" },
};

const FILTROS: { clave: EstadoPedidoAdmin | "todos"; etiqueta: string }[] = [
  { clave: "todos", etiqueta: "Todos" },
  { clave: "pendiente", etiqueta: "Pago pendiente" },
  { clave: "pagado_sandbox", etiqueta: "Pagados" },
  { clave: "rechazado", etiqueta: "Rechazados" },
];

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}

interface RespuestaLista {
  total: number;
  pagina: number;
  por_pagina: number;
  pedidos: PedidoAdminResumen[];
}

/* ── Lista (/admin/pedidos) ── */

export function PedidosLista() {
  const [datos, setDatos] = useState<RespuestaLista | null>(null);
  const [filtro, setFiltro] = useState<EstadoPedidoAdmin | "todos">("todos");
  const [pagina, setPagina] = useState(1);
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const control = new AbortController();
    const query = new URLSearchParams({ pagina: String(pagina) });
    if (filtro !== "todos") query.set("estado", filtro);
    fetch(`/api/admin/pedidos?${query}`, { signal: control.signal })
      .then((r) => (r.ok ? (r.json() as Promise<RespuestaLista>) : Promise.reject(r.status)))
      .then(setDatos)
      .catch((causa) => {
        if (!(causa instanceof DOMException)) setError(true);
      });
    return () => control.abort();
  }, [filtro, pagina, recarga]);

  const paginas = datos ? Math.max(Math.ceil(datos.total / datos.por_pagina), 1) : 1;
  const filas = datos?.pedidos ?? [];

  const estadoDe = (p: PedidoAdminResumen) => ESTADOS[p.estado];

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraAdmin title="Pedidos" />
      <NavAdmin activa="pedidos" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Chip
              key={f.clave}
              active={filtro === f.clave}
              onClick={() => {
                setFiltro(f.clave);
                setPagina(1);
              }}
            >
              {f.etiqueta}
            </Chip>
          ))}
        </div>

        {error && (
          <EstadoVacio
            icon="alert"
            title="No pudimos cargar los pedidos"
            message="Revisa tu conexión e inténtalo otra vez."
            actionLabel="Reintentar"
            onAction={() => {
              setError(false);
              setDatos(null);
              setRecarga((n) => n + 1);
            }}
          />
        )}

        {datos !== null && filas.length === 0 && !error && (
          <EstadoVacio
            icon="cart"
            title={filtro === "todos" ? "Aún no hay ventas" : "Sin pedidos con ese estado"}
            message={
              filtro === "todos"
                ? "Cuando alguien compre en la tienda, su pedido aparecerá aquí."
                : "Prueba con otro filtro."
            }
            actionLabel={filtro === "todos" ? undefined : "Ver todos"}
            onAction={filtro === "todos" ? undefined : () => setFiltro("todos")}
          />
        )}

        {/* Mobile: cards */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {filas.map((p) => (
            <NextLink
              key={p.folio}
              href={`/admin/pedidos/${p.folio}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-fondo p-3 no-underline"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[15px] font-bold text-text-strong">{p.folio}</span>
                  <Badge tone={estadoDe(p).tono}>{estadoDe(p).etiqueta}</Badge>
                </div>
                <span className="text-[12px] font-medium text-text-muted">
                  {fecha(p.creado_en)} · {p.piezas} {p.piezas === 1 ? "pieza" : "piezas"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Precio centavos={p.total_mxn} size="sm" />
                <Icono name="chevron-right" size={18} color="var(--color-text-muted)" />
              </div>
            </NextLink>
          ))}
        </div>

        {/* Desktop: tabla */}
        {filas.length > 0 && (
          <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
            <div className="grid grid-cols-[1fr_1.4fr_0.8fr_1fr_1.2fr_88px] items-center gap-4 bg-surface-muted px-5 py-3">
              {["Folio", "Fecha", "Piezas", "Total", "Estado", ""].map((h, i) => (
                <span
                  key={`${h}-${i}`}
                  className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-muted"
                >
                  {h}
                </span>
              ))}
            </div>
            {filas.map((p) => (
              <div
                key={p.folio}
                className="grid grid-cols-[1fr_1.4fr_0.8fr_1fr_1.2fr_88px] items-center gap-4 border-t border-border px-5 py-3.5"
              >
                <span className="text-[14px] font-bold text-text-strong">{p.folio}</span>
                <span className="text-[14px] font-medium text-text-muted">{fecha(p.creado_en)}</span>
                <span className="text-[14px] font-semibold text-text-strong">{p.piezas}</span>
                <Precio centavos={p.total_mxn} size="sm" />
                <span>
                  <Badge tone={estadoDe(p).tono}>{estadoDe(p).etiqueta}</Badge>
                </span>
                <NextLink
                  href={`/admin/pedidos/${p.folio}`}
                  className="text-[13px] font-semibold text-outline-text hover:underline"
                >
                  Ver detalle
                </NextLink>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {datos !== null && datos.total > datos.por_pagina && (
          <div className="flex items-center justify-center gap-3 py-2">
            <Boton
              variant="secondary"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((n) => Math.max(n - 1, 1))}
            >
              Anterior
            </Boton>
            <span className="text-[13px] font-semibold text-text-muted">
              Página {pagina} de {paginas} · {datos.total} pedidos
            </span>
            <Boton
              variant="secondary"
              size="sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina((n) => Math.min(n + 1, paginas))}
            >
              Siguiente
            </Boton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Detalle (/admin/pedidos/[folio]) ── */

export function PedidoDetalle({ folio }: { folio: string }) {
  const [pedido, setPedido] = useState<PedidoAdminDetalle | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);

  useEffect(() => {
    const control = new AbortController();
    fetch(`/api/admin/pedidos/${encodeURIComponent(folio)}`, { signal: control.signal })
      .then((r) => (r.ok ? (r.json() as Promise<PedidoAdminDetalle>) : Promise.reject(r.status)))
      .then(setPedido)
      .catch((causa) => {
        if (!(causa instanceof DOMException)) setNoEncontrado(true);
      });
    return () => control.abort();
  }, [folio]);

  if (noEncontrado) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BarraAdmin title="Pedido" />
        <NavAdmin activa="pedidos" />
        <div className="flex flex-1 items-center p-4">
          <EstadoVacio
            icon="alert"
            title="No encontramos ese pedido"
            message="El folio no existe o fue escrito con un error."
            actionLabel="Volver a pedidos"
            actionHref="/admin/pedidos"
          />
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BarraAdmin title="Pedido" />
        <NavAdmin activa="pedidos" />
      </div>
    );
  }

  const estado = ESTADOS[pedido.estado];
  // Teléfono a 10 dígitos (validación del checkout) → wa.me pide país: 52 (MX).
  const urlWhatsApp = pedido.telefono_contacto
    ? `https://wa.me/52${pedido.telefono_contacto}?text=${encodeURIComponent(
        `Hola, te escribimos de Lizzy & Stephy por tu pedido ${pedido.folio}, para coordinar la entrega.`
      )}`
    : null;

  const abrirWhatsApp = () => {
    if (urlWhatsApp) window.open(urlWhatsApp, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraAdmin title={`Pedido ${pedido.folio}`} />
      <NavAdmin activa="pedidos" />
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-4 p-4 lg:p-6">
        <NextLink
          href="/admin/pedidos"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-outline-text hover:underline"
        >
          <Icono name="chevron-left" size={16} /> Todos los pedidos
        </NextLink>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone={estado.tono}>{estado.etiqueta}</Badge>
          <span className="text-[13px] font-medium text-text-muted">{fecha(pedido.creado_en)}</span>
        </div>

        {/* Items con precios congelados */}
        <div className="overflow-hidden rounded-lg border border-border">
          {pedido.items.map((item) => (
            <div
              key={item.variante.id}
              className="flex items-center gap-3 border-b border-border p-3 last:border-b-0"
            >
              <div
                className="foto-placeholder h-11 w-11 shrink-0 rounded-md"
                style={
                  item.variante.producto.fotos[0]
                    ? {
                        backgroundImage: `url(${item.variante.producto.fotos[0]})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-bold text-text-strong">
                  {item.variante.producto.nombre_tono} · {item.variante.largo_pulgadas}&quot;
                </span>
                <span className="text-[12px] font-medium text-text-muted">
                  {item.variante.sku} · {item.cantidad} ×{" "}
                  {(item.precio_unitario_congelado / 100).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </span>
              </div>
              <Precio centavos={item.cantidad * item.precio_unitario_congelado} size="sm" />
            </div>
          ))}
          <div className="flex items-center justify-between bg-surface-muted px-3 py-3">
            <span className="text-[14px] font-bold text-text-strong">Total</span>
            <Precio centavos={pedido.total_mxn} />
          </div>
        </div>

        {/* Contacto de la compradora — solo visible en el panel (nunca en el GET público) */}
        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <span className="text-eyebrow font-bold uppercase tracking-[0.1em] text-secundario">
            Contacto de la compradora
          </span>
          {pedido.cuenta && (
            <span className="text-[14px] font-semibold text-text-strong">{pedido.cuenta.nombre}</span>
          )}
          <span className="text-[14px] font-medium text-text-muted">{pedido.email_contacto}</span>
          {pedido.telefono_contacto ? (
            <>
              <span className="text-[14px] font-medium text-text-muted">
                {pedido.telefono_contacto.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3")}
              </span>
              <Boton variant="whatsapp" onClick={abrirWhatsApp}>
                Coordinar entrega por WhatsApp
              </Boton>
            </>
          ) : (
            <span className="text-[13px] font-medium text-text-muted">
              No dejó teléfono — contáctala por correo.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
