"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";
import { downloadAdminExport } from "@/lib/admin/download-excel-client";
import { canAccessInventarioApi, canAccessModule } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";

type ExportacionesAdminPanelProps = {
  desarrollos: Desarrollo[];
  profile: AdminProfile;
  scopeLabel?: string;
};

type ExportItem = {
  id: string;
  label: string;
  description: string;
  path: (desarrolloId: string) => string;
  filename: (desarrolloId: string) => string;
  allowed: boolean;
};

export function ExportacionesAdminPanel({
  desarrollos,
  profile,
  scopeLabel,
}: ExportacionesAdminPanelProps) {
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const items = useMemo<ExportItem[]>(
    () =>
      [
        {
          id: "prospectos",
          label: "Prospectos / Leads",
          description: "CRM completo del desarrollo (IDs, etapas, asesores, campañas).",
          path: (id: string) => `/api/admin/prospectos/export?desarrolloId=${encodeURIComponent(id)}`,
          filename: (id: string) => `prospectos-${id}.xlsx`,
          allowed: canAccessModule(profile, "leads"),
        },
        {
          id: "sembrado",
          label: "Sembrado",
          description: "Unidades, operaciones y cobranza mensual (3 hojas).",
          path: (id: string) => `/api/admin/sembrado/export?desarrolloId=${encodeURIComponent(id)}`,
          filename: (id: string) => `sembrado-${id}.xlsx`,
          allowed: canAccessModule(profile, "sembrado"),
        },
        {
          id: "inventario",
          label: "Inventario",
          description: "Unidades de disponibilidad (incluye inactivas).",
          path: (id: string) => `/api/admin/inventario/export?desarrolloId=${encodeURIComponent(id)}`,
          filename: (id: string) => `inventario-${id}.xlsx`,
          allowed: canAccessInventarioApi(profile),
        },
        {
          id: "expedientes",
          label: "Expedientes",
          description: "Resumen de formalización y enganche por operación.",
          path: (id: string) => `/api/admin/expedientes/export?desarrolloId=${encodeURIComponent(id)}`,
          filename: (id: string) => `expedientes-${id}.xlsx`,
          allowed: canAccessModule(profile, "expedientes"),
        },
        {
          id: "campanas",
          label: "Campañas",
          description: "Canales de captación del desarrollo.",
          path: (id: string) => `/api/admin/campanas/export?desarrolloId=${encodeURIComponent(id)}`,
          filename: (id: string) => `campanas-${id}.xlsx`,
          allowed: canAccessModule(profile, "leads"),
        },
        {
          id: "partners",
          label: "Alianzas / Partners",
          description: "Inmobiliarias y asesores externos de la comercializadora.",
          path: (id: string) => `/api/admin/partners/export?desarrolloId=${encodeURIComponent(id)}`,
          filename: (id: string) => `partners-${id}.xlsx`,
          allowed: canAccessModule(profile, "leads"),
        },
      ].filter((item) => item.allowed),
    [profile],
  );

  const handleExport = async (item: ExportItem) => {
    if (!desarrolloId) {
      setError("Selecciona un desarrollo.");
      return;
    }
    setError("");
    setSuccess("");
    setExportingId(item.id);
    try {
      await downloadAdminExport(item.path(desarrolloId), item.filename(desarrolloId));
      setSuccess(`${item.label} descargado.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Error al exportar.");
    } finally {
      setExportingId(null);
    }
  };

  const handleExportAll = async () => {
    if (!desarrolloId) {
      setError("Selecciona un desarrollo.");
      return;
    }
    setError("");
    setSuccess("");
    for (const item of items) {
      setExportingId(item.id);
      try {
        await downloadAdminExport(item.path(desarrolloId), item.filename(desarrolloId));
      } catch (exportError) {
        setError(
          exportError instanceof Error
            ? `${item.label}: ${exportError.message}`
            : `Error al exportar ${item.label}.`,
        );
        setExportingId(null);
        return;
      }
    }
    setExportingId(null);
    setSuccess(`Se descargaron ${items.length} archivos Excel.`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
          Migración
        </p>
        <h2 className="text-2xl font-black text-gabi-forest">Exportar datos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Descarga bases comerciales en Excel (.xlsx) para respaldo o migración
          {scopeLabel ? ` · ${scopeLabel}` : ""}
        </p>

        <label className="mt-5 block max-w-sm text-sm">
          <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
          <select
            value={desarrolloId}
            onChange={(event) => setDesarrolloId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {desarrollos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleExportAll()}
            disabled={!desarrolloId || Boolean(exportingId) || !items.length}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {exportingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar todo (Fase 1)
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="text-sm font-bold text-gabi-forest">{item.label}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.description}</p>
            <button
              type="button"
              onClick={() => void handleExport(item)}
              disabled={!desarrolloId || Boolean(exportingId)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gabi-forest/20 px-3 py-1.5 text-xs font-bold text-gabi-forest disabled:opacity-50"
            >
              {exportingId === item.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Exportar Excel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
