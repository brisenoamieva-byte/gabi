"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LogOut, MapPin } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GabiLogo } from "@/components/brand/GabiLogo";
import type { DesarrolloRecord } from "@/lib/catalog/types";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
  type PortalSession,
} from "@/lib/portal/session";
import { refreshStoredAsesorSession } from "@/lib/asesores/session-client";
import type { Asesor } from "@/lib/data";
import { formatPrice } from "@/lib/data";

type SessionUser = Pick<Asesor, "id" | "nombre" | "email" | "rol" | "desarrollosIds">;

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
          setDesarrollosDisponibles(data.desarrollos ?? []);
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
      <header className="border-b border-black/8 bg-white px-5 py-4 shadow-sm md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {portal?.logo ? (
              <Image
                src={portal.logo}
                alt={portal.nombre}
                width={420}
                height={260}
                priority
                className="h-10 w-auto shrink-0 object-contain mix-blend-multiply md:h-12"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
                {portal?.nombre ?? "Guía comercial"}
              </p>
              <h1 className="truncate text-2xl font-bold md:text-3xl">Elige un desarrollo</h1>
              <p className="mt-1 text-sm text-slate-500">
                Hola, {user.nombre}. Selecciona dónde vas a trabajar hoy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:shrink-0">
            <div className="hidden flex-col items-end sm:flex">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Plataforma
              </p>
              <GabiLogo variant="platform" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-md transition active:scale-95 md:min-h-14 md:px-6"
              style={{ backgroundColor: primary }}
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold md:text-4xl">Desarrollos asignados</h2>
          <p className="mt-3 max-w-2xl text-base text-slate-500">
            Selecciona el desarrollo para iniciar un recorrido guiado con gabi.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {loadingCatalog ? (
            <p className="text-sm text-slate-500 md:col-span-2">Cargando catálogo...</p>
          ) : desarrollosDisponibles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center md:col-span-2">
              <p className="text-lg font-bold">Sin desarrollos asignados</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Tu usuario no tiene proyectos activos. Pide a tu coordinador que revise tu perfil
                en el panel admin de gabi.
              </p>
            </div>
          ) : (
            desarrollosDisponibles.map((desarrollo, index) => (
              <motion.button
                key={desarrollo.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
                onClick={() => handleSelect(desarrollo.id)}
                className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
              >
                <div className="relative min-h-52 bg-gradient-to-br from-slate-50 to-white p-6">
                  {desarrollo.logo ? (
                    <div className="flex min-h-32 items-center justify-center rounded-xl border border-black/8 bg-white p-4">
                      <Image
                        src={desarrollo.logo}
                        alt={desarrollo.nombre}
                        width={260}
                        height={220}
                        className="h-auto max-h-24 w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="mt-5">
                    <h3 className="text-2xl font-bold">{desarrollo.nombre}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm opacity-70">
                      <MapPin className="h-4 w-4" />
                      {desarrollo.ubicacion}
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-500">{desarrollo.descripcion}</p>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Desde
                      </p>
                      <p className="text-xl font-bold">{formatPrice(desarrollo.precioDesde)}</p>
                    </div>
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white transition group-hover:translate-x-0.5"
                      style={{ backgroundColor: accent }}
                    >
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
