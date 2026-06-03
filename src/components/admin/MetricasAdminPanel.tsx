"use client";

import { useState } from "react";
import type { Desarrollo } from "@/lib/data";
import { LeadsReportePanel } from "@/components/admin/LeadsReportePanel";
import { SembradoReportePanel } from "@/components/admin/SembradoReportePanel";
import { VisitasMetricasPanel } from "@/components/admin/VisitasMetricasPanel";

type MetricasAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

type MetricasTab = "visitas" | "leads" | "sembrado";

export function MetricasAdminPanel({ desarrollos, scopeLabel }: MetricasAdminPanelProps) {
  const [tab, setTab] = useState<MetricasTab>("leads");

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados para ver métricas comerciales.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200">
        {(
          [
            { id: "leads" as const, label: "Leads" },
            { id: "sembrado" as const, label: "Sembrado" },
            { id: "visitas" as const, label: "Visitas" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
              tab === item.id
                ? "border-gabi-forest text-gabi-forest"
                : "border-transparent text-slate-500 hover:text-gabi-forest"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "leads" ? (
        <LeadsReportePanel desarrollos={desarrollos} scopeLabel={scopeLabel} />
      ) : tab === "sembrado" ? (
        <SembradoReportePanel desarrollos={desarrollos} scopeLabel={scopeLabel} />
      ) : (
        <VisitasMetricasPanel desarrollos={desarrollos} scopeLabel={scopeLabel} />
      )}
    </div>
  );
}
