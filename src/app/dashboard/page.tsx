"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Calculator,
  ChevronRight,
  LogOut,
  MapPinned,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentDownloadButton } from "@/components/DocumentDownloadButton";
import { InstallGabiApp } from "@/components/InstallGabiApp";
import { PrepareOfflineVisitButton } from "@/components/PrepareOfflineVisitButton";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
} from "@/lib/portal/session";
import { formatPrice, type Asesor, type Desarrollo } from "@/lib/data";

type SessionUser = Pick<Asesor, "id" | "nombre" | "email" | "rol" | "desarrollosIds">;

type PortalSession = {
  nombre: string;
  logo: string;
};

type QuickAction = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  renderExtra?: (desarrollo: Desarrollo) => React.ReactNode;
};

const quickActions: QuickAction[] = [
  {
    title: "Cotizador",
    description: "Precio y opciones en visita",
    icon: Calculator,
    href: "/cotizador",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [desarrollo, setDesarrollo] = useState<Desarrollo | null>(null);
  const [portal, setPortal] = useState<PortalSession | null>(null);

  useEffect(() => {
    const portal = readPortalSession();
    const storedUser = localStorage.getItem("gabi_user");
    const storedDevelopment = localStorage.getItem("gabi_desarrollo");

    if (!storedUser) {
      router.replace(portal ? resolveAdvisorEntryPath(portal) : "/portal");
      return;
    }

    if (!storedDevelopment) {
      router.replace("/desarrollos");
      return;
    }

    const loadSession = async () => {
      try {
        const parsedUser = JSON.parse(storedUser) as SessionUser;

        if (!parsedUser.desarrollosIds.includes(storedDevelopment)) {
          localStorage.removeItem("gabi_desarrollo");
          router.replace("/desarrollos");
          return;
        }

        const response = await fetch(
          `/api/catalog/desarrollos?ids=${encodeURIComponent(storedDevelopment)}`,
        );
        const data = (await response.json()) as { desarrollos?: Desarrollo[] };
        const selectedDevelopment = data.desarrollos?.[0];

        if (!selectedDevelopment) {
          localStorage.removeItem("gabi_desarrollo");
          router.replace("/desarrollos");
          return;
        }

        if (portal) {
          setPortal(portal);
        }

        setUser(parsedUser);
        setDesarrollo(selectedDevelopment);
      } catch {
        localStorage.removeItem("gabi_user");
        localStorage.removeItem("gabi_desarrollo");
        router.replace(portal ? resolveAdvisorEntryPath(portal) : "/portal");
      }
    };

    void loadSession();
  }, [router]);

  const handleLogout = () => {
    const portal = readPortalSession();
    localStorage.removeItem("gabi_user");
    localStorage.removeItem("gabi_desarrollo");
    router.replace(portal ? resolveAdvisorEntryPath(portal) : "/portal");
  };

  const handleChangeDevelopment = () => {
    localStorage.removeItem("gabi_desarrollo");
    router.push("/desarrollos");
  };

  if (!user || !desarrollo) {
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
