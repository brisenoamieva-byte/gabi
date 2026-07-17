"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CampanasAdminPanel } from "@/components/admin/CampanasAdminPanel";
import { DesarrolloCampoConfigCard } from "@/components/admin/DesarrolloCampoConfigCard";
import { DesarrolloHubCard } from "@/components/admin/DesarrolloHubCard";
import { DesarrolloOnboardingCard } from "@/components/admin/DesarrolloOnboardingCard";
import { DesarrolloOperativoCard } from "@/components/admin/DesarrolloOperativoCard";
import { MktPresupuestoAdminPanel } from "@/components/admin/MktPresupuestoAdminPanel";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ClipboardList,
  Eye,
  EyeOff,
  LayoutGrid,
  MapPin,
  Megaphone,
  Plus,
  Search,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { ComercializadoraAdminRecord } from "@/lib/admin/catalog-service";
import {
  filterDesarrollosForPersonalVista,
  readShowInactiveDesarrollos,
  writeShowInactiveDesarrollos,
} from "@/lib/admin/hide-inactive-desarrollos";
import { filterDesarrollosHub, getDesarrolloHeroImage } from "@/lib/catalog/desarrollo-hub-utils";
import {
  desarrolloHubHeroImageClass,
  desarrolloHubHeroPaddingClass,
  desarrolloHubHeroShellClass,
  isDesarrolloHubLogoHero,
  resolveDesarrolloHubHeroDisplaySrc,
} from "@/lib/catalog/desarrollo-hub-hero";
import { getDesarrolloXperienceProductId } from "@/lib/comercial/xperience-catalog-ids";
import type { DesarrolloRecord } from "@/lib/catalog/types";
import type { Cluster } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import type { ProspectosResumen } from "@/lib/admin/prospectos-service";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

type HubPermissions = {
  leads: boolean;
  sembrado: boolean;
  asesores: boolean;
  metricas: boolean;
};

type HubTab = "desarrollos" | "marcas";

const HUB_TABS: Array<{ id: HubTab; label: string }> = [
  { id: "desarrollos", label: "Desarrollos" },
  { id: "marcas", label: "Marcas" },
];

type DesarrollosHubPanelProps = {
  desarrollos: DesarrolloRecord[];
  clusters: Cluster[];
  comercializadoras: ComercializadoraAdminRecord[];
  scopeLabel?: string;
  permissions: HubPermissions;
  isSuperAdmin?: boolean;
};

type DesarrolloStats = {
  leadsTotal: number;
  leadsPorEtapa: Record<string, number>;
  campanasTotal: number;
  campanasActivas: number;
  parseurEmail: string | null;
  campanaUpdatedAt: string | null;
  sembradoTotal: number;
  sembradoApartados: number;
  asesoresTotal: number;
  onboardingPct: number | null;
  readyForField: boolean | null;
  loading: boolean;
};

