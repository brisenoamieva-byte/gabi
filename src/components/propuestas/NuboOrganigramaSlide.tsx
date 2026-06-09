"use client";

import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

type OrgNodeProps = {
  label: string;
  variant: "lead" | "adjunto" | "director" | "gerente" | "asistente" | "ventas" | "creativo";
  className?: string;
};

const nodeStyles: Record<OrgNodeProps["variant"], string> = {
  lead: "rounded-sm bg-slate-800 text-white shadow-sm",
  adjunto: "rounded-sm border-2 border-[#6cc24a]/45 bg-[#6cc24a]/10 text-slate-800",
  director: "rounded-sm border border-[#d9cdb8] bg-[#faf7f2] text-slate-800",
  gerente: "rounded-sm border border-slate-200 bg-white text-slate-800 shadow-sm",
  asistente: "rounded-sm border border-slate-200 bg-slate-50 text-slate-600",
  ventas: "rounded-sm border border-slate-800 bg-slate-800 text-sm font-bold text-white shadow-md",
  creativo: "rounded-full border border-slate-300 bg-white text-[13px] text-slate-700",
};

function OrgNode({ label, variant, className = "" }: OrgNodeProps) {
  return (
    <div
      className={`flex min-h-[2.65rem] items-center justify-center px-3 py-2 text-center text-[11px] font-semibold leading-snug md:min-h-[2.85rem] md:px-4 md:text-[12px] ${nodeStyles[variant]} ${className}`}
    >
      {label}
    </div>
  );
}

function LinkLine({ direction = "h" }: { direction?: "h" | "v" }) {
  if (direction === "v") {
    return <div className="mx-auto h-full min-h-[0.5rem] w-px bg-slate-300" aria-hidden />;
  }
  return <div className="h-px min-w-[1rem] flex-1 bg-slate-300" aria-hidden />;
}

const DIRECTORES = [
  "Director Administrativo",
  "Director Operativo",
  "Director Comercial",
  "Director de alianzas Comerciales",
  "Dirección de eventos y RP",
] as const;

export function NuboOrganigramaSlide() {
  return (
    <div className="propuesta-slide-root flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
      <div className="propuesta-org-print-header shrink-0 border-b border-slate-100 px-6 py-6 md:px-12 md:py-8">
        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${t.kpiLabel}`}>
          Equipo BBR Habitarea
        </p>
        <h2 className={`mt-2 text-3xl md:text-4xl ${t.title}`}>Organigrama</h2>
        <p className={`mt-2 max-w-2xl text-[14px] leading-relaxed ${t.body}`}>
          Estructura que conformamos para la comercialización en exclusiva del proyecto.
        </p>
      </div>

      <div className="propuesta-slide-inner flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-3 md:px-4">
        <div
          className="propuesta-org-print-scale inline-grid items-center gap-y-1.5 md:gap-y-2"
          style={{
            gridTemplateColumns: "auto 1.5rem auto 1.5rem 12rem 1.5rem 1fr",
            gridTemplateRows: `repeat(${DIRECTORES.length + 1}, auto)`,
          }}
        >
          {/* Director General — ocupa filas de directores */}
          <div
            className="flex items-center justify-center"
            style={{ gridColumn: 1, gridRow: `1 / ${DIRECTORES.length + 1}` }}
          >
            <OrgNode
              label="Director General"
              variant="lead"
              className="min-h-[10rem] w-[4.25rem] [writing-mode:vertical-rl] md:min-h-[12rem] md:w-[4.75rem]"
            />
          </div>

          <div
            className="flex items-center"
            style={{ gridColumn: 2, gridRow: `1 / ${DIRECTORES.length + 1}` }}
          >
            <LinkLine />
          </div>

          {/* Adjunto */}
          <div
            className="flex items-center"
            style={{ gridColumn: 3, gridRow: `1 / ${DIRECTORES.length + 1}` }}
          >
            <OrgNode label="Dir. General adjunto" variant="adjunto" className="w-full min-w-[8rem]" />
          </div>

          <div
            className="flex items-center"
            style={{ gridColumn: 4, gridRow: `1 / ${DIRECTORES.length + 1}` }}
          >
            <LinkLine />
          </div>

          {/* Columna directores — una fila por puesto */}
          {DIRECTORES.map((nombre, i) => (
            <div key={nombre} style={{ gridColumn: 5, gridRow: i + 1 }}>
              <OrgNode label={nombre} variant="director" className="w-full" />
            </div>
          ))}

          {/* BBR Creativo */}
          <div style={{ gridColumn: 5, gridRow: DIRECTORES.length + 1 }}>
            <OrgNode label="BBR Creativo" variant="creativo" className="w-full py-3" />
          </div>

          {/* Conectores horizontales por fila */}
          {DIRECTORES.map((_, i) => (
            <div
              key={`link-${i}`}
              className="flex items-center"
              style={{ gridColumn: 6, gridRow: i + 1 }}
            >
              <LinkLine />
            </div>
          ))}

          {/* Rama administrativa — fila 1 (alineada con Dir. Administrativo) */}
          <div
            className="flex flex-col justify-center gap-1"
            style={{ gridColumn: 7, gridRow: 1 }}
          >
            {["Asistente admin. 1", "Asistente admin. 2", "Asistente admin. 3"].map((nombre) => (
              <OrgNode key={nombre} label={nombre} variant="asistente" className="min-w-[8.5rem]" />
            ))}
          </div>

          {/* Rama comercial — fila 3 (alineada con Dir. Comercial) */}
          <div
            className="flex flex-col justify-center gap-1.5"
            style={{ gridColumn: 7, gridRow: 3 }}
          >
            <OrgNode label="Gerente Comercial" variant="gerente" className="min-w-[8.5rem]" />
            <div className="ml-4 flex items-center gap-2">
              <LinkLine />
              <OrgNode label="Vendedores" variant="ventas" className="min-w-[6.5rem]" />
            </div>
            <OrgNode label="Gerente Titulación" variant="gerente" className="min-w-[8.5rem]" />
          </div>
        </div>
      </div>

      <div className="propuesta-org-print-legend shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" />
            Dirección
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm border-2 border-[#6cc24a]/50 bg-[#6cc24a]/10" />
            Coordinación
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm border border-[#d9cdb8] bg-[#faf7f2]" />
            Áreas
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" />
            Fuerza de ventas
          </span>
        </div>
      </div>
    </div>
  );
}
