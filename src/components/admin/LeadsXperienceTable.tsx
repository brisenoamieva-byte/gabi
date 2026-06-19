"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  Footprints,
  Globe,
  MessageCircle,
  Phone,
  Radio,
  Share2,
} from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ProspectoListRow } from "@/lib/admin/prospectos-service";
import {
  calificacionColor,
  calificacionDisplayLabel,
  normalizeLeadNombre,
  scoreBadgeColor,
  tipoAsignacionBadgeClass,
  tipoAsignacionLabel,
} from "@/lib/comercial/xperience-leads";
import { formatXperienceLeadId } from "@/lib/comercial/xperience-catalog-ids";

type LeadsXperienceTableProps = {
  prospectos: ProspectoListRow[];
  desarrollos: Desarrollo[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
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
    return <Share2 className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />;
  }
  if (value.includes("instagram")) {
    return <Globe className="h-4 w-4 shrink-0 text-pink-600" aria-hidden />;
  }
  if (value.includes("whatsapp") || value.includes("mensajes")) {
    return <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (value.includes("piso") || value.includes("walk") || value.includes("directo")) {
    return <Footprints className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />;
  }
  if (value.includes("tel") || value.includes("llamada")) {
    return <Phone className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />;
  }
  return <Radio className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />;
}

export function LeadsXperienceTable({
  prospectos,
  desarrollos,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelect,
}: LeadsXperienceTableProps) {
  const allIds = useMemo(() => prospectos.map((row) => row.id), [prospectos]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const [tableSearch, setTableSearch] = useState("");

  const desarrolloNombre = (row: ProspectoListRow) =>
    row.producto_nombre ??
    desarrollos.find((item) => item.id === row.desarrollo_id)?.nombre ??
    row.desarrollo_id;

  const visibleRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) {
      return prospectos;
    }
    return prospectos.filter((row) => {
      const haystack = [
        row.nombre,
        row.email,
        row.telefono,
        row.asesorNombre,
        row.campanaNombre,
        row.campanaCanal,
        row.origen_ciudad,
        String(row.xperience_id ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [prospectos, tableSearch]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <p className="text-xs font-semibold text-slate-500">
          {visibleRows.length} fila{visibleRows.length === 1 ? "" : "s"}
          {selectedIds.size ? ` · ${selectedIds.size} seleccionado(s)` : ""}
        </p>
        <input
          type="search"
          value={tableSearch}
          onChange={(event) => setTableSearch(event.target.value)}
          placeholder="Buscar en tabla…"
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-gabi-forest focus:ring-1 focus:ring-gabi-forest/20"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">
                <span className="sr-only">Acciones</span>
              </th>
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleSelectAll(allIds)}
                  className="rounded border-slate-300"
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">Fecha</th>
              <th className="px-3 py-2.5">Producto / Campaña / Canal</th>
              <th className="px-3 py-2.5">Nombre / Correo / Teléfono</th>
              <th className="px-3 py-2.5">Región</th>
              <th className="px-3 py-2.5">Vendedor</th>
              <th className="px-3 py-2.5">Tipo de Asignación</th>
              <th className="px-3 py-2.5">Calificación</th>
              <th className="px-3 py-2.5">Scores</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const { fecha, hora } = formatLeadDateTime(row.created_at);
              const canal = row.campanaCanal ?? row.medio_contacto;
              const calificacionText = calificacionDisplayLabel(row.calificacion);

              return (
                <tr
                  key={row.id}
                  className={`border-t border-slate-100 hover:bg-slate-50/80 ${
                    row.es_duplicado ? "bg-amber-50/40" : ""
                  } ${selectedIds.has(row.id) ? "bg-gabi-forest/[0.03]" : ""}`}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-white"
                      aria-label="Ver lead"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => onToggleSelect(row.id)}
                      className="rounded border-slate-300"
                      aria-label={`Seleccionar lead ${row.xperience_id ?? row.id}`}
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">
                    {formatXperienceLeadId(row.xperience_id) ?? (
                      <span className="text-slate-400" title={`Lead GABI · ${row.id}`}>
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    <p className="whitespace-nowrap">{fecha}</p>
                    <p className="text-[10px] text-slate-400">{hora}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <CanalIcon canal={canal} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gabi-forest">{desarrolloNombre(row)}</p>
                        <p className="text-slate-600">{row.campanaNombre ?? "—"}</p>
                        <p className="truncate text-[10px] text-slate-400">{canal ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-gabi-forest">
                      {normalizeLeadNombre(row.nombre)}
                      {row.es_duplicado ? (
                        <span className="ml-1.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                          Dup
                        </span>
                      ) : null}
                    </p>
                    <p className="max-w-[220px] truncate text-slate-600">{row.email ?? "—"}</p>
                    <p className="text-slate-600">{row.telefono ?? "—"}</p>
                  </td>
                  <td className="max-w-[140px] px-3 py-2 text-slate-600">
                    <p className="line-clamp-2">{row.origen_ciudad ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.asesorNombre ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${tipoAsignacionBadgeClass(row.asignado_por)}`}
                    >
                      {tipoAsignacionLabel(row.asignado_por)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex max-w-[160px] rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${calificacionColor(row.calificacion)}`}
                      title={calificacionText}
                    >
                      <span className="truncate">{calificacionText}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeColor(row.iscore)}`}
                        title="iScore"
                      >
                        {row.iscore ?? "—"}
                      </span>
                      <span
                        className={`inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeColor(row.seller_score)}`}
                        title="sellerScore"
                      >
                        {row.seller_score ?? "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
    "Región",
    "Comentarios",
    "Vendedor",
    "Tipo Asignación",
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
      formatXperienceLeadId(row.xperience_id) ?? "",
      date.toISOString().slice(0, 10),
      date.toTimeString().slice(0, 8),
      desarrolloNombre(row),
      row.campanaNombre ?? "",
      row.campanaCanal ?? "",
      normalizeLeadNombre(row.nombre),
      row.email ?? "",
      row.telefono ?? "",
      row.origen_ciudad ?? "",
      row.notas ?? "",
      row.asesorNombre ?? "",
      tipoAsignacionLabel(row.asignado_por),
      row.iscore ?? "",
      row.seller_score ?? "",
      calificacionDisplayLabel(row.calificacion),
    ]
      .map(escape)
      .join(",");
  });

  return [headers.join(","), ...lines].join("\n");
};
