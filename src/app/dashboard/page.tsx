"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Calculator,
  ChevronRight,
  FileText,
  LogOut,
  MapPinned,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AsesorDashboardCrmHero } from "@/components/asesor/AsesorDashboardCrmHero";
import { AsesorBackofficeLink } from "@/components/asesor/AsesorBackofficeLink";
import { AsesorGuardiaHoyCard } from "@/components/asesor/AsesorGuardiaHoyCard";
import { DocumentDownloadButton } from "@/components/DocumentDownloadButton";
import { InstallGabiApp } from "@/components/InstallGabiApp";
import { PrepareOfflineVisitButton } from "@/components/PrepareOfflineVisitButton";
import {
  clearSelectedDesarrollo,
  logoutAsesorSession,
} from "@/lib/session/asesor-session-actions";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

type ToolTile = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  accent?: boolean;
};

const visitTools: ToolTile[] = [
  {
    title: "Nuevo recorrido",
    description: "Guía con el cliente en showroom",
    icon: MapPinned,
    href: "/recorrido",
    accent: true,
  },
  {
    title: "Cotizador",
    description: "Precio y opciones en visita",
    icon: Calculator,
    href: "/cotizador",
  },
  {
    title: "Disponibilidad",
    description: "Unidades y sembrado",
    icon: Building2,
    href: "/disponibilidad",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { authReady, user, desarrollo, portal } = useRequireAsesorSession();

  const handleLogout = () => logoutAsesorSession(router);
  const handleChangeDevelopment = () => clearSelectedDesarrollo(router);

  if (!authReady || !user || !desarrollo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F6F2] text-slate-800">
        <p className="text-sm font-medium text-slate-500">Cargando gabi…</p>
      </main>
    );
  }

  const firstName = user.nombre.split(" ")[0];

  return (
    <main className="flex min-h-screen flex-col bg-[#F7F6F2] text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#F7F6F2]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-5 md:px-10">
          <div className="flex min-w-0 items-center gap-3">
            {portal?.logo ? (
              <Image
                src={portal.logo}
                alt={portal.nombre}
                width={420}
                height={260}
                priority
                className="h-7 w-auto shrink-0 object-contain mix-blend-multiply md:h-8"
              />
            ) : null}
            <div className="min-w-0 border-l border-slate-200 pl-3">
              <p className="truncate text-sm font-semibold text-[#201044]">Hola, {firstName}</p>
              <p className="truncate text-[11px] text-slate-500">{portal?.nombre ?? "Comercial"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AsesorBackofficeLink rol={user.rol} desarrolloId={desarrollo.id} />
            <button
              type="button"
              onClick={handleChangeDevelopment}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:text-sm"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#201044]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 md:gap-6 md:px-10 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          {desarrollo.logo ? (
            <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F7F6F2] p-1.5">
              <Image
                src={desarrollo.logo}
                alt=""
                width={120}
                height={80}
                className="h-auto max-h-8 w-full object-contain"
              />
            </div>
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#201044]/[0.06] text-[#201044]">
              <Building2 className="h-4 w-4" strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Desarrollo activo
            </p>
            <p className="truncate text-[15px] font-semibold text-[#201044]">{desarrollo.nombre}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <AsesorDashboardCrmHero
            asesorId={user.id}
            desarrolloId={desarrollo.id}
            desarrolloNombre={desarrollo.nombre}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <AsesorGuardiaHoyCard asesorId={user.id} desarrolloId={desarrollo.id} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
        >
          <div className="mb-2.5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                Visita en campo
              </p>
              <h2 className="text-sm font-semibold text-[#201044]">Herramientas</h2>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {visitTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group flex min-h-[6.25rem] flex-col justify-between rounded-2xl border p-4 transition active:scale-[0.99] ${
                    tool.accent
                      ? "border-[#201044] bg-[#201044] text-white shadow-[0_8px_24px_rgba(32,16,68,0.18)] hover:bg-[#2a1760]"
                      : "border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl ${
                        tool.accent
                          ? "bg-white/12 text-white"
                          : "bg-[#201044]/[0.06] text-[#201044]"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 transition group-hover:translate-x-0.5 ${
                        tool.accent ? "text-white/40 group-hover:text-white/80" : "text-slate-300 group-hover:text-[#201044]"
                      }`}
                    />
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-semibold ${
                        tool.accent ? "text-white" : "text-[#201044]"
                      }`}
                    >
                      {tool.title}
                    </h3>
                    <p
                      className={`mt-0.5 text-[11px] leading-snug ${
                        tool.accent ? "text-white/65" : "text-slate-500"
                      }`}
                    >
                      {tool.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="grid gap-2.5"
        >
          <AsesorBackofficeLink rol={user.rol} desarrolloId={desarrollo.id} variant="card" />

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044]/[0.06] text-[#201044]">
              <FileText className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                Material
              </p>
              <h3 className="text-sm font-semibold text-[#201044]">Brochure PDF</h3>
            </div>
            <DocumentDownloadButton
              variant="desarrollo"
              desarrolloId={desarrollo.id}
              className="shrink-0"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="grid gap-2.5"
        >
          <PrepareOfflineVisitButton
            desarrolloId={desarrollo.id}
            desarrolloNombre={desarrollo.nombre}
          />
          <InstallGabiApp variant="dashboard" />
        </motion.div>

        <p className="mt-auto pt-1 text-center text-[11px] text-slate-400">
          gabi · CRM y herramientas de venta en campo
        </p>
      </section>
    </main>
  );
}
