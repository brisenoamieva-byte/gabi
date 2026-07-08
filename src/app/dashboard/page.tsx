"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Calculator,
  ChevronRight,
  LogOut,
  MapPinned,
  UsersRound,
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
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] text-[#1e293b]">
        <p className="text-lg font-semibold text-slate-500">Cargando gabi...</p>
      </main>
    );
  }

  const firstName = user.nombre.split(" ")[0];

  return (
    <main className="flex min-h-screen flex-col bg-[#F2F0E9] text-[#1e293b]">
      <header className="border-b border-[#201044]/8 bg-white/90 px-5 py-3 backdrop-blur md:px-10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {portal?.logo ? (
              <Image
                src={portal.logo}
                alt={portal.nombre}
                width={420}
                height={260}
                priority
                className="h-8 w-auto shrink-0 object-contain mix-blend-multiply md:h-9"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#201044]">Hola, {firstName}</p>
              <p className="truncate text-xs text-slate-500">{portal?.nombre ?? "Comercial"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AsesorBackofficeLink rol={user.rol} desarrolloId={desarrollo.id} />
            <button
              type="button"
              onClick={handleChangeDevelopment}
              className="inline-flex min-h-10 items-center rounded-xl border border-[#201044]/12 bg-white px-3 text-xs font-semibold text-[#201044] md:px-4 md:text-sm"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-[#201044] text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-5 py-5 md:px-10 md:py-7">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-[#201044]/8 bg-white px-4 py-2.5 shadow-sm"
        >
          {desarrollo.logo ? (
            <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F2F0E9] p-1">
              <Image
                src={desarrollo.logo}
                alt=""
                width={120}
                height={80}
                className="h-auto max-h-7 w-full object-contain"
              />
            </div>
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#201044]/6 text-[#201044]">
              <Building2 className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-[#201044]">{desarrollo.nombre}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <AsesorDashboardCrmHero
            asesorId={user.id}
            desarrolloId={desarrollo.id}
            desarrolloNombre={desarrollo.nombre}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <AsesorGuardiaHoyCard asesorId={user.id} desarrolloId={desarrollo.id} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Herramientas de visita
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {visitTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group flex min-h-[5.5rem] flex-col justify-between rounded-2xl border p-4 shadow-sm transition active:scale-[0.99] ${
                    tool.accent
                      ? "border-[#6cc24a]/35 bg-[#6cc24a]/8 hover:border-[#6cc24a]/50 hover:bg-[#6cc24a]/12"
                      : "border-slate-200/90 bg-white hover:border-[#201044]/12 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl ${
                        tool.accent
                          ? "bg-[#201044]/10 text-[#201044]"
                          : "bg-[#201044]/6 text-[#201044]"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#201044]"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#201044]">{tool.title}</h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {tool.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-2 sm:grid-cols-2"
        >
          <AsesorBackofficeLink rol={user.rol} desarrolloId={desarrollo.id} variant="card" />
          <Link
            href="/mis-leads"
            className="group flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-[#201044]/12 hover:shadow-md active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
              <UsersRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-[#201044]">Lista y tablero</h3>
              <p className="text-xs text-slate-500">Vista completa de prospectos</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#201044]" />
          </Link>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Material</p>
            <div>
              <h3 className="text-sm font-black text-[#201044]">Brochure PDF</h3>
              <DocumentDownloadButton
                variant="desarrollo"
                desarrolloId={desarrollo.id}
                className="mt-2"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid gap-2"
        >
          <PrepareOfflineVisitButton
            desarrolloId={desarrollo.id}
            desarrolloNombre={desarrollo.nombre}
          />
          <InstallGabiApp variant="dashboard" />
        </motion.div>

        <p className="mt-auto pt-2 text-center text-xs text-slate-400">
          gabi · CRM y herramientas de venta en campo
        </p>
      </section>
    </main>
  );
}
