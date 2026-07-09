"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  PauseCircle,
  Users,
} from "lucide-react";
import type { DesarrolloRecord } from "@/lib/catalog/types";
import {
  desarrolloDisplayId,
  formatCatalogDate,
  getDesarrolloHeroImage,
  resolveComercializadorLabel,
} from "@/lib/catalog/desarrollo-hub-utils";
import {
  desarrolloHubHeroImageClass,
  desarrolloHubHeroPaddingClass,
  desarrolloHubHeroShellClass,
  isDesarrolloHubLogoHero,
  resolveDesarrolloHubHeroDisplaySrc,
} from "@/lib/catalog/desarrollo-hub-hero";
import type { Cluster } from "@/lib/data";

export type DesarrolloHubCardStats = {
  leadsTotal: number;
  campanasActivas: number;
  sembradoApartados: number;
  asesoresTotal: number;
  parseurEmail: string | null;
  campanaUpdatedAt: string | null;
  onboardingPct: number | null;
  readyForField: boolean | null;
  loading: boolean;
};

type DesarrolloHubCardProps = {
  desarrollo: DesarrolloRecord;
  clusters: Cluster[];
  comercializadoraNames: Record<string, string>;
  stats: DesarrolloHubCardStats;
  permissions: {
    leads: boolean;
    sembrado: boolean;
    asesores: boolean;
  };
  onOpen: () => void;
};

export function DesarrolloHubCard({
  desarrollo,
  clusters,
  comercializadoraNames,
  stats,
  permissions,
  onOpen,
}: DesarrolloHubCardProps) {
  const heroImage = getDesarrolloHeroImage(desarrollo, clusters);
  const adminHubHero = Boolean(
    desarrollo.hubHeroImage?.trim() && heroImage === desarrollo.hubHeroImage.trim(),
  );
  const logoHero = Boolean(
    heroImage && isDesarrolloHubLogoHero(desarrollo.id, heroImage, { adminHubHero }),
  );
  const heroDisplaySrc = heroImage
    ? resolveDesarrolloHubHeroDisplaySrc(desarrollo.id, heroImage, desarrollo.logo, {
        adminHubHero,
      })
    : null;
  const xperienceId = desarrolloDisplayId(desarrollo);
  const createdLabel = formatCatalogDate(desarrollo.createdAt);
  const updatedLabel =
    formatCatalogDate(desarrollo.updatedAt) ?? formatCatalogDate(stats.campanaUpdatedAt);
  const marcaLabel = resolveComercializadorLabel(desarrollo, comercializadoraNames);
  const isCatalogActivo = desarrollo.catalogActivo !== false;
  const isMarketActive = desarrollo.estado === "activo";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-gabi-forest/20 hover:shadow-md">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        <div
          className={`relative aspect-[16/10] w-full overflow-hidden ${
            logoHero ? desarrolloHubHeroShellClass(desarrollo.id) : "bg-slate-100"
          }`}
        >
          {heroDisplaySrc ? (
            logoHero ? (
              <div
                className={`absolute inset-0 flex items-center justify-center ${desarrolloHubHeroPaddingClass(desarrollo.id)}`}
              >
                <Image
                  src={heroDisplaySrc}
                  alt={desarrollo.nombre}
                  width={960}
                  height={600}
                  className={desarrolloHubHeroImageClass(desarrollo.id)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  unoptimized={heroDisplaySrc.endsWith(".png")}
                />
              </div>
            ) : (
              <Image
                src={heroDisplaySrc}
                alt={desarrollo.nombre}
                fill
                className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            )
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: `${desarrollo.colorPrincipal}14` }}
            >
              <Building2 className="h-12 w-12" style={{ color: desarrollo.colorPrincipal }} />
            </div>
          )}
          {xperienceId ? (
            <span className="absolute right-2 top-2 rounded-md bg-[#1a2b4a]/90 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white shadow">
              Id: {xperienceId}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-lg font-black leading-tight text-gabi-forest group-hover:text-gabi-forest-light">
              {desarrollo.nombre}
            </h3>
            {isCatalogActivo ? (
              isMarketActive ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                  aria-label="Activo"
                />
              ) : (
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-label="Próximamente" />
              )
            ) : (
              <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-label="Pausado" />
            )}
          </div>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {marcaLabel}
            {!isCatalogActivo ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                Pausado
              </span>
            ) : null}
          </p>

          {stats.parseurEmail ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate" title={stats.parseurEmail}>
                {stats.parseurEmail}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xs italic text-slate-400">Sin email Parseur en campaña activa</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <p>
              <span className="font-semibold text-slate-400">Creado</span>
              <br />
              {createdLabel ?? "—"}
            </p>
            <p>
              <span className="font-semibold text-slate-400">Actualizado</span>
              <br />
              {updatedLabel ?? "—"}
            </p>
          </div>

          {stats.loading ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando métricas…
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {permissions.leads ? (
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Leads</p>
                  <p className="text-base font-black text-gabi-forest">{stats.leadsTotal}</p>
                </div>
              ) : null}
              {permissions.leads ? (
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Campañas</p>
                  <p className="text-base font-black text-gabi-forest">{stats.campanasActivas}</p>
                </div>
              ) : null}
              {permissions.sembrado ? (
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Apartados</p>
                  <p className="text-base font-black text-gabi-forest">{stats.sembradoApartados}</p>
                </div>
              ) : null}
              {permissions.asesores ? (
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Asesores</p>
                  <p className="text-base font-black text-gabi-forest">{stats.asesoresTotal}</p>
                </div>
              ) : null}
            </div>
          )}

          {!stats.loading && stats.onboardingPct !== null ? (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-semibold text-slate-500">Listo para campo</span>
                <span
                  className={`font-bold ${
                    stats.readyForField ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {stats.onboardingPct}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    stats.readyForField ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                  style={{ width: `${Math.min(100, stats.onboardingPct)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </button>

      {permissions.asesores ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <Link
            href={`/admin/asesores?desarrollo=${encodeURIComponent(desarrollo.id)}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gabi-forest/15 bg-white py-2 text-sm font-bold text-gabi-forest transition hover:bg-gabi-forest/5"
            onClick={(event) => event.stopPropagation()}
          >
            <Users className="h-4 w-4" />
            Asignaciones
          </Link>
        </div>
      ) : null}
    </article>
  );
}
