"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ClipboardList,
  Loader2,
  MapPin,
  Megaphone,
  UserRound,
  Users,
} from "lucide-react";
import { CampanasAdminPanel } from "@/components/admin/CampanasAdminPanel";
import { DesarrolloOnboardingCard } from "@/components/admin/DesarrolloOnboardingCard";
import type { Desarrollo } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import type { ProspectosResumen } from "@/lib/admin/prospectos-service";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

type HubPermissions = {
  leads: boolean;
  sembrado: boolean;
  asesores: boolean;
  metricas: boolean;
};

type DesarrollosHubPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  permissions: HubPermissions;
};

type DesarrolloStats = {
  leadsTotal: number;
  leadsPorEtapa: Record<string, number>;
  campanasTotal: number;
  campanasActivas: number;
  sembradoTotal: number;
  sembradoApartados: number;
  asesoresTotal: number;
  loading: boolean;
};

const emptyStats = (): DesarrolloStats => ({
  leadsTotal: 0,
  leadsPorEtapa: {},
  campanasTotal: 0,
  campanasActivas: 0,
  sembradoTotal: 0,
  sembradoApartados: 0,
  asesoresTotal: 0,
  loading: true,
});

const APARTADO_ESTATUS = new Set([
  "Apartado",
  "Vendido Cobrado 1er Parte",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
]);

const countSembradoApartados = (porEstatus: Record<string, number>) =>
  Object.entries(porEstatus).reduce(
    (sum, [key, count]) => sum + (APARTADO_ESTATUS.has(key) ? count : 0),
    0,
  );

const topEtapas = (porEtapa: Record<string, number>, limit = 3) =>
  Object.entries(porEtapa)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

