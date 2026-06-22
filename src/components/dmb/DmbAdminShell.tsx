"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, LogOut, MapPin, Presentation } from "lucide-react";
import { DmbLogo, DmbTagline } from "@/components/brand/DmbLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { adminRolLabel } from "@/lib/admin/permissions";
import { DMB_ADMIN } from "@/lib/dmb/admin-routes";
import { dmbHubPath } from "@/lib/dmb/routes";
import type { AdminProfile } from "@/lib/admin/types";

const navItems = [
  { href: DMB_ADMIN.hub, label: "Inicio", icon: BriefcaseBusiness, exact: true },
  { href: DMB_ADMIN.propuestas, label: "Propuestas", icon: BriefcaseBusiness, prefix: "/admin/dmb/propuestas" },
  { href: DMB_ADMIN.estudiosNubo, label: "Estudios NUBO", icon: Presentation, prefix: DMB_ADMIN.estudiosNubo },
  { href: DMB_ADMIN.corredor, label: "Corredor sur", icon: MapPin, prefix: DMB_ADMIN.corredor },
] as const;

type Props = {
  profile: AdminProfile;
  children: React.ReactNode;
};

export function DmbAdminShell({ profile, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/gabi/master/logout", { method: "POST" });
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    localStorage.removeItem("gabi_user");
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-dmb-surface text-dmb-ink">
      <header className="border-b border-dmb-line bg-white px-5 py-4 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <DmbLogo variant="header" href={DMB_ADMIN.hub} />
            <div className="min-w-0 border-l border-dmb-line pl-4">
              <DmbTagline className="!text-[10px]" />
              <h1 className="truncate text-lg font-black text-dmb-ink md:text-xl">Admin consultoría</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={dmbHubPath()}
              className="hidden text-xs font-semibold text-dmb-accent hover:underline sm:inline"
            >
              Centro DMB
            </Link>
            <Link
              href="/admin/documentos"
              className="hidden text-xs font-semibold text-dmb-muted hover:text-dmb-ink hover:underline md:inline"
            >
              Admin gabi
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-dmb-ink">{profile.nombre}</p>
              <p className="text-xs text-dmb-muted">{adminRolLabel[profile.rol]}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-dmb-ink px-4 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[15rem_1fr] md:px-8 md:py-8">
        <aside className="h-fit rounded-2xl border border-dmb-line bg-white p-3 shadow-sm">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : "prefix" in item && item.prefix
                    ? pathname === item.href || pathname.startsWith(`${item.prefix}/`)
                    : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active ? "bg-dmb-ink text-white" : "text-dmb-ink hover:bg-dmb-surface"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
