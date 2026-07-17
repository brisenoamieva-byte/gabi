"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, LogOut, Package, Users, BarChart3, Store, Shield, BookOpen, ClipboardList, UserRound, Megaphone, Building2, FolderOpen, Calculator, CalendarClock, ShieldCheck, Handshake, Download } from "lucide-react";
import { PlatformHealthBanner } from "@/components/admin/PlatformHealthBanner";
import { AdminCampoCrmLink } from "@/components/admin/AdminCampoCrmLink";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { adminRolLabel, canAccessModule, canAccessSaludCrm } from "@/lib/admin/permissions";
import {
  ADMIN_DESARROLLO_CHANGE_EVENT,
  readStoredAdminDesarrolloId,
} from "@/lib/admin/admin-desarrollo-session";
import type { AdminModule, AdminProfile } from "@/lib/admin/types";

const navIcons = {
  "/admin/documentos": FileText,
  "/admin/inventario": Package,
  "/admin/asesores": Users,
  "/admin/metricas": BarChart3,
  "/admin/catalogo": Store,
  "/admin/usuarios": Shield,
  "/admin/guion": BookOpen,
  "/admin/sembrado": ClipboardList,
  "/admin/expedientes": FolderOpen,
  "/admin/leads": UserRound,
  "/admin/crm-compliance": ShieldCheck,
  "/admin/campanas": Megaphone,
  "/admin/partners": Handshake,
  "/admin/desarrollos": Building2,
  "/admin/investti-simulador": Calculator,
  "/admin/guardias": CalendarClock,
  "/admin/exportaciones": Download,
} as const;

const navModules: Record<string, AdminModule> = {
  "/admin/documentos": "documentos",
  "/admin/inventario": "inventario",
  "/admin/asesores": "asesores",
  "/admin/metricas": "metricas",
  "/admin/catalogo": "catalogo",
  "/admin/usuarios": "usuarios",
  "/admin/guion": "guion",
  "/admin/sembrado": "sembrado",
  "/admin/expedientes": "expedientes",
  "/admin/leads": "leads",
  "/admin/crm-compliance": "leads",
  "/admin/campanas": "leads",
  "/admin/partners": "leads",
  "/admin/desarrollos": "leads",
  "/admin/investti-simulador": "catalogo",
  "/admin/guardias": "guardias",
  "/admin/exportaciones": "leads",
};

type AdminShellProps = {
  profile: AdminProfile;
  scopeLabel: string;
  children: React.ReactNode;
};

export function AdminShell({ profile, scopeLabel, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [navDesarrolloId, setNavDesarrolloId] = useState<string | null>(null);

  useEffect(() => {
    setNavDesarrolloId(readStoredAdminDesarrolloId());
    const onChange = () => setNavDesarrolloId(readStoredAdminDesarrolloId());
    window.addEventListener(ADMIN_DESARROLLO_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(ADMIN_DESARROLLO_CHANGE_EVENT, onChange);
  }, [pathname]);

  const navHref = (href: string) =>
    navDesarrolloId
      ? `${href}?desarrolloId=${encodeURIComponent(navDesarrolloId)}`
      : href;

  const navItems = [
    { href: "/admin/documentos", label: "Documentos", ready: true },
    { href: "/admin/desarrollos", label: "Desarrollos", ready: true },
    { href: "/admin/leads", label: "Leads", ready: true },
    { href: "/admin/guardias", label: "Guardias", ready: true },
    { href: "/admin/crm-compliance", label: "Salud CRM", ready: true },
    { href: "/admin/campanas", label: "Campañas", ready: true },
    { href: "/admin/partners", label: "Alianzas", ready: true },
    { href: "/admin/sembrado", label: "Sembrado", ready: true },
    { href: "/admin/expedientes", label: "Expedientes", ready: true },
    { href: "/admin/asesores", label: "Equipo", ready: true },
    { href: "/admin/metricas", label: "Reportes", ready: true },
    { href: "/admin/exportaciones", label: "Exportar", ready: true },
    { href: "/admin/guion", label: "Guion", ready: true },
    { href: "/admin/catalogo", label: "Catálogo", ready: true },
  ].filter((item) => {
    if (item.href === "/admin/crm-compliance") {
      return canAccessSaludCrm(profile);
    }
    return canAccessModule(profile, navModules[item.href]);
  });

  const handleLogout = async () => {
    await fetch("/api/gabi/master/logout", { method: "POST" });
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    localStorage.removeItem("gabi_user");
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col gabi-surface text-gabi-ink">
      <header className="shrink-0 border-b border-gabi-forest/10 bg-white px-5 py-4 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <GabiLogo variant="header" href="/admin/documentos" />
            <div className="min-w-0 border-l border-gabi-cream-dark pl-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
                Backoffice
              </p>
              <h1 className="truncate text-lg font-black text-gabi-forest md:text-xl">
                Admin gabi
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AdminCampoCrmLink
              profile={profile}
              desarrolloId={navDesarrolloId}
              variant="header"
            />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-gabi-forest">{profile.nombre}</p>
              <p className="text-xs text-slate-500">{adminRolLabel[profile.rol]}</p>
              <p className="text-[11px] text-slate-400">{scopeLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white transition hover:bg-gabi-forest-light"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 min-h-0 gap-4 px-5 py-4 md:grid-cols-[15rem_1fr] md:px-8">
        <aside className="h-fit shrink-0 rounded-2xl border border-gabi-forest/8 bg-white p-3 shadow-sm">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = navIcons[item.href as keyof typeof navIcons] ?? FileText;
              const active =
                pathname === item.href ||
                (item.href === "/admin/sembrado" && pathname === "/admin/inventario") ||
                (item.href === "/admin/asesores" && pathname === "/admin/usuarios");

              return (
                <div key={item.href}>
                  <Link
                    href={navHref(item.href)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-gabi-forest text-white"
                        : "text-gabi-forest hover:bg-gabi-cream"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                  {item.href === "/admin/leads" ? (
                    <div className="mt-1">
                      <AdminCampoCrmLink
                        profile={profile}
                        desarrolloId={navDesarrolloId}
                        variant="nav"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col gap-2">
          <PlatformHealthBanner />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
