"use client";

import { BbrOrganigramaChart } from "@/components/propuestas/BbrOrganigramaChart";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

export function NuboOrganigramaSlide() {
  return (
    <div className="propuesta-slide-root flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
      <div className="propuesta-org-print-header shrink-0 border-b border-slate-100 px-4 py-3 md:px-6">
        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${t.kpiLabel}`}>
          Equipo BBR Habitarea
        </p>
        <h2 className={`mt-2 text-2xl md:text-3xl ${t.title}`}>Organigrama</h2>
        <p className={`mt-1 max-w-2xl text-[13px] leading-relaxed ${t.body}`}>
          Estructura que conformamos para la comercialización en exclusiva del proyecto.
        </p>
      </div>
      <div className="propuesta-slide-inner propuesta-org-print-chart relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white to-slate-50/80 p-3 md:p-5">
        <BbrOrganigramaChart />
      </div>
    </div>
  );
}
