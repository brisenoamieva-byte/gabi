import {
  INVESTTI_AUTORIZACION_LABELS,
  type InvesttiAutorizacionesEspeciales,
} from "@/lib/corredor/investti-autorizaciones";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";

type InvesttiAutorizacionesEspecialesProps = {
  autorizaciones: InvesttiAutorizacionesEspeciales;
  variant?: "panel" | "print";
};

const COLUMNS = [
  { key: "descuento" as const, label: INVESTTI_AUTORIZACION_LABELS.descuento },
  { key: "mensualidadBaja" as const, label: INVESTTI_AUTORIZACION_LABELS.mensualidadBaja },
  { key: "plazoMayor" as const, label: INVESTTI_AUTORIZACION_LABELS.plazoMayor },
];

function AuthColumn({
  label,
  requerida,
  detalle,
  variant,
}: {
  label: string;
  requerida: boolean;
  detalle?: string;
  variant: "panel" | "print";
}) {
  const isPrint = variant === "print";

  return (
    <div
      className={`flex flex-col ${
        isPrint
          ? "border border-neutral-300 bg-neutral-50 px-2.5 py-2.5"
          : `rounded-xl border px-3 py-3 ${requerida ? "border-amber-300 bg-amber-50/80" : "border-slate-200 bg-slate-50/60"}`
      }`}
    >
      <p
        className={`text-center text-[10px] font-semibold uppercase leading-snug tracking-wide ${
          isPrint ? "text-[#1C1830]" : requerida ? "text-amber-950" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      {requerida && detalle ? (
        <p
          className={`mt-1.5 text-center text-[9px] leading-relaxed ${
            isPrint ? "text-neutral-600" : "text-amber-900"
          }`}
        >
          {detalle}
        </p>
      ) : null}
      <div className={`mt-3 space-y-3.5 ${requerida ? "" : "opacity-40"}`}>
        <div>
          <div className={`border-b ${isPrint ? "border-neutral-400" : "border-slate-300"} pb-5`} />
          <p
            className={`mt-0.5 text-center text-[8px] font-medium uppercase tracking-widest ${
              isPrint ? "text-neutral-500" : "text-slate-400"
            }`}
          >
            Nombre
          </p>
        </div>
        <div>
          <div className={`border-b ${isPrint ? "border-neutral-400" : "border-slate-300"} pb-5`} />
          <p
            className={`mt-0.5 text-center text-[8px] font-medium uppercase tracking-widest ${
              isPrint ? "text-neutral-500" : "text-slate-400"
            }`}
          >
            Firma
          </p>
        </div>
      </div>
    </div>
  );
}

export function InvesttiAutorizacionesEspeciales({
  autorizaciones,
  variant = "panel",
}: InvesttiAutorizacionesEspecialesProps) {
  const isPrint = variant === "print";
  const columnasRequeridas = COLUMNS.filter(({ key }) => autorizaciones[key]);

  if (!autorizaciones.algunaRequerida || columnasRequeridas.length === 0) {
    return null;
  }

  const gridCols =
    columnasRequeridas.length === 1
      ? "grid-cols-1"
      : columnasRequeridas.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3";

  return (
    <section
      className={`investti-autorizaciones-especiales ${
        isPrint ? "investti-sim-print-section mt-5" : "mt-4"
      }`}
    >
      {variant === "panel" ? (
        <p className="mb-3 text-[13px] font-semibold text-amber-950">
          Se requiere autorización del director comercial
        </p>
      ) : (
        <p className={`mb-2 ${investtiReport.label}`}>Autorización requerida</p>
      )}

      <div className={`grid gap-3 ${gridCols}`}>
        {columnasRequeridas.map(({ key, label }) => (
          <AuthColumn
            key={key}
            label={label}
            requerida
            detalle={autorizaciones.detalle[key]}
            variant={variant}
          />
        ))}
      </div>

      {isPrint ? (
        <p className={`mt-2 text-[9px] text-neutral-500 ${investtiReport.sans}`}>
          Nombre y firma del director comercial.
        </p>
      ) : null}
    </section>
  );
}
