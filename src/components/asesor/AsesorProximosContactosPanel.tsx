"use client";

import Link from "next/link";
import { Bell, CalendarClock, Phone } from "lucide-react";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import type { ProximoContactoHoyItem } from "@/lib/comercial/proximo-contacto";

type AsesorProximosContactosPanelProps = {
  items: ProximoContactoHoyItem[];
};

const formatFechaMx = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function AsesorProximosContactosPanel({ items }: AsesorProximosContactosPanelProps) {
  if (!items.length) {
    return null;
  }

  const overdue = items.filter((item) => item.isOverdue).length;

  return (
    <div className="mt-3 rounded-xl border border-sky-400/25 bg-sky-400/10 p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <Bell className="h-4 w-4 shrink-0 text-sky-200" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sky-50">
            Volver a contactar ({items.length})
          </p>
          <p className="text-[11px] text-sky-100/70">
            {overdue > 0
              ? `${overdue} vencido(s) · el resto es para hoy`
              : "Prospectos que pidieron seguimiento en esta fecha"}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 6).map((item) => (
          <li key={item.prospectoId}>
            <Link
              href={`/mis-leads?prospecto=${encodeURIComponent(item.prospectoId)}`}
              className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 transition hover:bg-white/[0.1]"
            >
              <CalendarClock
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  item.isOverdue ? "text-amber-300" : "text-sky-200"
                }`}
                strokeWidth={2}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{item.nombre}</p>
                <p className="mt-0.5 text-[11px] text-white/55">
                  {prospectoEtapaLabel[item.etapa as ProspectoEtapa] ?? item.etapa}
                  {" · "}
                  {item.isOverdue ? "Venció " : "Hoy · "}
                  {formatFechaMx(item.proximoContactoOn)}
                </p>
                {item.proximoContactoNota ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-white/45">
                    {item.proximoContactoNota}
                  </p>
                ) : null}
              </div>
              {item.telefono ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80">
                  <Phone className="h-3 w-3" strokeWidth={2} />
                  Llamar
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {items.length > 6 ? (
        <p className="mt-2 text-center text-[11px] text-sky-100/60">
          +{items.length - 6} más en Mis leads
        </p>
      ) : null}
    </div>
  );
}
