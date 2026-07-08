"use client";

import { Bell, Loader2, ShoppingBag } from "lucide-react";
import type { SolicitudApartadoRow } from "@/lib/comercial/solicitud-apartado-service";

type SolicitudesApartadoBannerProps = {
  solicitudes: SolicitudApartadoRow[];
  loading?: boolean;
  onOpenProspecto: (prospectoId: string) => void;
};

function formatSolicitudFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

export function SolicitudesApartadoBanner({
  solicitudes,
  loading,
  onOpenProspecto,
}: SolicitudesApartadoBannerProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Solicitudes de apartado…
      </div>
    );
  }

  if (!solicitudes.length) {
    return null;
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-black">
              Solicitudes de apartado pendientes ({solicitudes.length})
            </p>
            <p className="mt-0.5 text-[11px] opacity-90">
              Pulsa una fila para abrir el lead y registrar el apartado en sembrado.
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5">
        {solicitudes.map((solicitud) => (
          <li key={solicitud.id}>
            <button
              type="button"
              onClick={() => onOpenProspecto(solicitud.prospecto_id)}
              className="flex w-full items-start justify-between gap-3 rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2 text-left text-xs transition hover:border-amber-300 hover:bg-white"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-gabi-forest">
                  {solicitud.prospectoNombre ?? "Prospecto"}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-600">
                  {solicitud.asesorNombre ?? "Asesor"}
                  {solicitud.unidadNumero ? ` · unidad ${solicitud.unidadNumero}` : ""}
                  {solicitud.notas ? ` · ${solicitud.notas}` : ""}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-amber-900">
                {formatSolicitudFecha(solicitud.created_at)}
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
