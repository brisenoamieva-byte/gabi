"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard, MapPinned } from "lucide-react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { writeStoredAsesorSession } from "@/lib/asesores/session-client";
import { isLeadershipAsesorRol, type AsesorSession } from "@/lib/asesores/types";
import { resolveComercializadoraPortalSession } from "@/lib/portal/comercializadora-portals";
import type { PortalSession } from "@/lib/portal/session";
import { PORTAL_STORAGE_KEY } from "@/lib/portal/session";
import { prepareCampoCrmEntry } from "@/lib/session/campo-crm-entry";

export default function InicioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [asesor, setAsesor] = useState<AsesorSession | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const sync = await fetch("/api/acceso/sync-asesor", {
          method: "POST",
          credentials: "same-origin",
        });
        if (sync.status === 401) {
          const me = await fetch("/api/admin/me", { credentials: "same-origin" });
          const meData = (await me.json()) as { authenticated?: boolean };
          if (meData.authenticated) {
            router.replace("/admin/documentos");
            return;
          }
          router.replace("/acceso");
          return;
        }

        const data = (await sync.json()) as {
          asesor?: AsesorSession;
          portal?: PortalSession | null;
        };

        if (data.asesor) {
          writeStoredAsesorSession(data.asesor);
          setAsesor(data.asesor);
          const portal =
            data.portal ?? resolveComercializadoraPortalSession("bbr");
          if (portal) {
            localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(portal));
          }
        } else {
          router.replace("/admin/documentos");
        }
      } catch {
        router.replace("/acceso");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  const openAdmin = () => {
    router.push("/admin/documentos");
  };

  const openCampo = () => {
    if (!asesor) {
      return;
    }

    const path = prepareCampoCrmEntry(asesor, asesor.desarrollosIds[0] ?? null);
    router.push(path);
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#F2F0E9] text-slate-500">
        Cargando…
      </main>
    );
  }

  if (!asesor) {
    return null;
  }

  const firstName = asesor.nombre.split(" ")[0];
  const isLeadership = isLeadershipAsesorRol(asesor.rol);

  return (
    <main className="flex min-h-dvh flex-col bg-[#F2F0E9] px-5 py-10 text-gabi-navy">
      <div className="mx-auto w-full max-w-lg">
        <GabiLogo variant="hero" className="mx-auto" />
        <p className="mt-6 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-gabi-sand">
          Acceso unificado
        </p>
        <h1 className="mt-2 text-center font-[Georgia,'Times_New_Roman',serif] text-3xl text-gabi-navy">
          Hola, {firstName}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">
          Un solo acceso con tu correo. Elige dónde quieres trabajar ahora.
        </p>

        <div className="mt-8 space-y-3">
          {isLeadership ? (
            <button
              type="button"
              onClick={openAdmin}
              className="flex w-full items-center gap-4 rounded-2xl border border-gabi-forest/10 bg-white p-5 text-left shadow-sm transition hover:border-gabi-forest/20"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gabi-forest/10 text-gabi-forest">
                <LayoutDashboard className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-black text-gabi-forest">Panel admin</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Leads, sembrado, equipo, reportes y configuración
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={openCampo}
            className="flex w-full items-center gap-4 rounded-2xl border border-[#6CC24A]/30 bg-white p-5 text-left shadow-sm transition hover:border-[#6CC24A]/50"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#6CC24A]/15 text-[#201044]">
              <MapPinned className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-[#201044]">CRM de campo</span>
              <span className="mt-1 block text-sm text-slate-500">
                Mis leads, recorrido, cotizador y disponibilidad
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          ¿Asesor en showroom con tablet compartida?{" "}
          <Link href="/portal/bbr" className="font-semibold text-gabi-forest underline">
            Entrar con PIN
          </Link>
        </p>
      </div>
    </main>
  );
}
