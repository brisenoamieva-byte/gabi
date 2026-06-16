"use client";

type OrgVariant = "executive" | "adjunto" | "director" | "staff" | "creative" | "sales";

const VARIANT: Record<OrgVariant, string> = {
  executive:
    "bg-slate-900 text-white shadow-md ring-1 ring-slate-900/10",
  adjunto:
    "bg-[#6cc24a] text-white shadow-md ring-1 ring-[#6cc24a]/20",
  director:
    "border border-slate-200 bg-white text-slate-800 shadow-sm ring-1 ring-slate-100",
  staff:
    "border border-slate-200 bg-slate-50 text-slate-700",
  creative:
    "bg-violet-600 text-white shadow-sm ring-1 ring-violet-600/20",
  sales:
    "bg-[#5a9e3a] text-white font-bold shadow-md ring-1 ring-[#5a9e3a]/25",
};

function OrgNode({
  children,
  variant,
  className = "",
}: {
  children: React.ReactNode;
  variant: OrgVariant;
  className?: string;
}) {
  const rounded = variant === "creative" ? "rounded-full" : "rounded-lg";
  return (
    <div
      className={`bbr-organigrama__node flex items-center justify-center px-2.5 py-2 text-center text-[9px] font-semibold leading-snug sm:text-[10px] md:px-3 md:py-2.5 md:text-[11px] ${rounded} ${VARIANT[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

function HConnector({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bbr-organigrama__h-connector shrink-0 border-t-2 border-slate-300 ${className}`}
      aria-hidden
    />
  );
}

function OrgRow({
  director,
  branch,
}: {
  director: string;
  branch?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[2.35rem] items-center gap-1 sm:min-h-[2.6rem] sm:gap-1.5">
      <OrgNode variant="director" className="w-[7.8rem] shrink-0 sm:w-[9rem]">
        {director}
      </OrgNode>
      {branch ? (
        <>
          <HConnector className="w-2 shrink-0 sm:w-3" />
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">{branch}</div>
        </>
      ) : null}
    </div>
  );
}

const ASSISTANTS = ["Asistente admin. 1", "Asistente admin. 2", "Asistente admin. 3"] as const;

export function BbrOrganigramaChart() {
  return (
    <div className="bbr-organigrama mx-auto flex h-full w-full max-w-5xl items-center justify-center px-1 md:px-2">
      <div className="flex w-full min-w-0 items-stretch">
        <div className="flex shrink-0 items-center">
          <OrgNode variant="executive" className="min-h-[11rem] max-w-[4.5rem] sm:min-h-[12rem] sm:max-w-[5rem]">
            <span className="[writing-mode:vertical-rl] rotate-180">Director General</span>
          </OrgNode>
        </div>

        <HConnector className="w-3 self-center sm:w-5" />

        <div className="flex shrink-0 items-center">
          <OrgNode variant="adjunto" className="min-w-[7.25rem] sm:min-w-[8.25rem]">
            Dir. General adjunto
          </OrgNode>
        </div>

        <HConnector className="w-3 self-center sm:w-5" />

        <div className="flex min-w-0 flex-1 items-stretch gap-1 sm:gap-1.5">
          <div className="mt-4 w-px shrink-0 self-stretch bg-slate-300 sm:mt-5" aria-hidden />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:gap-1.5">
            <OrgRow
              director="Director Administrativo"
              branch={
                <div className="flex flex-col gap-1 sm:gap-1.5">
                  {ASSISTANTS.map((assistant) => (
                    <OrgNode key={assistant} variant="staff" className="min-w-[7rem] sm:min-w-[7.75rem]">
                      {assistant}
                    </OrgNode>
                  ))}
                </div>
              }
            />

            <OrgRow director="Director Operativo" />

            <OrgRow
              director="Director Comercial"
              branch={
                <>
                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    <OrgNode variant="staff" className="min-w-[7rem] sm:min-w-[7.75rem]">
                      Gerente Comercial
                    </OrgNode>
                    <OrgNode variant="staff" className="min-w-[7rem] sm:min-w-[7.75rem]">
                      Gerente Titulación
                    </OrgNode>
                  </div>
                  <HConnector className="w-2 shrink-0 self-start sm:w-3 mt-3 sm:mt-3.5" />
                  <OrgNode variant="sales" className="min-h-[2.35rem] min-w-[5.5rem] self-start sm:min-h-[2.6rem] sm:min-w-[6rem]">
                    Vendedores
                  </OrgNode>
                </>
              }
            />

            <OrgRow director="Director de alianzas Comerciales" />
            <OrgRow director="Dirección de eventos y RP" />

            <div className="flex min-h-[2.35rem] items-center sm:min-h-[2.6rem]">
              <OrgNode variant="creative" className="w-[7.8rem] sm:w-[9rem]">
                BBR Creativo
              </OrgNode>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
