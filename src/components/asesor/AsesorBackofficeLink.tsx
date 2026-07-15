import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { isLeadershipAsesorRol, type AsesorRol } from "@/lib/asesores/types";

type AsesorBackofficeLinkProps = {
  rol: AsesorRol;
  desarrolloId?: string;
  variant?: "header" | "card";
};

const resolveAdminHref = (desarrolloId?: string) => {
  if (desarrolloId) {
    return `/admin/leads?desarrolloId=${encodeURIComponent(desarrolloId)}`;
  }
  return "/admin";
};

export function AsesorBackofficeLink({
  rol,
  desarrolloId,
  variant = "header",
}: AsesorBackofficeLinkProps) {
  if (!isLeadershipAsesorRol(rol)) {
    return null;
  }

  const href = resolveAdminHref(desarrolloId);

  if (variant === "card") {
    return (
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] active:scale-[0.99]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044]/[0.06] text-[#201044]">
          <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#201044]">Panel admin</h3>
          <p className="text-xs text-slate-500">Leads, sembrado, reportes y equipo</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#201044]" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:text-sm"
    >
      <LayoutDashboard className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2} />
      Admin
    </Link>
  );
}
