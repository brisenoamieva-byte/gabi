"use client";

import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";

type LeadsComplianceBannerProps = {
  report: DesarrolloComplianceReport | null;
  loading?: boolean;
  desarrolloId: string;
};

export function LeadsComplianceBanner({
  report,
  loading,
  desarrolloId,
}: LeadsComplianceBannerProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Calculando salud CRM…
      </div>
    );
  }

  if (!report?.playbookEnabled) {
    return null;
  }

  const tone =
    report.compliancePct >= 85 && report.overdueCount === 0
      ? "border-emerald-200 bg-emerald-50"
      : report.overdueCount > 0
        ? "border-red-200 bg-red-50"
        : "border-amber-200 bg-amber-50";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            {report.overdueCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            )}
            Salud CRM del desarrollo
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Cumplimiento <strong>{report.compliancePct}%</strong> · Confianza{" "}
            <strong>{report.confidencePct}%</strong> ·{" "}
            <strong>{report.pipelineExcludedCount}</strong> lead(s) excluidos del embudo confiable
            {report.overdueCount > 0 ? (
              <> · <strong className="text-red-700">{report.overdueCount}</strong> paso(s) vencido(s)</>
            ) : null}
          </p>
        </div>
        <Link
          href={`/admin/crm-compliance?desarrolloId=${encodeURIComponent(desarrolloId)}`}
          className="text-sm font-semibold text-gabi-forest hover:underline"
        >
          Abrir Salud CRM
        </Link>
      </div>
    </div>
  );
}