const emptyStats = (): DesarrolloStats => ({
  leadsTotal: 0,
  leadsPorEtapa: {},
  campanasTotal: 0,
  campanasActivas: 0,
  parseurEmail: null,
  campanaUpdatedAt: null,
  sembradoTotal: 0,
  sembradoApartados: 0,
  asesoresTotal: 0,
  onboardingPct: null,
  readyForField: null,
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
  clusters,
  comercializadoras,
  scopeLabel,
  permissions,
  isSuperAdmin = false,
}: DesarrollosHubPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFromUrl = searchParams.get("desarrollo");
  const tabFromUrl = searchParams.get("tab") as HubTab | null;
  const marcaFromUrl = searchParams.get("marca");
  const viewFromUrl = searchParams.get("view");
  const showMktView = viewFromUrl === "mkt";

  const [statsById, setStatsById] = useState<Record<string, DesarrolloStats>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [hubTab, setHubTab] = useState<HubTab>(
    tabFromUrl && HUB_TABS.some((item) => item.id === tabFromUrl) ? tabFromUrl : "desarrollos",
  );
  const [desarrollosState, setDesarrollosState] = useState(desarrollos);
  const [marcaFilter, setMarcaFilter] = useState(marcaFromUrl ?? "");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    setDesarrollosState(desarrollos);
  }, [desarrollos]);

  useEffect(() => {
    setShowInactive(readShowInactiveDesarrollos());
  }, []);

  const inactiveCount = useMemo(
    () => desarrollosState.filter((item) => item.catalogActivo === false).length,
    [desarrollosState],
  );

  const visibleDesarrollos = useMemo(
    () => filterDesarrollosForPersonalVista(desarrollosState, showInactive),
    [desarrollosState, showInactive],
  );

  const comercializadoraNames = useMemo(
    () => Object.fromEntries(comercializadoras.map((item) => [item.id, item.nombre])),
    [comercializadoras],
  );

  const selectedDesarrollo = useMemo(() => {
    if (!desarrollosState.length || !selectedFromUrl) {
      return null;
    }
    return desarrollosState.find((item) => item.id === selectedFromUrl) ?? null;
  }, [desarrollosState, selectedFromUrl]);

  const filteredDesarrollos = useMemo(
    () => filterDesarrollosHub(visibleDesarrollos, searchQuery, marcaFilter || undefined),
    [visibleDesarrollos, marcaFilter, searchQuery],
  );

  const desarrollosByMarca = useMemo(() => {
    const counts = visibleDesarrollos.reduce<Record<string, number>>((acc, item) => {
      acc[item.comercializadoraId] = (acc[item.comercializadoraId] ?? 0) + 1;
      return acc;
    }, {});
    return comercializadoras
      .map((marca) => ({
        ...marca,
        desarrollosAsignados: counts[marca.id] ?? 0,
      }))
      .filter((marca) => marca.desarrollosAsignados > 0);
  }, [comercializadoras, visibleDesarrollos]);

  const toggleShowInactive = () => {
    const next = !showInactive;
    setShowInactive(next);
    writeShowInactiveDesarrollos(next);
  };
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
                campanas?: Array<{
                  activo: boolean;
                  parseur_email?: string | null;
                  updated_at?: string;
                }>;
              };
              if (response.ok && data.campanas) {
                next.campanasTotal = data.campanas.length;
                next.campanasActivas = data.campanas.filter((item) => item.activo).length;
                const activeWithEmail = data.campanas.find(
                  (item) => item.activo && item.parseur_email?.trim(),
                );
                next.parseurEmail = activeWithEmail?.parseur_email?.trim() ?? null;
                const latestUpdate = data.campanas.reduce<string | null>((latest, item) => {
                  if (!item.updated_at) {
                    return latest;
                  }
                  if (!latest || item.updated_at > latest) {
                    return item.updated_at;
                  }
                  return latest;
                }, null);
                next.campanaUpdatedAt = latestUpdate;
              }
            })(),
            (async () => {
              const params = new URLSearchParams({ desarrolloId });
              const response = await fetch(`/api/admin/desarrollos/onboarding?${params.toString()}`);
              const data = (await response.json()) as {
                onboarding?: { progressPct: number; readyForField: boolean };
              };
              if (response.ok && data.onboarding) {
                next.onboardingPct = data.onboarding.progressPct;
                next.readyForField = data.onboarding.readyForField;
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
              const params = new URLSearchParams({ desarrolloId, assignableOnly: "1" });
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
    for (const desarrollo of visibleDesarrollos) {
      void loadStats(desarrollo.id);
    }
  }, [visibleDesarrollos, loadStats]);

  useEffect(() => {
    if (tabFromUrl && HUB_TABS.some((item) => item.id === tabFromUrl)) {
      setHubTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (marcaFromUrl) {
      setMarcaFilter(marcaFromUrl);
    }
  }, [marcaFromUrl]);

  const pushHubUrl = (params: { desarrollo?: string | null; tab?: HubTab; marca?: string | null }) => {
    const next = new URLSearchParams();
    if (params.tab && params.tab !== "desarrollos") {
      next.set("tab", params.tab);
    }
    if (params.marca) {
      next.set("marca", params.marca);
    }
    if (params.desarrollo) {
      next.set("desarrollo", params.desarrollo);
    }
    const qs = next.toString();
    router.push(qs ? `/admin/desarrollos?${qs}` : "/admin/desarrollos");
  };

  const selectDesarrollo = (id: string) => {
    pushHubUrl({ desarrollo: id, tab: hubTab, marca: marcaFilter || null });
  };

  const clearSelection = () => {
    pushHubUrl({ tab: hubTab, marca: marcaFilter || null });
  };

  const setTab = (tab: HubTab) => {
    setHubTab(tab);
    pushHubUrl({
      tab,
      marca: tab === "desarrollos" ? marcaFilter || null : null,
    });
  };

  const selectMarca = (marcaId: string) => {
    setMarcaFilter(marcaId);
    setHubTab("desarrollos");
    pushHubUrl({ tab: "desarrollos", marca: marcaId });
  };

  const clearMarcaFilter = () => {
    setMarcaFilter("");
    pushHubUrl({ tab: "desarrollos" });
  };

  if (!desarrollosState.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados.
      </div>
    );
  }

  if (selectedDesarrollo) {
    const stats = statsById[selectedDesarrollo.id] ?? emptyStats();
    const etapasTop = topEtapas(stats.leadsPorEtapa);
    const xperienceProductId = getDesarrolloXperienceProductId(selectedDesarrollo.id);
    const detailHero = getDesarrolloHeroImage(selectedDesarrollo, clusters);
    const detailAdminHubHero = Boolean(
      selectedDesarrollo.hubHeroImage?.trim() &&
        detailHero === selectedDesarrollo.hubHeroImage.trim(),
    );
    const detailLogoHero = Boolean(
      detailHero &&
        isDesarrolloHubLogoHero(selectedDesarrollo.id, detailHero, {
          adminHubHero: detailAdminHubHero,
        }),
    );
    const detailHeroSrc = detailHero
      ? resolveDesarrolloHubHeroDisplaySrc(
          selectedDesarrollo.id,
          detailHero,
          selectedDesarrollo.logo,
          { adminHubHero: detailAdminHubHero },
        )
      : null;

    if (showMktView && permissions.leads) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("view");
              router.replace(`/admin/desarrollos?${params.toString()}`);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gabi-forest hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a {selectedDesarrollo.nombre}
          </button>
          <MktPresupuestoAdminPanel
            desarrolloId={selectedDesarrollo.id}
            desarrolloNombre={selectedDesarrollo.nombre}
            canEdit={permissions.leads}
            embedded
          />
        </div>
      );
    }

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
            {detailHeroSrc ? (
              detailLogoHero ? (
                <div
                  className={`flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 md:h-44 md:w-56 ${desarrolloHubHeroShellClass(selectedDesarrollo.id)} ${desarrolloHubHeroPaddingClass(selectedDesarrollo.id)}`}
                >
                  <Image
                    src={detailHeroSrc}
                    alt={selectedDesarrollo.nombre}
                    width={960}
                    height={600}
                    className={desarrolloHubHeroImageClass(selectedDesarrollo.id)}
                    sizes="(max-width: 768px) 100vw, 224px"
                    unoptimized={detailHeroSrc.endsWith(".png")}
                  />
                </div>
              ) : (
                <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100 md:h-44 md:w-56">
                  <Image
                    src={detailHeroSrc}
                    alt={selectedDesarrollo.nombre}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 224px"
                  />
                </div>
              )
            ) : selectedDesarrollo.logo ? (
              <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-4 md:h-28 md:w-44">
                <Image
                  src={
                    resolveDesarrolloHubHeroDisplaySrc(
                      selectedDesarrollo.id,
                      selectedDesarrollo.logo,
                      selectedDesarrollo.logo,
                    ) ?? selectedDesarrollo.logo
                  }
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
              {xperienceProductId != null ? (
                <p className="mt-1 text-xs font-semibold tabular-nums text-slate-500">
                  id: {xperienceProductId}
                </p>
              ) : null}
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 shrink-0" />
                {selectedDesarrollo.ubicacion}
              </p>
              <p className="mt-2 text-sm text-slate-600">{selectedDesarrollo.descripcion}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {comercializadoraNames[selectedDesarrollo.comercializadoraId] ??
                    selectedDesarrollo.comercializador}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  Desde {formatPrice(selectedDesarrollo.precioDesde)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {selectedDesarrollo.tiposProducto.join(" · ")}
                </span>
              </div>
              {stats.parseurEmail ? (
                <p className="mt-3 text-xs text-slate-500">
                  Parseur: <span className="font-medium text-slate-700">{stats.parseurEmail}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <DesarrolloOnboardingCard desarrolloId={selectedDesarrollo.id} />

        <DesarrolloCampoConfigCard
          desarrolloId={selectedDesarrollo.id}
          canEdit={isSuperAdmin}
          onSaved={() => {
            void loadStats(selectedDesarrollo.id);
          }}
        />

        <DesarrolloOperativoCard
          desarrolloId={selectedDesarrollo.id}
          desarrolloNombre={selectedDesarrollo.nombre}
          catalogActivo={selectedDesarrollo.catalogActivo !== false}
          canManage={isSuperAdmin}
          onUpdated={(activo) => {
            setDesarrollosState((prev) =>
              prev.map((item) =>
                item.id === selectedDesarrollo.id ? { ...item, catalogActivo: activo } : item,
              ),
            );
            if (!activo && !showInactive) {
              clearSelection();
            }
          }}
        />

        {permissions.leads ? (
          <MktPresupuestoHubCard
            desarrolloId={selectedDesarrollo.id}
            onOpen={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("desarrollo", selectedDesarrollo.id);
              params.set("view", "mkt");
              router.replace(`/admin/desarrollos?${params.toString()}`);
            }}
          />
        ) : null}

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
              href={`/admin/asesores?desarrollo=${encodeURIComponent(selectedDesarrollo.id)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <Users className="h-4 w-4" />
              Asignaciones
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
              desarrollos={desarrollosState}
              embedded
              initialDesarrolloId={selectedDesarrollo.id}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {HUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                hubTab === tab.id
                  ? "border-gabi-forest text-gabi-forest"
                  : "border-transparent text-slate-500 hover:text-gabi-forest"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hubTab === "desarrollos" ? (
            <>
              <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar desarrollo"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-gabi-forest/20 focus:border-gabi-forest focus:ring-2"
                />
              </label>
              {inactiveCount > 0 ? (
                <button
                  type="button"
                  onClick={toggleShowInactive}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    showInactive
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  title={
                    showInactive
                      ? "Ocultar desarrollos pausados de tu vista"
                      : "Mostrar desarrollos pausados en tu vista"
                  }
                >
                  {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {showInactive
                    ? `Ocultar pausados (${inactiveCount})`
                    : `Mostrar pausados (${inactiveCount})`}
                </button>
              ) : null}
            </>
          ) : null}
          {isSuperAdmin ? (
            <Link
              href="/admin/catalogo"
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-gabi-forest/90"
            >
              <Plus className="h-4 w-4" />
              Desarrollo
            </Link>
          ) : null}
        </div>
      </div>

      {scopeLabel ? (
        <p className="text-xs text-slate-500">
          Alcance: <span className="font-semibold">{scopeLabel}</span>
          {!showInactive && inactiveCount > 0 ? (
            <>
              {" "}
              · {inactiveCount} pausado{inactiveCount === 1 ? "" : "s"} oculto
              {inactiveCount === 1 ? "" : "s"} en tu vista
            </>
          ) : null}
        </p>
      ) : !showInactive && inactiveCount > 0 ? (
        <p className="text-xs text-slate-500">
          {inactiveCount} desarrollo{inactiveCount === 1 ? "" : "s"} pausado
          {inactiveCount === 1 ? "" : "s"} oculto{inactiveCount === 1 ? "" : "s"} en tu vista
        </p>
      ) : null}

      {hubTab === "desarrollos" ? (
        <>
          {marcaFilter ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Filtrando por marca:</span>
              <button
                type="button"
                onClick={clearMarcaFilter}
                className="inline-flex items-center gap-1 rounded-full bg-gabi-forest/10 px-3 py-1 font-semibold text-gabi-forest hover:bg-gabi-forest/15"
              >
                {comercializadoraNames[marcaFilter] ?? marcaFilter}
                <span className="text-xs opacity-70">×</span>
              </button>
            </div>
          ) : null}

          {!filteredDesarrollos.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {!showInactive && inactiveCount > 0 && !searchQuery.trim() && !marcaFilter ? (
                <>
                  <p>No hay desarrollos activos en tu vista.</p>
                  <button
                    type="button"
                    onClick={toggleShowInactive}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Mostrar {inactiveCount} pausado{inactiveCount === 1 ? "" : "s"}
                  </button>
                </>
              ) : (
                "No hay desarrollos que coincidan con la búsqueda."
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredDesarrollos.map((desarrollo) => {
                const stats = statsById[desarrollo.id] ?? emptyStats();
                return (
                  <DesarrolloHubCard
                    key={desarrollo.id}
                    desarrollo={desarrollo}
                    clusters={clusters}
                    comercializadoraNames={comercializadoraNames}
                    stats={stats}
                    permissions={permissions}
                    onOpen={() => selectDesarrollo(desarrollo.id)}
                  />
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {hubTab === "marcas" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {desarrollosByMarca.map((marca) => (
            <button
              key={marca.id}
              type="button"
              onClick={() => selectMarca(marca.id)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gabi-forest/20 hover:shadow-md"
              style={{ borderTopWidth: 3, borderTopColor: marca.colorPrimary }}
            >
              <div className="flex items-start gap-4">
                {marca.logo ? (
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <Image
                      src={marca.logo}
                      alt={marca.nombre}
                      width={72}
                      height={40}
                      className="max-h-10 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${marca.colorPrimary}14` }}
                  >
                    <LayoutGrid className="h-6 w-6" style={{ color: marca.colorPrimary }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-gabi-forest">{marca.nombre}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {marca.desarrollosAsignados} desarrollo
                    {marca.desarrollosAsignados === 1 ? "" : "s"} en tu alcance
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gabi-forest group-hover:underline">
                    Ver desarrollos →
                  </p>
                </div>
              </div>
            </button>
          ))}
          {!desarrollosByMarca.length ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No hay marcas configuradas.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Campañas: usar /admin/campanas o el panel embebido en la ficha del desarrollo */}
    </div>
  );
}

