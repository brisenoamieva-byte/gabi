"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LogOut, MapPin } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { applyDesarrolloCodeDefaults } from "@/lib/catalog/code-sync";
import {
  isInvesttiCatalogDesarrollo,
  type InvesttiCatalogDesarrolloId,
} from "@/lib/catalog/investti-desarrollos";
import { INVESTTI_DESARROLLO_LOGOS } from "@/lib/catalog/investti-recorrido-data";
import type { DesarrolloRecord } from "@/lib/catalog/types";
import {
  getDesarrolloIniciales,
  getDesarrolloLogoUrl,
} from "@/lib/corredor/desarrollo-logos";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
  type PortalSession,
} from "@/lib/portal/session";
import { refreshStoredAsesorSession } from "@/lib/asesores/session-client";
import { formatPrice, type Asesor } from "@/lib/data";

type SessionUser = Pick<Asesor, "id" | "nombre" | "email" | "rol" | "desarrollosIds">;

const PRODUCTO_LABEL: Record<string, string> = {
  casas: "Casas",
  terrenos: "Terrenos",
  departamentos: "Deptos",
  oficinas: "Oficinas",
};

function resolveLogo(desarrollo: DesarrolloRecord): string | undefined {
  if (isInvesttiCatalogDesarrollo(desarrollo.id)) {
    return INVESTTI_DESARROLLO_LOGOS[desarrollo.id as InvesttiCatalogDesarrolloId];
  }
  return desarrollo.logo ?? getDesarrolloLogoUrl({ id: desarrollo.id });
}

export default function DesarrollosPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [portal, setPortal] = useState<PortalSession | null>(null);
  const [desarrollosDisponibles, setDesarrollosDisponibles] = useState<DesarrolloRecord[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const portalPath = useMemo(() => resolveAdvisorEntryPath(portal), [portal]);

  useEffect(() => {
    const storedUser = localStorage.getItem("gabi_user");
    const session = readPortalSession();

    if (!storedUser || !session) {
      router.replace(session ? portalPath : "/portal");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as SessionUser;
      setUser(parsedUser);
      setPortal(session);

      const loadDesarrollos = async () => {
        setLoadingCatalog(true);
        try {
          const freshUser = (await refreshStoredAsesorSession(parsedUser)) ?? parsedUser;
          setUser(freshUser);

          const ids = freshUser.desarrollosIds.join(",");
          const response = await fetch(`/api/catalog/desarrollos?ids=${encodeURIComponent(ids)}`);
          const data = (await response.json()) as { desarrollos?: DesarrolloRecord[] };
          setDesarrollosDisponibles(
            (data.desarrollos ?? []).map((item) => applyDesarrolloCodeDefaults(item)),
          );
        } catch {
          setDesarrollosDisponibles([]);
        } finally {
          setLoadingCatalog(false);
        }
      };

      void loadDesarrollos();
    } catch {
      localStorage.removeItem("gabi_user");
      router.replace(portalPath);
    }
  }, [portalPath, router]);

  const handleSelect = (desarrolloId: string) => {
    localStorage.setItem("gabi_desarrollo", desarrolloId);
    router.push("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("gabi_user");
    localStorage.removeItem("gabi_desarrollo");
    router.replace(portalPath);
  };

  const accent = portal?.colorAccent ?? "#6cc24a";
  const primary = portal?.colorPrimary ?? "#201044";

  if (!user) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#F8FAFC", color: primary }}
      >
        <p className="text-lg font-semibold">Cargando desarrollos...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]" style={{ color: primary }}>
      <header className="border-b border-black/8 bg-white px-5 py-3 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {portal?.logo ? (
              <Image
                src={portal.logo}
                alt={portal.nombre}
                width={420}
                height={260}
                priority
                className="h-9 w-auto shrink-0 object-contain mix-blend-multiply md:h-10"
              />
            ) : null}
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: accent }}
              >
                {portal?.nombre ?? "Guía comercial"}
              </p>
              <h1 className="truncate text-xl font-bold md:text-2xl">Elige un desarrollo</h1>
              <p className="truncate text-xs text-slate-500 md:text-sm">
                Hola, {user.nombre}. Selecciona dónde vas a trabajar hoy.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden flex-col items-end lg:flex">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Plataforma
              </p>
              <GabiLogo variant="platform" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-white shadow-sm transition active:scale-95 md:min-h-11 md:min-w-11"
              style={{ backgroundColor: primary }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-5 md:px-8 md:py-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <p className="text-sm text-slate-500">
            {loadingCatalog
              ? "Cargando catálogo…"
              : `${desarrollosDisponibles.length} desarrollo${desarrollosDisponibles.length === 1 ? "" : "s"} asignado${desarrollosDisponibles.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {loadingCatalog ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[4.75rem] animate-pulse rounded-xl bg-white ring-1 ring-black/5"
              />
            ))
          ) : desarrollosDisponibles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/15 bg-white p-6 text-center sm:col-span-2">
              <p className="font-bold">Sin desarrollos asignados</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Tu usuario no tiene proyectos activos. Pide a tu coordinador que revise tu perfil
                en el panel admin de gabi.
              </p>
            </div>
          ) : (
            desarrollosDisponibles.map((desarrollo, index) => {
              const logo = resolveLogo(desarrollo);

              return (
                <motion.button
                  key={desarrollo.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  onClick={() => handleSelect(desarrollo.id)}
                  className="group flex items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-px hover:shadow-md active:scale-[0.995] sm:gap-3.5 sm:p-3.5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F2F0E9] p-1.5 sm:h-14 sm:w-14">
                    {logo ? (
                      <Image
                        src={logo}
                        alt=""
                        width={112}
                        height={112}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span
                        className="text-xs font-black tracking-tight"
                        style={{ color: primary }}
                      >
                        {getDesarrolloIniciales(desarrollo.nombre)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold leading-tight sm:text-base">
                      {desarrollo.nombre}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500 sm:text-xs">
                      <MapPin className="h-3 w-3 shrink-0 opacity-60" />
                      {desarrollo.ubicacion}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {desarrollo.tiposProducto.map((tipo) => (
                        <span
                          key={tipo}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {PRODUCTO_LABEL[tipo] ?? tipo}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-center gap-2 pl-1">
                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Desde
                      </p>
                      <p className="text-sm font-bold leading-none sm:text-base">
                        {formatPrice(desarrollo.precioDesde)}
                      </p>
                    </div>
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white transition group-hover:translate-x-0.5 sm:h-9 sm:w-9"
                      style={{ backgroundColor: accent }}
                    >
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
