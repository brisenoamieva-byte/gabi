"use client";

import { Eye, Globe, MessageCircle, Phone, Radio, Share2 } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ProspectoListRow } from "@/lib/admin/prospectos-service";
import {
  calificacionColor,
  calificacionLabel,
  normalizeLeadNombre,
  scoreBadgeColor,
} from "@/lib/comercial/xperience-leads";

type LeadsXperienceTableProps = {
  prospectos: ProspectoListRow[];
  desarrollos: Desarrollo[];
  onSelect: (id: string) => void;
};

const formatLeadDateTime = (iso: string) => {
  const date = new Date(iso);
  return {
    fecha: date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    hora: date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

function CanalIcon({ canal }: { canal?: string | null }) {
  const value = (canal ?? "").toLowerCase();
  if (value.includes("facebook")) {
    return <Share2 className="h-4 w-4 text-blue-600" />;
  }
  if (value.includes("instagram")) {
    return <Globe className="h-4 w-4 text-pink-600" />;
  }
  if (value.includes("whatsapp") || value.includes("mensajes")) {
    return <MessageCircle className="h-4 w-4 text-emerald-600" />;
  }
  if (value.includes("tel") || value.includes("llamada")) {
    return <Phone className="h-4 w-4 text-slate-600" />;
  }
  return <Radio className="h-4 w-4 text-slate-400" />;
}

export function LeadsXperienceTable({
  prospectos,
  desarrollos,
  onSelect,
}: LeadsXperienceTableProps) {
  const desarrolloNombre = (row: ProspectoListRow) =>
    row.producto_nombre ??
    desarrollos.find((item) => item.id === row.desarrollo_id)?.nombre ??
    row.desarrollo_id;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Acciones</th>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Producto / Campaña / Canal</th>
            <th className="px-4 py-3">Nombre / Correo / Teléfono</th>
            <th className="px-4 py-3">Región</th>
            <th className="px-4 py-3">Vendedor</th>
            <th className="px-4 py-3">Asignado por</th>
            <th className="px-4 py-3">Calificación</th>
            <th className="px-4 py-3">iScore</th>
            <th className="px-4 py-3">seller</th>
          </tr>
        </thead>
        <tbody>
          {prospectos.map((row) => {
            const { fecha, hora } = formatLeadDateTime(row.created_at);
            const canal = row.campanaCanal ?? row.medio_contacto;

            return (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white"
                    aria-label="Ver lead"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {row.xperience_id ?? row.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p>{fecha}</p>
                  <p className="text-xs text-slate-400">{hora}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <CanalIcon canal={canal} />
                    <div>
                      <p className="font-semibold text-gabi-forest">{desarrolloNombre(row)}</p>
                      <p className="text-slate-600">{row.campanaNombre ?? "—"}</p>
                      <p className="text-xs text-slate-400">{canal ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gabi-forest">
                    {normalizeLeadNombre(row.nombre)}
                  </p>
                  <p className="truncate text-slate-600">{row.email ?? "—"}</p>
                  <p className="text-slate-600">{row.telefono ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.origen_ciudad ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{row.asesorNombre ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.asignado_por ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${calificacionColor(row.calificacion)}`}
                  >
                    {calificacionLabel(row.calificacion)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex min-w-8 justify-center rounded px-2 py-1 text-xs font-bold ${scoreBadgeColor(row.iscore)}`}
                  >
                    {row.iscore ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex min-w-8 justify-center rounded px-2 py-1 text-xs font-bold ${scoreBadgeColor(row.seller_score)}`}
                  >
                    {row.seller_score ?? "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const exportLeadsCsv = (
  prospectos: ProspectoListRow[],
  desarrollos: Desarrollo[],
) => {
  const desarrolloNombre = (row: ProspectoListRow) =>
    row.producto_nombre ??
    desarrollos.find((item) => item.id === row.desarrollo_id)?.nombre ??
    row.desarrollo_id;

  const headers = [
    "id",
    "Fecha",
    "Hora",
    "Producto",
    "Campaña",
    "Canal",
    "Nombre",
    "Correo",
    "Teléfono",
    "Comentarios",
    "Vendedor",
    "Asignado Por",
    "iScore",
    "sellerScore",
    "Calificación",
  ];

  const escape = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = prospectos.map((row) => {
    const date = new Date(row.created_at);
    return [
      row.xperience_id ?? row.id,
      date.toISOString().slice(0, 10),
      date.toTimeString().slice(0, 8),
      desarrolloNombre(row),
      row.campanaNombre ?? "",
      row.campanaCanal ?? "",
      normalizeLeadNombre(row.nombre),
      row.email ?? "",
      row.telefono ?? "",
      row.notas ?? "",
      row.asesorNombre ?? "",
      row.asignado_por ?? "",
      row.iscore ?? "",
      row.seller_score ?? "",
      calificacionLabel(row.calificacion),
    ]
      .map(escape)
      .join(",");
  });

  return [headers.join(","), ...lines].join("\n");
};
