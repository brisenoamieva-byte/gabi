"use client";

import { CheckCircle2, ChevronDown, FileText, X } from "lucide-react";
import {
  getPasajeDeptosAcabados,
  type PasajeAcabadosSection,
} from "@/lib/catalog/pasaje-alamos-acabados";

type PasajeAcabadosPanelProps = {
  compact?: boolean;
  className?: string;
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
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[#201044]">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-medium leading-snug text-slate-600">
            {positive ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" aria-hidden />
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

function SectionBlock({ section }: { section: PasajeAcabadosSection }) {
  return (
    <div className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-[#C7A694]">
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

export function PasajeAcabadosPanel({ compact = false, className = "" }: PasajeAcabadosPanelProps) {
  const { pdfUrl, incluido, noIncluye, sections } = getPasajeDeptosAcabados();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#C7A694]">
          Acabados · Anexo C
        </p>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#242E38]/5 px-2.5 py-1.5 text-xs font-bold text-[#242E38] ring-1 ring-slate-200 transition hover:bg-[#242E38]/10"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          PDF completo
        </a>
      </div>

      <div className={compact ? "space-y-3" : "grid gap-3 lg:grid-cols-2"}>
        <AcabadosList title="Incluye" items={incluido} positive />
        <AcabadosList title="No incluye" items={noIncluye} />
      </div>

      {!compact ? (
        <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-black text-[#201044]">
            Especificación detallada por área
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
