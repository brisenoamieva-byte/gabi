import type { ReactNode } from "react";
import { ConsultoriaBrandLogo } from "@/components/brand/ConsultoriaBrandLogo";
import { useConsultoriaMarca } from "@/components/brand/ConsultoriaMarcaProvider";
import { CONSULTORIA_MARCA_CONTACT } from "@/lib/brand/consultoria-marca";
import { BBR_INVESTTI_RELACION } from "@/lib/corredor/bbr-investti-relacion";

/** Estilo memo / nota ejecutiva — evita look “dashboard SaaS”. */
export const investtiReport = {
  page: "min-h-screen bg-[#EEEBE4] text-[#1C1830]",
  sheet:
    "mx-auto max-w-[880px] bg-[#FDFCFA] shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_40px_rgba(28,24,48,0.07)]",
  body: "px-8 py-10 md:px-12 md:py-14",
  serif: "font-[Georgia,'Times_New_Roman',serif]",
  sans: "font-[system-ui,-apple-system,'Segoe_UI',sans-serif]",
  label: "text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500",
  caption: "text-[11px] leading-relaxed text-neutral-500",
  rule: "border-neutral-300/90",
  accent: "#201044",
  accentSoft: "#5C7642",
} as const;

export function InvesttiReportCover({
  title,
  subtitle,
  client,
  date,
  children,
}: {
  title: string;
  subtitle: string;
  client: string;
  date: string;
  children?: ReactNode;
}) {
  const { marca } = useConsultoriaMarca();
  const contact = CONSULTORIA_MARCA_CONTACT[marca];

  return (
    <header
      className={`investti-print-cover border-b ${investtiReport.rule} px-8 py-10 md:px-12 md:py-12`}
    >
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="space-y-4">
          <ConsultoriaBrandLogo height={40} priority />
          <p className={`${investtiReport.sans} text-[12px] text-neutral-600`}>
            Elaborado por {contact.elaboradoDefault}
          </p>
        </div>
        <div className="flex flex-col items-end gap-5">
          <dl className={`${investtiReport.sans} space-y-1 text-right text-[12px] text-neutral-600`}>
            <div>
              <dt className={investtiReport.label}>Preparado para</dt>
              <dd className="mt-0.5 font-semibold text-[#1C1830]">{client}</dd>
            </div>
            <div>
              <dt className={investtiReport.label}>Fecha</dt>
              <dd className="mt-0.5 tabular-nums">{date}</dd>
            </div>
            <div>
              <dd className="mt-0.5 text-[12px] text-neutral-600">Uso interno · Comercial</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-10 max-w-2xl">
        <h1
          className={`${investtiReport.serif} text-[1.75rem] font-normal leading-[1.2] text-[#1C1830] md:text-[2.125rem]`}
        >
          {title}
        </h1>
        <p className={`${investtiReport.sans} mt-4 text-[15px] leading-relaxed text-neutral-600`}>
          {subtitle}
        </p>
      </div>

      {children ? (
        <div
          className={`${investtiReport.sans} investti-print-cover-stats mt-10 grid gap-px bg-neutral-300 sm:grid-cols-3`}
        >
          {children}
        </div>
      ) : null}
    </header>
  );
}

export function InvesttiCoverStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="bg-[#FDFCFA] px-4 py-4">
      <p className={investtiReport.label}>{label}</p>
      <p className={`${investtiReport.serif} mt-1 text-2xl tabular-nums text-[#1C1830]`}>{value}</p>
      {note ? <p className={`${investtiReport.caption} mt-1`}>{note}</p> : null}
    </div>
  );
}

export function InvesttiSection({
  number,
  title,
  lead,
  children,
  printVariant = "default",
}: {
  number: string;
  title: string;
  lead?: string;
  children: ReactNode;
  printVariant?: "default" | "after-cover" | "major";
}) {
  const printClass =
    printVariant === "after-cover"
      ? "investti-print-section-start investti-print-page-end"
      : printVariant === "major"
        ? "investti-print-section-major"
        : "";

  return (
    <section
      className={`investti-print-section border-t ${investtiReport.rule} pt-10 first:border-t-0 first:pt-0 ${printClass}`}
    >
      <div className="mb-6 flex gap-4">
        <span
          className={`${investtiReport.sans} shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-neutral-400`}
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className={`${investtiReport.serif} text-xl font-normal text-[#1C1830] md:text-[1.35rem]`}
          >
            {title}
          </h2>
          {lead ? (
            <p className={`${investtiReport.sans} mt-2 max-w-3xl text-[14px] leading-relaxed text-neutral-600`}>
              {lead}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function InvesttiFigure({
  caption,
  children,
  className = "",
}: {
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`investti-print-figure ${className}`.trim()}>
      <div className={`border ${investtiReport.rule} bg-white`}>{children}</div>
      {caption ? (
        <figcaption className={`${investtiReport.caption} mt-2 px-0.5`}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function InvesttiCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside
      className={`border-l-[3px] border-[#201044] bg-neutral-50/80 px-5 py-5 md:px-6 ${investtiReport.sans}`}
    >
      <p className={investtiReport.label}>{title}</p>
      <div className="mt-3 text-[14px] leading-relaxed text-neutral-700">{children}</div>
    </aside>
  );
}

export function InvesttiEvidenceList({ items }: { items: string[] }) {
  return (
    <ol className={`${investtiReport.sans} mt-5 space-y-3 border-t border-neutral-200 pt-5`}>
      {items.map((item, i) => (
        <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-neutral-700">
          <span className="shrink-0 tabular-nums text-neutral-400">{String(i + 1).padStart(2, "0")}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function InvesttiChartHeader({
  title,
  subtitle,
  legend,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
}) {
  return (
    <div className={`border-b ${investtiReport.rule} px-5 py-4 md:px-6`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className={`${investtiReport.serif} text-[1.05rem] text-[#1C1830]`}>{title}</h3>
          {subtitle ? (
            <p className={`${investtiReport.sans} mt-1 text-[13px] text-neutral-600`}>{subtitle}</p>
          ) : null}
        </div>
        {legend ? (
          <div className={`${investtiReport.sans} flex flex-wrap gap-3 text-[10px] text-neutral-500`}>
            {legend}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InvesttiLegendItem({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-3 ${border ? "border border-neutral-400 bg-white" : ""}`}
        style={border ? undefined : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function InvesttiFootnote({ children }: { children: ReactNode }) {
  return (
    <p className={`${investtiReport.caption} border-t ${investtiReport.rule} px-5 py-3 md:px-6`}>
      {children}
    </p>
  );
}

/** Aviso de convenio exclusivo Investti — usar en sección competitiva. */
export function InvesttiConvenioNotice() {
  return (
    <p
      className={`${investtiReport.sans} mb-6 border-l-2 border-neutral-300 pl-4 text-[13px] leading-relaxed text-neutral-600`}
    >
      <strong className="font-medium text-neutral-800">Convenio:</strong>{" "}
      {BBR_INVESTTI_RELACION.convenio}
    </p>
  );
}
