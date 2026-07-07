"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Send,
  X,
} from "lucide-react";
import type { GuardiaAsignacionRecord, GuardiaConflicto } from "@/lib/admin/guardias-service";
import type { AsesorRecord } from "@/lib/asesores/types";
import type { DesarrolloRecord } from "@/lib/catalog/types";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";
import { GuardiasMarcajesHoyPanel } from "@/components/admin/GuardiasMarcajesHoyPanel";
import {
  formatDayHeader,
  formatWeekRangeLabel,
  getWeekStartMonday,
  guardiaAsesorChipStyle,
  guardiaEstadoLabel,
  guardiaTurnoLabel,
  guardiaTurnoShortLabel,
  GUARDIA_TURNOS,
  GUARDIAS_MARCAJES_DESARROLLO_IDS,
  GUARDIAS_PILOT_DESARROLLO_ID,
  shiftWeekStart,
  type GuardiaTurno,
} from "@/lib/comercial/guardias";

type GuardiasAdminPanelProps = {
  desarrollos: DesarrolloRecord[];
  scopeLabel: string;
  initialDesarrolloId?: string;
};

type WeekPayload = {
  weekStart: string;
  weekDates: string[];
  asignaciones: GuardiaAsignacionRecord[];
  asesorCounts: Record<string, number>;
  coverage: { totalSlots: number; filledSlots: number; publishedSlots: number };
};

const DRAG_ASESOR_KEY = "guardias-asesor-id";

