"use client";

import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";

type LeadsComplianceBannerProps = {
  report: DesarrolloComplianceReport | null;
  loading?: boolean;
  desarrolloId: string;
  compact?: boolean;
};

export function LeadsComplianceBanner({
  report,
  loading,
  desarrolloId,
  compact = false,
}: LeadsComplianceBannerProps) {
  if (loading) {
    if (compact) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          CRM…
        </span>
      );
    }
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Calculando salud CRM…
      </div>
    );
  }

  if (!report?.playbookEnabled) {
    return null;
  }

  const healthy = report.compliancePct >= 85 && report.overdueCount === 0;
  const tone = healthy
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : report.overdueCount > 0
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-950";

  if (compact && healthy) {
    return (
      <Link
        href={`/admin/crm-compliance?desarrolloId=${encodeURIComponent(desarrolloId)}`}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
        title="Salud CRM del desarrollo"
      >
        <ShieldCheck className="h-3 w-3" />
        CRM {report.compliancePct}%
      </Link>
    );
  }

  if (compact && !healthy) {
    return (
      <Link
        href={`/admin/crm-compliance?desarrolloId=${encodeURIComponent(desarrolloId)}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold hover:opacity-90 ${tone}`}
        title="Salud CRM del desarrollo"
      >
        {report.overdueCount > 0 ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <ShieldCheck className="h-3 w-3" />
        )}
        CRM {report.compliancePct}%
        {report.overdueCount > 0 ? ` · ${report.overdueCount} venc.` : ""}
      </Link>
    );
  }

  return (
    <div className={`rounded-xl border px-3 py-2 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
            {report.overdueCount > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Salud CRM del desarrollo
          </p>
          <p className="mt-0.5 text-xs">
            Cumplimiento <strong>{report.compliancePct}%</strong> · Confianza{" "}
            <strong>{report.confidencePct}%</strong>
            {report.overdueCount > 0 ? (
              <>
                {" "}
                · <strong>{report.overdueCount}</strong> paso(s) vencido(s)
              </>
            ) : null}
          </p>
        </div>
        <Link
          href={`/admin/crm-compliance?desarrolloId=${encodeURIComponent(desarrolloId)}`}
          className="text-xs font-semibold text-gabi-forest hover:underline"
        >
          Abrir Salud CRM
        </Link>
      </div>
    </div>
  );
}
