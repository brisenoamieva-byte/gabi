"use client";

import { useMemo, useState } from "react";
import { GripVertical, Phone, UserRound } from "lucide-react";
import type { ProspectoListRow } from "@/lib/admin/prospectos-service";
import {
  PROSPECTO_ETAPAS,
  isProspectoEtapa,
  prospectoEtapaDot,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";

type LeadsKanbanBoardProps = {
  prospectos: ProspectoListRow[];
  etapas?: readonly ProspectoEtapa[];
  movableEtapas?: readonly ProspectoEtapa[];
  onSelect: (id: string) => void;
  onMoveEtapa: (prospectoId: string, etapa: ProspectoEtapa) => Promise<void>;
  formatActivity?: (iso: string) => string;
};

export function LeadsKanbanBoard({
  prospectos,
  etapas = PROSPECTO_ETAPAS,
  movableEtapas = PROSPECTO_ETAPAS,
  onSelect,
  onMoveEtapa,
  formatActivity,
}: LeadsKanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ProspectoEtapa | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const movableSet = useMemo(() => new Set(movableEtapas), [movableEtapas]);

  const byEtapa = useMemo(() => {
    const map = new Map<ProspectoEtapa, ProspectoListRow[]>();
    for (const etapa of etapas) {
      map.set(etapa, []);
    }
    for (const row of prospectos) {
      const etapa = isProspectoEtapa(row.etapa) ? row.etapa : "nuevo";
      if (map.has(etapa)) {
        map.get(etapa)?.push(row);
      }
    }
    return map;
  }, [prospectos, etapas]);

  const canDrag = (row: ProspectoListRow) => {
    const etapa = isProspectoEtapa(row.etapa) ? row.etapa : "nuevo";
    return movableSet.has(etapa);
  };

  const canDrop = (etapa: ProspectoEtapa) => movableSet.has(etapa);

  const handleDrop = async (etapa: ProspectoEtapa, prospectoId: string) => {
    if (!canDrop(etapa)) {
      return;
    }

    const row = prospectos.find((item) => item.id === prospectoId);
    if (!row || !canDrag(row) || row.etapa === etapa) {
      return;
    }

    setMovingId(prospectoId);
    try {
      await onMoveEtapa(prospectoId, etapa);
    } finally {
      setMovingId(null);
      setDraggingId(null);
      setDropTarget(null);
    }
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4 p-4">
        {etapas.map((etapa) => {
          const cards = byEtapa.get(etapa) ?? [];
          const isTarget = dropTarget === etapa && canDrop(etapa);
          const acceptsDrop = canDrop(etapa);

          return (
            <div
              key={etapa}
              className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-50/80 transition ${
                isTarget ? "border-gabi-forest ring-2 ring-gabi-forest/20" : "border-slate-200"
              }`}
              onDragOver={(event) => {
                if (!acceptsDrop) {
                  return;
                }
                event.preventDefault();
                setDropTarget(etapa);
              }}
              onDragLeave={() => setDropTarget((current) => (current === etapa ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                const prospectoId = event.dataTransfer.getData("text/plain");
                if (prospectoId) {
                  void handleDrop(etapa, prospectoId);
                }
              }}
            >
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                <span className={`h-2.5 w-2.5 rounded-full ${prospectoEtapaDot[etapa]}`} />
                <h4 className="text-sm font-bold text-gabi-forest">
                  {prospectoEtapaLabel[etapa]}
                </h4>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                  {cards.length}
                </span>
              </div>

              <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto p-3">
                {cards.length ? (
                  cards.map((row) => (
                    <div
                      key={row.id}
                      draggable={canDrag(row) && movingId !== row.id}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", row.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(row.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTarget(null);
                      }}
                      className={`rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition ${
                        canDrag(row) ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                      } ${draggingId === row.id ? "opacity-50" : "hover:border-gabi-forest/20"} ${
                        movingId === row.id ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {canDrag(row) ? (
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        ) : (
                          <span className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={() => onSelect(row.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                              <UserRound className="h-4 w-4 text-slate-400" />
                            </div>
                            <p className="truncate font-bold text-gabi-forest">{row.nombre}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {row.email ?? "Sin email"}
                          </p>
                          {row.telefono ? (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-lg border border-gabi-forest/20 px-2 py-1 text-xs font-semibold text-gabi-forest">
                              <Phone className="h-3 w-3" />
                              {row.telefono}
                            </span>
                          ) : null}
                          {formatActivity ? (
                            <p className="mt-2 text-[11px] text-slate-400">
                              {formatActivity(row.updated_at)}
                            </p>
                          ) : null}
                          {row.asesorNombre ? (
                            <p className="mt-2 text-[11px] text-slate-400">{row.asesorNombre}</p>
                          ) : null}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">
                    Arrastra leads aquí
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
