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
        className="group flex items-center gap-3 rounded-2xl border border-[#2DD4BF]/35 bg-[#2DD4BF]/10 p-4 shadow-sm transition hover:border-[#2DD4BF]/55 hover:bg-[#2DD4BF]/15 active:scale-[0.99] sm:col-span-2"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044]/10 text-[#201044]">
          <LayoutDashboard className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-[#201044]">Panel admin</h3>
          <p className="text-xs text-slate-600">Leads, sembrado, reportes y equipo</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#201044]" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#2DD4BF]/40 bg-[#2DD4BF]/12 px-3 text-xs font-bold text-[#201044] md:px-4 md:text-sm"
    >
      <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
      Admin
    </Link>
  );
}