export function DesarrollosHubPanel({
  desarrollos,
  scopeLabel,
  permissions,
}: DesarrollosHubPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFromUrl = searchParams.get("desarrollo");
  const [statsById, setStatsById] = useState<Record<string, DesarrolloStats>>({});

  const selectedDesarrollo = useMemo(() => {
    if (!desarrollos.length) {
      return null;
    }
    if (selectedFromUrl) {
      return desarrollos.find((item) => item.id === selectedFromUrl) ?? null;
    }
    return null;
  }, [desarrollos, selectedFromUrl]);

  const loadStats = useCallback(
    async (desarrolloId: string) => {
      setStatsById((prev) => ({
        ...prev,
        [desarrolloId]: { ...(prev[desarrolloId] ?? emptyStats()), loading: true },
      }));

      const next: DesarrolloStats = { ...emptyStats(), loading: false };

      try {
        const tasks: Promise<void>[] = [];

        if (permissions.leads) {
          tasks.push(
            (async () => {
              const params = new URLSearchParams({ desarrolloId, resumen: "1" });
              const response = await fetch(`/api/admin/prospectos?${params.toString()}`);
              const data = (await response.json()) as {
                resumen?: ProspectosResumen;
              };
              if (response.ok && data.resumen) {
                next.leadsTotal = data.resumen.total;
                next.leadsPorEtapa = data.resumen.porEtapa;
              }
            })(),
            (async () => {
              const params = new URLSearchParams({ desarrolloId });
              const response = await fetch(`/api/admin/campanas?${params.toString()}`);
              const data = (await response.json()) as {
                campanas?: Array<{ activo: boolean }>;
              };
              if (response.ok && data.campanas) {
                next.campanasTotal = data.campanas.length;
                next.campanasActivas = data.campanas.filter((item) => item.activo).length;
              }
            })(),
          );
        }

        if (permissions.sembrado) {
          tasks.push(
            (async () => {
              const params = new URLSearchParams({ desarrolloId });
              const response = await fetch(`/api/admin/sembrado?${params.toString()}`);
              const data = (await response.json()) as {
                resumen?: { total: number; porEstatus: Record<string, number> };
              };
              if (response.ok && data.resumen) {
                next.sembradoTotal = data.resumen.total;
                next.sembradoApartados = countSembradoApartados(data.resumen.porEstatus);
              }
            })(),
          );
        }

        if (permissions.asesores) {
          tasks.push(
            (async () => {
              const params = new URLSearchParams({ desarrolloId });
              const response = await fetch(`/api/admin/asesores?${params.toString()}`);
              const data = (await response.json()) as {
                asesores?: unknown[];
              };
              if (response.ok && data.asesores) {
                next.asesoresTotal = data.asesores.length;
              }
            })(),
          );
        }

        await Promise.all(tasks);
      } finally {
        setStatsById((prev) => ({ ...prev, [desarrolloId]: next }));
      }
    },
    [permissions.asesores, permissions.leads, permissions.sembrado],
  );

  useEffect(() => {
    for (const desarrollo of desarrollos) {
      void loadStats(desarrollo.id);
    }
  }, [desarrollos, loadStats]);

  const selectDesarrollo = (id: string) => {
    router.push(`/admin/desarrollos?desarrollo=${encodeURIComponent(id)}`);
  };

  const clearSelection = () => {
    router.push("/admin/desarrollos");
  };

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados.
      </div>
    );
  }

  if (selectedDesarrollo) {
    const stats = statsById[selectedDesarrollo.id] ?? emptyStats();
    const etapasTop = topEtapas(stats.leadsPorEtapa);

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={clearSelection}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gabi-forest hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos los desarrollos
        </button>

        <div
          className="overflow-hidden rounded-2xl border border-gabi-forest/10 bg-white shadow-sm"
          style={{ borderTopWidth: 4, borderTopColor: selectedDesarrollo.colorPrincipal }}
        >
          <div className="flex flex-col gap-6 p-5 md:flex-row md:p-6">
            {selectedDesarrollo.logo ? (
              <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-4 md:h-28 md:w-44">
                <Image
                  src={selectedDesarrollo.logo}
                  alt={selectedDesarrollo.nombre}
                  width={180}
                  height={80}
                  className="max-h-16 w-auto object-contain"
                />
              </div>
            ) : (
              <div
                className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl md:h-28 md:w-44"
                style={{ backgroundColor: `${selectedDesarrollo.colorPrincipal}18` }}
              >
                <Building2 className="h-10 w-10" style={{ color: selectedDesarrollo.colorPrincipal }} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">Desarrollo</p>
              <h2 className="text-2xl font-black text-gabi-forest md:text-3xl">
                {selectedDesarrollo.nombre}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 shrink-0" />
                {selectedDesarrollo.ubicacion}
              </p>
              <p className="mt-2 text-sm text-slate-600">{selectedDesarrollo.descripcion}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {selectedDesarrollo.comercializador}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  Desde {formatPrice(selectedDesarrollo.precioDesde)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {selectedDesarrollo.tiposProducto.join(" · ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DesarrolloOnboardingCard desarrolloId={selectedDesarrollo.id} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {permissions.leads ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Leads</p>
              <p className="mt-1 text-3xl font-black text-gabi-forest">
                {stats.loading ? "—" : stats.leadsTotal}
              </p>
              {etapasTop.length ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  {etapasTop.map(([etapa, count]) => (
                    <li key={etapa}>
                      {prospectoEtapaLabel[etapa as ProspectoEtapa] ?? etapa}: {count}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {permissions.leads ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Campañas</p>
              <p className="mt-1 text-3xl font-black text-gabi-forest">
                {stats.loading ? "—" : stats.campanasActivas}
                <span className="text-lg font-semibold text-slate-400">
                  {" "}
                  / {stats.loading ? "—" : stats.campanasTotal}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Activas / total</p>
            </div>
          ) : null}
          {permissions.sembrado ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Sembrado</p>
              <p className="mt-1 text-3xl font-black text-gabi-forest">
                {stats.loading ? "—" : stats.sembradoApartados}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Apartados · {stats.loading ? "—" : stats.sembradoTotal} unidades
              </p>
            </div>
          ) : null}
          {permissions.asesores ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Asesores</p>
              <p className="mt-1 text-3xl font-black text-gabi-forest">
                {stats.loading ? "—" : stats.asesoresTotal}
              </p>
              <p className="mt-1 text-xs text-slate-500">Asignados al desarrollo</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {permissions.leads ? (
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <UserRound className="h-4 w-4" />
              Leads
            </Link>
          ) : null}
          {permissions.sembrado ? (
            <Link
              href="/admin/sembrado"
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <ClipboardList className="h-4 w-4" />
              Sembrado
            </Link>
          ) : null}
          {permissions.asesores ? (
            <Link
              href="/admin/asesores"
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <Users className="h-4 w-4" />
              Equipo
            </Link>
          ) : null}
          {permissions.metricas ? (
            <Link
              href="/admin/metricas"
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <BarChart3 className="h-4 w-4" />
              Reportes
            </Link>
          ) : null}
          <Link
            href="/admin/campanas"
            className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
          >
            <Megaphone className="h-4 w-4" />
            Campañas (vista completa)
          </Link>
        </div>

        {permissions.leads ? (
          <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
            <CampanasAdminPanel
              desarrollos={desarrollos}
              embedded
              initialDesarrolloId={selectedDesarrollo.id}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">CRM</p>
        <h2 className="text-2xl font-black text-gabi-forest">Desarrollos</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Vista central por proyecto: leads, campañas, sembrado y accesos rápidos.
          {scopeLabel ? ` Alcance: ${scopeLabel}.` : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {desarrollos.map((desarrollo) => {
          const stats = statsById[desarrollo.id] ?? emptyStats();
          const etapasTop = topEtapas(stats.leadsPorEtapa, 2);

          return (
            <button
              key={desarrollo.id}
              type="button"
              onClick={() => selectDesarrollo(desarrollo.id)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gabi-forest/25 hover:shadow-md"
              style={{ borderTopWidth: 4, borderTopColor: desarrollo.colorPrincipal }}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {desarrollo.logo ? (
                    <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-2">
                      <Image
                        src={desarrollo.logo}
                        alt={desarrollo.nombre}
                        width={80}
                        height={48}
                        className="max-h-10 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${desarrollo.colorPrincipal}18` }}
                    >
                      <Building2 className="h-6 w-6" style={{ color: desarrollo.colorPrincipal }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-gabi-forest group-hover:text-gabi-forest-light">
                      {desarrollo.nombre}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {desarrollo.ubicacion}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{desarrollo.comercializador}</p>
                  </div>
                </div>

                {stats.loading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando métricas…
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {permissions.leads ? (
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Leads</p>
                        <p className="text-lg font-black text-gabi-forest">{stats.leadsTotal}</p>
                      </div>
                    ) : null}
                    {permissions.leads ? (
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Campañas</p>
                        <p className="text-lg font-black text-gabi-forest">{stats.campanasActivas}</p>
                      </div>
                    ) : null}
                    {permissions.sembrado ? (
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Apartados</p>
                        <p className="text-lg font-black text-gabi-forest">{stats.sembradoApartados}</p>
                      </div>
                    ) : null}
                    {permissions.asesores ? (
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Asesores</p>
                        <p className="text-lg font-black text-gabi-forest">{stats.asesoresTotal}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {!stats.loading && permissions.leads && etapasTop.length ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {etapasTop
                      .map(
                        ([etapa, count]) =>
                          `${prospectoEtapaLabel[etapa as ProspectoEtapa] ?? etapa} (${count})`,
                      )
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