function MktPresupuestoHubCard({
  desarrolloId,
  onOpen,
}: {
  desarrolloId: string;
  onOpen: () => void;
}) {
  const [resumen, setResumen] = useState<{
    autorizado: number;
    erogado: number;
    remanente: number;
    pctEjercido: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const anio = new Date().getFullYear();
        const params = new URLSearchParams({
          desarrolloId,
          anio: String(anio),
          mode: "resumen",
        });
        const response = await fetch(`/api/admin/mkt-presupuesto?${params.toString()}`);
        const data = (await response.json()) as {
          resumen?: {
            autorizado: number;
            erogado: number;
            remanente: number;
            pctEjercido: number | null;
          };
        };
        if (!cancelled && response.ok && data.resumen) {
          setResumen(data.resumen);
        }
      } catch {
        if (!cancelled) setResumen(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [desarrolloId]);

  return (
    <div className="rounded-2xl border border-[#201044]/15 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#201044]/10 p-2">
            <Wallet className="h-5 w-5 text-[#201044]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Publicidad / MKT
            </p>
            <p className="mt-1 text-sm font-bold text-gabi-ink">Presupuesto de publicidad</p>
            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Cargando…"
                : resumen && (resumen.autorizado > 0 || resumen.erogado > 0)
                  ? `Autorizado ${formatPrice(resumen.autorizado)} · Erogado ${formatPrice(resumen.erogado)} · Remanente ${formatPrice(resumen.remanente)}`
                  : "Sin presupuesto este año — crea el autorizado y registra gastos."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-xl bg-[#201044] px-4 py-2 text-sm font-bold text-white"
        >
          Administrar
        </button>
      </div>
    </div>
  );
}
