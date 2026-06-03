"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, Users } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { LeadsReporte } from "@/lib/admin/leads-reporte-service";
import {
  PROSPECTO_ETAPAS,
  prospectoEtapaLabel,
} from "@/lib/comercial/prospecto-etapas";

type LeadsReportePanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

type AsesorOption = {
  id: string;
  nombre: string;
};

type CampanaOption = {
  id: string;
  nombre: string;
};

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
};

function LeadsBarChart({ series }: { series: LeadsReporte["porDia"] }) {
  const max = Math.max(...series.map((item) => item.total), 1);
  const visible = series.length > 31 ? series.filter((_, index) => index % Math.ceil(series.length / 31) === 0) : series;

  if (!series.length) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">Sin leads en el periodo seleccionado.</p>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex h-52 items-end gap-1 border-b border-slate-100 pb-1">
        {visible.map((item) => {
          const heightPct = item.total ? Math.max((item.total / max) * 100, 6) : 0;
          return (
            <div
              key={item.fecha}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${item.fecha}: ${item.total} leads`}
            >
              <span className="text-[10px] font-bold text-gabi-forest opacity-0 transition group-hover:opacity-100">
                {item.total || ""}
              </span>
              <div
                className="w-full max-w-8 rounded-t bg-gabi-forest transition hover:bg-gabi-forest-light"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {visible.map((item) => (
          <div key={`${item.fecha}-label`} className="min-w-0 flex-1 truncate text-center text-[9px] text-slate-400">
            {item.fecha.slice(8)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeadsReportePanel({ desarrollos, scopeLabel }: LeadsReportePanelProps) {
  const monthRange = useMemo(() => currentMonthRange(), []);
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [desde, setDesde] = useState(monthRange.desde);
  const [hasta, setHasta] = useState(monthRange.hasta);
  const [asesorFilter, setAsesorFilter] = useState("");
  const [campanaFilter, setCampanaFilter] = useState("");
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [campanas, setCampanas] = useState<CampanaOption[]>([]);
  const [reporte, setReporte] = useState<LeadsReporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedDesarrollo = useMemo(
    () => desarrollos.find((item) => item.id === desarrolloId),
    [desarrolloId, desarrollos],
  );

  const loadAsesores = useCallback(async () => {
    if (!desarrolloId) {
      return;
    }
    try {
      const params = new URLSearchParams({ desarrolloId });
      const response = await fetch(`/api/admin/asesores?${params.toString()}`);
      const data = (await response.json()) as { asesores?: AsesorOption[] };
      setAsesores(data.asesores ?? []);
    } catch {
      setAsesores([]);
    }
  }, [desarrolloId]);

  const loadCampanas = useCallback(async () => {
    if (!desarrolloId) {
      return;
    }
    try {
      const params = new URLSearchParams({ desarrolloId, activoOnly: "1" });
      const response = await fetch(`/api/admin/campanas?${params.toString()}`);
      const data = (await response.json()) as { campanas?: CampanaOption[] };
      setCampanas(data.campanas ?? []);
    } catch {
      setCampanas([]);
    }
  }, [desarrolloId]);

  const loadReporte = useCallback(async () => {
    if (!desarrolloId) {
      setReporte(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId, desde, hasta });
      if (asesorFilter) {
        params.set("asesorId", asesorFilter);
      }
      if (campanaFilter) {
        params.set("campanaId", campanaFilter);
      }

      const response = await fetch(`/api/admin/reportes/leads?${params.toString()}`);
      const data = (await response.json()) as { reporte?: LeadsReporte; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el reporte.");
      }

      setReporte(data.reporte ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setReporte(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, desde, hasta, asesorFilter, campanaFilter]);

  useEffect(() => {
    void loadAsesores();
    void loadCampanas();
    setAsesorFilter("");
    setCampanaFilter("");
  }, [loadAsesores, loadCampanas]);

  useEffect(() => {
    void loadReporte();
  }, [loadReporte]);

  const kpis = useMemo(() => {
    if (!reporte) {
      return [];
    }
    return [
      { label: "Leads totales", value: reporte.total, icon: Users },
      {
        label: "Cotizaciones",
        value: reporte.cotizaciones,
        icon: BarChart3,
      },
      {
        label: "En negociación+",
        value:
          (reporte.porEtapa.negociacion ?? 0) +
          (reporte.porEtapa.apartado ?? 0) +
          (reporte.porEtapa.vendido ?? 0),
        icon: BarChart3,
      },
      {
        label: "Apartados / vendidos",
        value: (reporte.porEtapa.apartado ?? 0) + (reporte.porEtapa.vendido ?? 0),
        icon: Users,
      },
    ];
  }, [reporte]);

  if (!desarrollos.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">Reportes</p>
        <h2 className="mt-2 text-2xl font-black text-gabi-forest">Leads</h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-gabi-forest/5 px-3 py-1 text-xs font-semibold text-gabi-forest">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Volumen de prospectos y cotizaciones por periodo — similar al reporte de Xperience.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px] text-sm">
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
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block min-w-[180px] text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Asesor</span>
            <select
              value={asesorFilter}
              onChange={(event) => setAsesorFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todos</option>
              {asesores.map((asesor) => (
                <option key={asesor.id} value={asesor.id}>
                  {asesor.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[180px] text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Campaña</span>
            <select
              value={campanaFilter}
              onChange={(event) => setCampanaFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todas</option>
              {campanas.map((campana) => (
                <option key={campana.id} value={campana.id}>
                  {campana.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadReporte()}
            className="rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white"
          >
            Aplicar
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gabi-forest/10 bg-white p-12 text-gabi-forest">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Cargando reporte…</span>
        </div>
      ) : reporte ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-gabi-forest">{item.value}</p>
                <p className="mt-1 text-xs text-slate-400">{selectedDesarrollo?.nombre}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black text-gabi-forest">Leads por día</h3>
              <span className="text-xs text-slate-500">
                {desde} → {hasta}
              </span>
            </div>
            <LeadsBarChart series={reporte.porDia} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-gabi-forest">Por etapa</h3>
              <div className="mt-4 space-y-2">
                {PROSPECTO_ETAPAS.filter((etapa) => (reporte.porEtapa[etapa] ?? 0) > 0).map((etapa) => (
                  <div
                    key={etapa}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-gabi-forest">
                      {prospectoEtapaLabel[etapa]}
                    </span>
                    <span className="text-sm font-bold text-gabi-sand">{reporte.porEtapa[etapa]}</span>
                  </div>
                ))}
                {!Object.keys(reporte.porEtapa).length ? (
                  <p className="text-sm text-slate-500">Sin leads en el periodo.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-gabi-forest">Por asesor</h3>
              {reporte.porAsesor.length ? (
                <div className="mt-4 space-y-2">
                  {reporte.porAsesor.map((item) => (
                    <div
                      key={item.asesorId ?? "sin-asesor"}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-gabi-forest">{item.asesorNombre}</span>
                      <span className="text-sm font-bold text-gabi-sand">{item.total} leads</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Sin leads en el periodo.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
