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
  formatMonthLabel,
  getMonthCalendarGrid,
  getMonthStart,
  guardiaAsesorChipStyle,
  guardiaEstadoLabel,
  guardiaTurnoShortLabel,
  GUARDIA_TURNOS,
  GUARDIA_WEEKDAY_LABELS,
  GUARDIAS_PILOT_DESARROLLO_ID,
  parseYmd,
  shiftMonth,
  type GuardiaTurno,
} from "@/lib/comercial/guardias";

type GuardiasAdminPanelProps = {
  desarrollos: DesarrolloRecord[];
  scopeLabel: string;
  initialDesarrolloId?: string;
};

type MonthPayload = {
  monthStart: string;
  monthDates: string[];
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
  const [monthStart, setMonthStart] = useState(getMonthStart());
  const [month, setMonth] = useState<MonthPayload | null>(null);
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
    for (const item of month?.asignaciones ?? []) {
      map.set(`${item.fecha}|${item.turno}`, item);
    }
    return map;
  }, [month]);

  const calendarGrid = useMemo(() => getMonthCalendarGrid(monthStart), [monthStart]);

  const loadMonth = useCallback(async () => {
    if (!desarrolloId) {
      setMonth(null);
      setAsesores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        desarrolloId,
        monthStart,
      });
      const response = await fetch(`/api/admin/guardias?${params}`);
      const data = (await response.json()) as {
        month?: MonthPayload;
        asesores?: AsesorRecord[];
        conflictos?: GuardiaConflicto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el calendario.");
      }

      setMonth(data.month ?? null);
      setAsesores(data.asesores ?? []);
      setConflictos(data.conflictos ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
      setMonth(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, monthStart]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

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

      await loadMonth();
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

      await loadMonth();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Error al quitar");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyMonth = async () => {
    setCopying(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/guardias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copyMonth", desarrolloId, monthStart }),
      });
      const data = (await response.json()) as {
        copied?: number;
        skipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo copiar el mes.");
      }

      const copied = data.copied ?? 0;
      const skipped = data.skipped ?? 0;
      if (copied > 0) {
        setMonthStart((prev) => shiftMonth(prev, 1));
      }
      setSuccess(
        copied
          ? `Mes copiado al siguiente (${copied} turno${copied === 1 ? "" : "s"}${skipped ? `, ${skipped} omitidos` : ""}).`
          : "No hay guardias en este mes para copiar.",
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
        body: JSON.stringify({ action: "publish", desarrolloId, monthStart }),
      });
      const data = (await response.json()) as { updated?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo publicar.");
      }

      setSuccess(
        data.updated
          ? `Mes publicado (${data.updated} guardia${data.updated === 1 ? "" : "s"}).`
          : "No hay guardias en borrador para publicar.",
      );
      await loadMonth();
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

  const coveragePct = month
    ? Math.round((month.coverage.filledSlots / month.coverage.totalSlots) * 100)
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
            {scopeLabel} · Vista mensual. Arrastra asesores a cada turno (matutino y vespertino).
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
              onClick={() => setMonthStart((prev) => shiftMonth(prev, -1))}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[9rem] px-2 text-center text-sm font-bold capitalize text-gabi-forest">
              {formatMonthLabel(monthStart)}
            </div>
            <button
              type="button"
              onClick={() => setMonthStart((prev) => shiftMonth(prev, 1))}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMonthStart(getMonthStart())}
              className="ml-1 rounded-lg px-2 py-1 text-xs font-bold text-gabi-forest hover:bg-gabi-forest/5"
            >
              Hoy
            </button>
          </div>

          <button
            type="button"
            disabled={copying || loading || !desarrolloId}
            onClick={() => void handleCopyMonth()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-gabi-forest disabled:opacity-50"
          >
            {copying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copiar a siguiente mes
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
            Publicar mes
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
                  const count = month?.asesorCounts[asesor.id] ?? 0;
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

          {month ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-bold text-gabi-forest">Cobertura del mes</p>
              <p className="mt-1 text-slate-600">
                {month.coverage.filledSlots}/{month.coverage.totalSlots} turnos ({coveragePct}%)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Publicadas: {month.coverage.publishedSlots} · Borrador:{" "}
                {month.coverage.filledSlots - month.coverage.publishedSlots}
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
            ) : !month ? (
              <p className="py-20 text-center text-sm text-slate-500">Selecciona un desarrollo.</p>
            ) : (
              <div className="p-2 sm:p-3">
                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                  {GUARDIA_WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="bg-slate-50 px-1 py-1.5 text-center text-[10px] font-bold uppercase text-slate-500"
                    >
                      {label}
                    </div>
                  ))}

                  {calendarGrid.flatMap((week) =>
                    week.map((day) => {
                      const dayNumber = parseYmd(day.fecha).getDate();
                      return (
                        <div
                          key={day.fecha}
                          className={`min-h-[7.5rem] bg-white p-1 sm:min-h-[8.5rem] sm:p-1.5 ${
                            day.inMonth ? "" : "bg-slate-50/80"
                          }`}
                        >
                          <p
                            className={`mb-1 text-right text-[10px] font-bold sm:text-xs ${
                              day.inMonth ? "text-gabi-forest" : "text-slate-300"
                            }`}
                          >
                            {dayNumber}
                          </p>

                          {day.inMonth ? (
                            <div className="space-y-1">
                              {GUARDIA_TURNOS.map((turno) => {
                                const slot = slotMap.get(`${day.fecha}|${turno}`);
                                return (
                                  <GuardiaSlot
                                    key={`${day.fecha}-${turno}`}
                                    turno={turno}
                                    asignacion={slot}
                                    asesorNombre={
                                      slot
                                        ? asesorNames[slot.asesorId] ?? slot.asesorId
                                        : undefined
                                    }
                                    disabled={saving}
                                    compact
                                    onAssign={(asesorId) =>
                                      handleDropOnSlot(day.fecha, turno, asesorId)
                                    }
                                    onClear={() => void clearSlot(day.fecha, turno)}
                                  />
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    }),
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Marcajes GPS: activos cuando el desarrollo tiene caseta configurada en{" "}
            <code className="rounded bg-slate-100 px-1">guardia_caseta_config</code>. Guardias 365
            días · matutino 10–15 h · vespertino 15–20 h. Estado{" "}
            <strong>{guardiaEstadoLabel.borrador}</strong> hasta publicar el mes.
          </p>
        </div>
      </div>
    </div>
  );
}

type GuardiaSlotProps = {
  turno?: GuardiaTurno;
  asignacion?: GuardiaAsignacionRecord;
  asesorNombre?: string;
  disabled?: boolean;
  compact?: boolean;
  onAssign: (asesorId: string) => void;
  onClear: () => void;
};

function GuardiaSlot({
  turno,
  asignacion,
  asesorNombre,
  disabled,
  compact = false,
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

  const minHeight = compact ? "min-h-[2.35rem]" : "min-h-[4.5rem]";
  const turnoLabel = turno ? guardiaTurnoShortLabel[turno] : null;

  if (asignacion && asesorNombre) {
    const chipStyle = guardiaAsesorChipStyle(asignacion.asesorId);
    const isPublished = asignacion.estado === "publicada";

    return (
      <div
        className={`relative rounded-lg border p-0.5 ${minHeight} ${
          isPublished ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/30"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {compact && turnoLabel ? (
          <p className="px-1 text-[8px] font-bold uppercase tracking-wide text-slate-400">
            {turnoLabel.slice(0, 3)}
          </p>
        ) : null}
        <div
          draggable={!disabled}
          onDragStart={(event) => {
            event.dataTransfer.setData("guardias-slot-asesor", asignacion.asesorId);
            event.dataTransfer.effectAllowed = "move";
          }}
          className={`flex items-start justify-between gap-0.5 rounded-md font-bold shadow-sm ${
            compact ? "px-1 py-0.5 text-[10px] leading-tight" : "px-2 py-1.5 text-xs"
          }`}
          style={chipStyle}
        >
          <span className={compact ? "line-clamp-2" : "line-clamp-3 leading-tight"}>
            {asesorNombre}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100"
            aria-label="Quitar guardia"
          >
            <X className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
        </div>
        {!compact ? (
          <p className="mt-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            {guardiaEstadoLabel[asignacion.estado]}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`flex ${minHeight} flex-col items-center justify-center rounded-lg border border-dashed px-1 py-0.5 text-center transition ${
        dragOver
          ? "border-gabi-forest bg-gabi-forest/5 text-gabi-forest"
          : "border-slate-200 bg-slate-50/50 text-slate-400"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {compact && turnoLabel ? (
        <p className="text-[8px] font-bold uppercase tracking-wide">{turnoLabel.slice(0, 3)}</p>
      ) : null}
      <span className={compact ? "text-[9px]" : "text-[10px]"}>Arrastra</span>
    </div>
  );
}
