"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import type { AsesorGuardiaHoy } from "@/lib/asesores/guardias-service";
import { GUARDIAS_PILOT_DESARROLLO_ID } from "@/lib/comercial/guardias";

type AsesorGuardiaHoyCardProps = {
  asesorId: string;
  desarrolloId: string;
};

export function AsesorGuardiaHoyCard({ asesorId, desarrolloId }: AsesorGuardiaHoyCardProps) {
  const [guardia, setGuardia] = useState<AsesorGuardiaHoy | null>(null);
  const [loading, setLoading] = useState(false);

  const isPilot = desarrolloId === GUARDIAS_PILOT_DESARROLLO_ID;

  const load = useCallback(async () => {
    if (!isPilot) {
      setGuardia(null);
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({ asesorId, desarrolloId });
      const response = await fetch(`/api/asesores/guardias?${params}`);
      const data = (await response.json()) as { guardia?: AsesorGuardiaHoy | null };

      if (response.ok) {
        setGuardia(data.guardia ?? null);
      }
    } catch {
      setGuardia(null);
    } finally {
      setLoading(false);
    }
  }, [asesorId, desarrolloId, isPilot]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isPilot) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Guardia de hoy…
      </div>
    );
  }

  if (!guardia) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#201044]/12 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Tu guardia hoy
          </p>
          <p className="mt-0.5 text-lg font-black text-[#201044]">{guardia.turnoLabel}</p>
          <p className="text-sm text-slate-600">{guardia.horario}</p>
          {guardia.notas ? (
            <p className="mt-1 text-xs text-slate-500">{guardia.notas}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