export function GuardiasAdminPanel({
  desarrollos,
  scopeLabel,
  initialDesarrolloId,
}: GuardiasAdminPanelProps) {
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos, {
    urlDesarrolloId: initialDesarrolloId,
    fallbackDesarrolloId: GUARDIAS_PILOT_DESARROLLO_ID,
  });
  const [weekStart, setWeekStart] = useState(getWeekStartMonday());
  const [week, setWeek] = useState<WeekPayload | null>(null);
  const [asesores, setAsesores] = useState<AsesorRecord[]>([]);
  const [conflictos, setConflictos] = useState<GuardiaConflicto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const asesorNames = useMemo(
    () => Object.fromEntries(asesores.map((a) => [a.id, a.nombre])),
    [asesores],
  );

  const slotMap = useMemo(() => {
    const map = new Map<string, GuardiaAsignacionRecord>();
    for (const item of week?.asignaciones ?? []) {
      map.set(`${item.fecha}|${item.turno}`, item);
    }
    return map;
  }, [week]);

  const loadWeek = useCallback(async () => {
    if (!desarrolloId) {
      setWeek(null);
      setAsesores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        desarrolloId,
        weekStart,
      });
      const response = await fetch(`/api/admin/guardias?${params}`);
      const data = (await response.json()) as {
        week?: WeekPayload;
        asesores?: AsesorRecord[];
        conflictos?: GuardiaConflicto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el calendario.");
      }

      setWeek(data.week ?? null);
      setAsesores(data.asesores ?? []);
      setConflictos(data.conflictos ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
      setWeek(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, weekStart]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  const assignAsesor = async (asesorId: string, fecha: string, turno: GuardiaTurno) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/guardias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desarrolloId, asesorId, fecha, turno }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo asignar.");
      }

      await loadWeek();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Error al asignar");
    } finally {
      setSaving(false);
    }
  };

  const clearSlot = async (fecha: string, turno: GuardiaTurno) => {
    setSaving(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId, fecha, turno });
      const response = await fetch(`/api/admin/guardias/slot?${params}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo quitar la guardia.");
      }

      await loadWeek();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Error al quitar");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWeek = async () => {
    setCopying(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/guardias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copyWeek", desarrolloId, weekStart }),
      });
      const data = (await response.json()) as {
        copied?: number;
        skipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo copiar la semana.");
      }

      const copied = data.copied ?? 0;
      const skipped = data.skipped ?? 0;
      if (copied > 0) {
        setWeekStart((prev) => shiftWeekStart(prev, 1));
      }
      setSuccess(
        copied
          ? `Semana copiada a la siguiente (${copied} turno${copied === 1 ? "" : "s"}${skipped ? `, ${skipped} omitidos` : ""}).`
          : "No hay guardias en esta semana para copiar.",
      );
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Error al copiar");
    } finally {
      setCopying(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/guardias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", desarrolloId, weekStart }),
      });
      const data = (await response.json()) as { updated?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo publicar.");
      }

      setSuccess(
        data.updated
          ? `Semana publicada (${data.updated} guardia${data.updated === 1 ? "" : "s"}).`
          : "No hay guardias en borrador para publicar.",
      );
      await loadWeek();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Error al publicar");
    } finally {
      setPublishing(false);
    }
  };

  const handleDropOnSlot = (fecha: string, turno: GuardiaTurno, asesorId: string) => {
    if (!asesorId) {
      return;
    }
    void assignAsesor(asesorId, fecha, turno);
  };

  const desarrolloNombre =
    desarrollos.find((d) => d.id === desarrolloId)?.nombre ?? desarrolloId;

  const coveragePct = week
    ? Math.round((week.coverage.filledSlots / week.coverage.totalSlots) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">
            Operación · Oficina de ventas
          </p>
          <h2 className="text-2xl font-black text-gabi-forest">Calendario de guardias</h2>
          <p className="mt-1 text-sm text-slate-500">
            {scopeLabel} · Arrastra asesores a cada turno (matutino y vespertino).
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px]">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Desarrollo
            </span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="input-cotizador w-full"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1">
            <button
              type="button"
              onClick={() => setWeekStart((prev) => shiftWeekStart(prev, -1))}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[10rem] px-2 text-center text-sm font-bold text-gabi-forest">
              {formatWeekRangeLabel(weekStart)}
            </div>
            <button
              type="button"
              onClick={() => setWeekStart((prev) => shiftWeekStart(prev, 1))}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(getWeekStartMonday())}
              className="ml-1 rounded-lg px-2 py-1 text-xs font-bold text-gabi-forest hover:bg-gabi-forest/5"
            >
              Hoy
            </button>
          </div>

          <button
            type="button"
            disabled={copying || loading || !desarrolloId}
            onClick={() => void handleCopyWeek()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-gabi-forest disabled:opacity-50"
          >
            {copying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copiar a siguiente semana
          </button>

          <button
            type="button"
            disabled={publishing || loading || !desarrolloId}
            onClick={() => void handlePublish()}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar semana
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      <GuardiasMarcajesHoyPanel desarrolloId={desarrolloId} />

      {conflictos.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">Conflictos de guardia</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {conflictos.map((c) => (
              <li key={`${c.asesorId}-${c.fecha}-${c.turno}`}>
                {asesorNames[c.asesorId] ?? c.asesorId} también asignado en{" "}
                <strong>{c.otroDesarrolloId}</strong> ({c.fecha}, {c.turno})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Equipo · {desarrolloNombre}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Arrastra al calendario</p>

            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            ) : asesores.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">Sin asesores activos en este desarrollo.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {asesores.map((asesor) => {
                  const count = week?.asesorCounts[asesor.id] ?? 0;
                  const chipStyle = guardiaAsesorChipStyle(asesor.id);
                  return (
                    <li key={asesor.id}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(DRAG_ASESOR_KEY, asesor.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold shadow-sm transition hover:opacity-90 active:cursor-grabbing"
                        style={chipStyle}
                      >
                        <span className="truncate">{asesor.nombre}</span>
                        <span className="shrink-0 text-[10px] font-bold opacity-80">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {week ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-bold text-gabi-forest">Cobertura</p>
              <p className="mt-1 text-slate-600">
                {week.coverage.filledSlots}/{week.coverage.totalSlots} turnos ({coveragePct}%)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Publicadas: {week.coverage.publishedSlots} · Borrador:{" "}
                {week.coverage.filledSlots - week.coverage.publishedSlots}
              </p>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando calendario…
              </div>
            ) : !week ? (
              <p className="py-20 text-center text-sm text-slate-500">Selecciona un desarrollo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="w-28 px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">
                        Turno
                      </th>
                      {week.weekDates.map((fecha) => {
                        const { dow, day } = formatDayHeader(fecha);
                        return (
                          <th
                            key={fecha}
                            className="min-w-[6.5rem] px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-600"
                          >
                            <span className="block">{dow}</span>
                            <span className="text-[11px] font-semibold normal-case text-slate-500">
                              {day}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {GUARDIA_TURNOS.map((turno) => (
                      <tr key={turno} className="border-b border-slate-100 last:border-0">
                        <td className="align-top px-3 py-3 text-xs text-slate-600">
                          <p className="font-bold text-gabi-forest">
                            {guardiaTurnoShortLabel[turno]}
                          </p>
                          <p className="text-[10px] text-slate-400">{guardiaTurnoLabel[turno]}</p>
                        </td>
                        {week.weekDates.map((fecha) => {
                          const slot = slotMap.get(`${fecha}|${turno}`);
                          return (
                            <td key={`${fecha}-${turno}`} className="p-1.5 align-top">
                              <GuardiaSlot
                                asignacion={slot}
                                asesorNombre={
                                  slot ? asesorNames[slot.asesorId] ?? slot.asesorId : undefined
                                }
                                disabled={saving}
                                onAssign={(asesorId) => handleDropOnSlot(fecha, turno, asesorId)}
                                onClear={() => void clearSlot(fecha, turno)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Marcajes GPS: {GUARDIAS_MARCAJES_DESARROLLO_IDS.join(", ")}. Guardias 365 días ·
            matutino 10–15 h · vespertino 15–20 h. Estado{" "}
            <strong>{guardiaEstadoLabel.borrador}</strong> hasta publicar la semana.
          </p>
        </div>
      </div>
    </div>
  );
}

type GuardiaSlotProps = {
  asignacion?: GuardiaAsignacionRecord;
  asesorNombre?: string;
  disabled?: boolean;
  onAssign: (asesorId: string) => void;
  onClear: () => void;
};

function GuardiaSlot({
  asignacion,
  asesorNombre,
  disabled,
  onAssign,
  onClear,
}: GuardiaSlotProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const asesorId = event.dataTransfer.getData(DRAG_ASESOR_KEY);
    if (asesorId) {
      onAssign(asesorId);
      return;
    }
    const movedId = event.dataTransfer.getData("guardias-slot-asesor");
    if (movedId) {
      onAssign(movedId);
    }
  };

  if (asignacion && asesorNombre) {
    const chipStyle = guardiaAsesorChipStyle(asignacion.asesorId);
    const isPublished = asignacion.estado === "publicada";

    return (
      <div
        className={`relative min-h-[4.5rem] rounded-xl border p-1 ${
          isPublished ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/30"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div
          draggable={!disabled}
          onDragStart={(event) => {
            event.dataTransfer.setData("guardias-slot-asesor", asignacion.asesorId);
            event.dataTransfer.effectAllowed = "move";
          }}
          className="flex items-start justify-between gap-1 rounded-lg px-2 py-1.5 text-xs font-bold shadow-sm"
          style={chipStyle}
        >
          <span className="line-clamp-3 leading-tight">{asesorNombre}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100"
            aria-label="Quitar guardia"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          {guardiaEstadoLabel[asignacion.estado]}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[4.5rem] items-center justify-center rounded-xl border border-dashed px-2 py-2 text-center text-[10px] text-slate-400 transition ${
        dragOver ? "border-gabi-forest bg-gabi-forest/5 text-gabi-forest" : "border-slate-200 bg-slate-50/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      Arrastra aquí
    </div>
  );
}
