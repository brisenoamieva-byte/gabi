"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LogOut, Package, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { adminRolLabel, canAccessModule } from "@/lib/admin/permissions";
import type { AdminModule, AdminProfile } from "@/lib/admin/types";

const navIcons = {
  "/admin/documentos": FileText,
  "/admin/inventario": Package,
  "/admin/asesores": Users,
} as const;

const navModules: Record<string, AdminModule> = {
  "/admin/documentos": "documentos",
  "/admin/inventario": "inventario",
  "/admin/asesores": "asesores",
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
    { href: "/admin/inventario", label: "Productos", ready: true },
    { href: "/admin/asesores", label: "Asesores", ready: true },
  ].filter((item) => canAccessModule(profile, navModules[item.href]));

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#f4f2f8] text-[#1e293b]">
      <header className="border-b border-[#201044]/10 bg-white px-5 py-4 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6cc24a]">
              Backoffice
            </p>
            <h1 className="text-xl font-black text-[#201044] md:text-2xl">
              Admin gabi
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-[#201044]">{profile.nombre}</p>
              <p className="text-xs text-slate-500">{adminRolLabel[profile.rol]}</p>
              <p className="text-[11px] text-slate-400">{scopeLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[15rem_1fr] md:px-8 md:py-8">
        <aside className="h-fit rounded-2xl border border-[#201044]/8 bg-white p-3 shadow-sm">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = navIcons[item.href as keyof typeof navIcons] ?? FileText;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#201044] text-white"
                      : "text-[#201044] hover:bg-slate-50"
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
