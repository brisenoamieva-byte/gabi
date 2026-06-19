"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Calculator,
  ChevronRight,
  FileText,
  LogOut,
  MapPinned,
  Route,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useGabiOperator } from "@/components/gabi/useGabiOperator";
import { GABI_ECOSYSTEM } from "@/lib/gabi/ecosystem";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentDownloadButton } from "@/components/DocumentDownloadButton";
import { InstallGabiApp } from "@/components/InstallGabiApp";
import { PrepareOfflineVisitButton } from "@/components/PrepareOfflineVisitButton";
import {
  clearSelectedDesarrollo,
  logoutAsesorSession,
} from "@/lib/session/asesor-session-actions";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";
import { formatPrice, type Desarrollo } from "@/lib/data";

type QuickAction = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  renderExtra?: (desarrollo: Desarrollo) => React.ReactNode;
};

const OPERATOR_MODULE_ICONS: Record<string, LucideIcon> = {
  propuestas: FileText,
  estudios: BarChart3,
  admin: Settings,
};

const operatorDirectLinks = GABI_ECOSYSTEM.filter(
  (modulo) => modulo.visibilidad === "operador" && modulo.id !== "centro",
);

const quickActions: QuickAction[] = [
  {
    title: "Mis prospectos",
    description: "Seguimiento de tus leads",
    icon: UsersRound,
    href: "/mis-leads",
  },
  {
    title: "Cotizador",
    description: "Precio y opciones en visita",
    icon: Calculator,
    href: "/cotizador",
  },
  {
    title: "Disponibilidad",
    description: "Unidades y estatus del sembrado",
    icon: Building2,
    href: "/disponibilidad",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { isOperator } = useGabiOperator();
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
      {/* Header compacto — contexto, no protagonista */}
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
              <p className="truncate text-sm font-bold text-[#201044]">
                Hola, {firstName}
              </p>
              <p className="truncate text-xs text-slate-500">{portal?.nombre ?? "Comercial"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        {/* Contexto del desarrollo — una línea, no un billboard */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-[#201044]/8 bg-white px-4 py-3 shadow-sm"
        >
          {desarrollo.logo ? (
            <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F2F0E9] p-1.5">
              <Image
                src={desarrollo.logo}
                alt=""
                width={120}
                height={80}
                className="h-auto max-h-8 w-full object-contain"
              />
            </div>
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
              <Building2 className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-[#201044]">{desarrollo.nombre}</p>
            <p className="text-xs text-slate-500">
              Desde {formatPrice(desarrollo.precioDesde)} · {desarrollo.ubicacion}
            </p>
          </div>
          {desarrollo.desarrolladorLogo ? (
            <Image
              src={desarrollo.desarrolladorLogo}
              alt={desarrollo.desarrollador}
              width={100}
              height={40}
              className="hidden h-6 w-auto shrink-0 object-contain opacity-80 sm:block"
            />
          ) : null}
        </motion.div>

        {/* CTA principal — lo primero que debe tocar el asesor */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Link
            href="/recorrido"
            className="group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-[#6cc24a] p-6 text-[#201044] shadow-lg shadow-[#6cc24a]/25 transition active:scale-[0.99] md:min-h-[10.5rem] md:p-8"
          >
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15" />
            <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[#201044]/5" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#201044]/12">
                <MapPinned className="h-7 w-7" strokeWidth={2.25} />
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#201044] text-white transition group-hover:scale-105">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
            <div className="relative mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#201044]/60">
                Acción principal
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                Nuevo recorrido
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#201044]/75 md:text-base">
                Guía paso a paso con el cliente en showroom o campo.
              </p>
            </div>
          </Link>
        </motion.div>

        {isOperator ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.055 }}
          >
            <Link
              href="/gabi"
              className="group flex min-h-[7rem] flex-col justify-between rounded-2xl border border-[#201044]/20 bg-[#201044] p-5 text-white shadow-sm transition hover:shadow-md active:scale-[0.99] md:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/12">
                  <Brain className="h-6 w-6" />
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 text-white/80 transition group-hover:border-white/40">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Operador · Ricardo Briseño
                </p>
                <h2 className="mt-1 text-xl font-black">Centro gabi</h2>
                <p className="mt-1 text-sm text-white/75">
                  Propuestas, estudios, corredor sur y operación integral.
                </p>
              </div>
            </Link>
          </motion.div>
        ) : null}

        {isOperator ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Accesos directos · operador
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {operatorDirectLinks.map((modulo) => {
                const Icon = OPERATOR_MODULE_ICONS[modulo.id] ?? FileText;
                return (
                  <Link
                    key={modulo.id}
                    href={modulo.href}
                    className="group flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-[#201044]/12 bg-white p-4 shadow-sm transition hover:border-[#201044]/25 hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#201044]/6 text-[#201044]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-[#201044]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#201044]">{modulo.titulo}</h3>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                        {modulo.descripcion}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <Link
            href="/corredor"
            className="group flex min-h-[7rem] flex-col justify-between rounded-2xl border border-[#201044]/10 bg-white p-5 shadow-sm transition hover:border-[#6cc24a]/40 hover:shadow-md active:scale-[0.99] md:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
                <Route className="h-6 w-6" />
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400 transition group-hover:border-[#201044]/20 group-hover:text-[#201044]">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Zona sur · Corregidora / Batán
              </p>
              <h2 className="mt-1 text-xl font-black text-[#201044]">Corredor Metropolitano</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mapa, comparativo y filtros para vender terrenos en el corredor 411 / 413.
              </p>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid gap-3"
        >
          <PrepareOfflineVisitButton
            desarrolloId={desarrollo.id}
            desarrolloNombre={desarrollo.nombre}
          />
          <InstallGabiApp variant="dashboard" />
        </motion.div>

        {/* Herramientas secundarias — grid equilibrado */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-3 sm:grid-cols-2"
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href!}
                className="group flex min-h-[6.5rem] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-[#201044]/12 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#201044]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#201044]">{action.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{action.description}</p>
                </div>
              </Link>
            );
          })}

          <div className="flex min-h-[6.5rem] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Material
            </p>
            <div>
              <h3 className="text-lg font-black text-[#201044]">Brochure</h3>
              <p className="mt-0.5 text-xs text-slate-500">PDF oficial del desarrollo</p>
              <DocumentDownloadButton
                variant="desarrollo"
                desarrolloId={desarrollo.id}
                className="mt-3"
              />
            </div>
          </div>
        </motion.div>

        <p className="mt-auto pt-4 text-center text-xs text-slate-400">
          gabi · Guía comercial en visita
        </p>
      </section>
    </main>
  );
}
