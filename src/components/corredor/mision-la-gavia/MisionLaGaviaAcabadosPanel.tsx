"use client";

import { CheckCircle2, ChevronDown, X } from "lucide-react";
import {
  getMisionLaGaviaDeptosAcabados,
  type MisionLaGaviaAcabadosSection,
} from "@/lib/catalog/mision-la-gavia-acabados";

type MisionLaGaviaAcabadosPanelProps = {
  compact?: boolean;
  className?: string;
  /** Solo modelos con roof garden / segundo nivel. */
  includeRoof?: boolean;
};

function AcabadosList({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[#14453D]">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-medium leading-snug text-slate-600">
            {positive ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5B8A7D]" aria-hidden />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionBlock({ section }: { section: MisionLaGaviaAcabadosSection }) {
  return (
    <div className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-[#5B8A7D]">
        {section.title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {section.items.map((item) => (
          <li key={item} className="text-xs leading-snug text-slate-600">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MisionLaGaviaAcabadosPanel({
  compact = false,
  className = "",
  includeRoof = false,
}: MisionLaGaviaAcabadosPanelProps) {
  const { incluido, noIncluye, sections } = getMisionLaGaviaDeptosAcabados({ includeRoof });

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#5B8A7D]">
        Acabados departamentos
      </p>

      <div className={compact ? "space-y-3" : "grid gap-3 lg:grid-cols-2"}>
        <AcabadosList title="Incluye" items={incluido} positive />
        <AcabadosList title="No incluye" items={noIncluye} />
      </div>

      {!compact ? (
        <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-black text-[#14453D]">
            Especificación por área
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {sections.map((section) => (
              <SectionBlock key={section.title} section={section} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
