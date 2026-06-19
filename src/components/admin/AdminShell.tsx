"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LogOut, Package, Users, BarChart3, Store, Shield, BookOpen, ClipboardList, UserRound, Megaphone, Building2, FolderOpen, Calculator, Presentation, BriefcaseBusiness, MapPin } from "lucide-react";
import { PlatformHealthBanner } from "@/components/admin/PlatformHealthBanner";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { adminRolLabel, canAccessModule } from "@/lib/admin/permissions";
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
  "/admin/campanas": Megaphone,
  "/admin/desarrollos": Building2,
  "/admin/investti-simulador": Calculator,
  "/admin/estudios-nubo": Presentation,
  "/admin/propuestas": BriefcaseBusiness,
  "/admin/corredor": MapPin,
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
  "/admin/campanas": "leads",
  "/admin/desarrollos": "leads",
  "/admin/investti-simulador": "catalogo",
  "/admin/estudios-nubo": "catalogo",
  "/admin/propuestas": "catalogo",
  "/admin/corredor": "catalogo",
};

type AdminShellProps = {
  profile: AdminProfile;
  scopeLabel: string;
  children: React.ReactNode;
};

export function AdminShell({ profile, scopeLabel, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/admin/documentos", label: "Documentos", ready: true },
    { href: "/admin/inventario", label: "Inventario", ready: true },
    { href: "/admin/desarrollos", label: "Desarrollos", ready: true },
    { href: "/admin/leads", label: "Leads", ready: true },
    { href: "/admin/campanas", label: "Campañas", ready: true },
    { href: "/admin/sembrado", label: "Sembrado", ready: true },
    { href: "/admin/expedientes", label: "Expedientes", ready: true },
    { href: "/admin/asesores", label: "Asesores", ready: true },
    { href: "/admin/metricas", label: "Reportes", ready: true },
    { href: "/admin/guion", label: "Guion", ready: true },
    { href: "/admin/catalogo", label: "Catálogo", ready: true },
    { href: "/admin/investti-simulador", label: "Simulador Investti", ready: true },
    { href: "/admin/estudios-nubo", label: "Estudio NUBO", ready: true },
    { href: "/admin/propuestas", label: "Propuestas", ready: true },
    { href: "/admin/corredor", label: "Corredor sur", ready: true },
    { href: "/admin/usuarios", label: "Usuarios", ready: true },
  ].filter((item) => canAccessModule(profile, navModules[item.href]));

  const handleLogout = async () => {
    await fetch("/api/gabi/master/logout", { method: "POST" });
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    localStorage.removeItem("gabi_user");
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen gabi-surface text-gabi-ink">
      <header className="border-b border-gabi-forest/10 bg-white px-5 py-4 shadow-sm md:px-8">
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

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[15rem_1fr] md:px-8 md:py-8">
        <aside className="h-fit rounded-2xl border border-gabi-forest/8 bg-white p-3 shadow-sm">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = navIcons[item.href as keyof typeof navIcons] ?? FileText;
              const active =
                pathname === item.href ||
                (item.href === "/admin/propuestas" && pathname.startsWith("/admin/propuestas/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-gabi-forest text-white"
                      : "text-gabi-forest hover:bg-gabi-cream"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main>
          <PlatformHealthBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
