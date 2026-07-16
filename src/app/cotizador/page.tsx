"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { ArrowLeft, Copy, LogOut, MapPinned, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CotizadorPanel } from "@/components/CotizadorPanel";
import {
  RecorridoComplianceGate,
  readRecorridoComplianceOverride,
  writeRecorridoComplianceOverride,
} from "@/components/recorrido/RecorridoComplianceGate";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
import { InvesttiDesarrolloLogo } from "@/components/corredor/investti/InvesttiDesarrolloLogo";
import {
  getPrototiposCotizables,
  type CotizadorCatalog,
  type CotizadorEsquema,
} from "@/lib/cotizador";
import type { PasajeEsquemaPago } from "@/lib/cotizador/pasaje-simulador";
import {
  INVESTTI_GRUPO_LOGO,
  isInvesttiCatalogDesarrollo,
} from "@/lib/catalog/investti-desarrollos";
import { getDatosBancarios, type Cluster, type Desarrollo, type Prototipo } from "@/lib/data";
import type { DesarrolloCampoConfig } from "@/lib/catalog/campo-config";
import { isInvesttiSimuladorPortal } from "@/lib/portal/investti-simulador";
import {
  readCotizadorProspectoId,
  RECORRIDO_SNAPSHOT_KEY,
} from "@/lib/asesores/prefill-cotizador-client";
import { useClusterInventario } from "@/lib/inventario/use-cluster-inventario";
import { logoutAsesorSession } from "@/lib/session/asesor-session-actions";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

const RECORRIDO_KEY = RECORRIDO_SNAPSHOT_KEY;

type RecorridoSnapshot = {
  clusterId?: string;
  prototipoId?: string;
  descuento?: number;
  esquema?: CotizadorEsquema;
  cliente?: { nombre?: string; email?: string; telefono?: string };
};

function resolveDefaultCluster(
  recorrido: RecorridoSnapshot | null,
  catalog: CotizadorCatalog,
): string {
  const recorridoClusterId = recorrido?.clusterId?.trim();
  const recorridoCluster =
    recorridoClusterId && catalog.clusters.some((cluster) => cluster.id === recorridoClusterId)
      ? recorridoClusterId
      : undefined;

  return (
    recorridoCluster ??
    catalog.clusters.find(
      (cluster) => getPrototiposCotizables(cluster.id, catalog).length > 0,
    )?.id ??
    catalog.clusters[0]?.id ??
    ""
  );
}

function resolveDefaultPrototipo(
  cluster: string,
  recorrido: RecorridoSnapshot | null,
  catalog: CotizadorCatalog,
): string | undefined {
  const prototipos = cluster ? getPrototiposCotizables(cluster, catalog) : [];
  const recorridoPrototipoId = recorrido?.prototipoId?.trim();

  if (
    recorridoPrototipoId &&
    prototipos.some((prototipo) => prototipo.id === recorridoPrototipoId)
  ) {
    return recorridoPrototipoId;
  }

  return prototipos[0]?.id;
}

type CatalogStatus = "idle" | "loading" | "ready" | "redirecting";

export default function CotizadorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] text-slate-500">
          <p className="text-sm font-medium">Cargando cotizador…</p>
        </main>
      }
    >
      <CotizadorPageContent />
    </Suspense>
  );
}

function CotizadorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkApplied = useRef(false);
  const { authReady, user, desarrollo, portal } = useRequireAsesorSession();
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("idle");
  const [catalog, setCatalog] = useState<CotizadorCatalog>({ clusters: [], prototipos: [] });
  const [campoConfig, setCampoConfig] = useState<DesarrolloCampoConfig | null>(null);
  const [clusterId, setClusterId] = useState("");
  const [prototipoId, setPrototipoId] = useState<string | undefined>();
  const [unidadId, setUnidadId] = useState<string | undefined>();
  const [descuento, setDescuento] = useState(0);
  const [esquema, setEsquema] = useState<CotizadorEsquema>("mensualidades");
  const [pasajeEsquema, setPasajeEsquema] = useState<PasajeEsquemaPago>("contado");
  const [pasajeLibreEnganche, setPasajeLibreEnganche] = useState(0.2);
  const [pasajeLibreMensualidades, setPasajeLibreMensualidades] = useState(0.15);
  const [pasajeLibreFechaFiniquito, setPasajeLibreFechaFiniquito] = useState<
    string | undefined
  >();
  const [pasajeLibreSinMensEnganche, setPasajeLibreSinMensEnganche] = useState(0.2);
  const [pasajeLibreSinMensPago, setPasajeLibreSinMensPago] = useState(0.2);
  const [pasajeLibreSinMensFechaPago, setPasajeLibreSinMensFechaPago] = useState<
    string | undefined
  >();
  const [pasajeLibreSinMensFechaFiniquito, setPasajeLibreSinMensFechaFiniquito] =
    useState<string | undefined>();
  const [clienteNombre, setClienteNombre] = useState<string | undefined>();
  const [clienteEmail, setClienteEmail] = useState<string | undefined>();
  const [clienteTelefono, setClienteTelefono] = useState<string | undefined>();
  const [prospectoRegistrado, setProspectoRegistrado] = useState<string | undefined>();
  const [prospectoId, setProspectoId] = useState<string | undefined>();
  const [copiedBank, setCopiedBank] = useState(false);
  const [complianceGate, setComplianceGate] = useState<{
    playbookEnabled: boolean;
    overdueCount: number;
    pendingCount: number;
    threshold: number;
    pauseThreshold?: number;
    level?: "ok" | "nudge" | "coach" | "pause";
    shouldBlock: boolean;
    allowContinue?: boolean;
    title?: string;
    message: string;
    topExceptions: ProspectoComplianceRow[];
  } | null>(null);
  const [complianceAcknowledged, setComplianceAcknowledged] = useState(false);

  useEffect(() => {
    if (!authReady || !desarrollo) {
      return;
    }

    const loadCatalog = async () => {
      setCatalogStatus("loading");

      try {
        const catalogResponse = await fetch(
          `/api/catalog/recorrido?desarrolloId=${encodeURIComponent(desarrollo.id)}`,
        );
        const catalogData = (await catalogResponse.json()) as {
          desarrollo?: Desarrollo & { campoConfig?: DesarrolloCampoConfig };
          clusters?: Cluster[];
          prototipos?: Prototipo[];
        };

        const selectedDevelopment = catalogData.desarrollo;
        const loadedCatalog: CotizadorCatalog = {
          clusters: catalogData.clusters ?? [],
          prototipos: catalogData.prototipos ?? [],
        };

        if (!selectedDevelopment || selectedDevelopment.estado !== "activo") {
          setCatalogStatus("redirecting");
          router.replace("/desarrollos");
          return;
        }

        const recorridoRaw = localStorage.getItem(RECORRIDO_KEY);
        const recorrido = recorridoRaw
          ? (JSON.parse(recorridoRaw) as RecorridoSnapshot)
          : null;

        const defaultCluster = resolveDefaultCluster(recorrido, loadedCatalog);

        setCatalog(loadedCatalog);
        setCampoConfig(selectedDevelopment.campoConfig ?? null);
        setClusterId(defaultCluster);
        setPrototipoId(resolveDefaultPrototipo(defaultCluster, recorrido, loadedCatalog));
        setDescuento(recorrido?.descuento ?? 0);
        setEsquema(recorrido?.esquema ?? "mensualidades");
        const nombreRecorrido = recorrido?.cliente?.nombre?.trim() || undefined;
        setClienteNombre(nombreRecorrido);
        setClienteEmail(recorrido?.cliente?.email?.trim() || undefined);
        setClienteTelefono(recorrido?.cliente?.telefono?.trim() || undefined);
        setProspectoRegistrado(nombreRecorrido);
        setProspectoId(readCotizadorProspectoId() ?? undefined);
        setCatalogStatus("ready");

        if (user?.id) {
          if (readRecorridoComplianceOverride(user.id)) {
            setComplianceAcknowledged(true);
          }

          void fetch(
            `/api/asesores/crm-compliance/gate?asesorId=${encodeURIComponent(user.id)}&desarrolloId=${encodeURIComponent(selectedDevelopment.id)}`,
          )
            .then((res) => res.json())
            .then((data: { gate?: typeof complianceGate }) => {
              if (data.gate) {
                setComplianceGate(data.gate);
              }
            })
            .catch(() => setComplianceGate(null));
        }
      } catch {
        setCatalogStatus("redirecting");
        logoutAsesorSession(router);
      }
    };

    void loadCatalog();
  }, [authReady, desarrollo, router, user?.id]);

  useEffect(() => {
    if (catalogStatus !== "ready" || deepLinkApplied.current) {
      return;
    }

    const clusterFromUrl = searchParams.get("clusterId")?.trim() || undefined;
    const prototipoFromUrl = searchParams.get("prototipoId")?.trim() || undefined;
    const unidadFromUrl = searchParams.get("unidadId")?.trim() || undefined;

    if (!clusterFromUrl && !prototipoFromUrl && !unidadFromUrl) {
      return;
    }

    deepLinkApplied.current = true;

    if (clusterFromUrl && catalog.clusters.some((cluster) => cluster.id === clusterFromUrl)) {
      setClusterId(clusterFromUrl);
      setPrototipoId(
        prototipoFromUrl &&
          getPrototiposCotizables(clusterFromUrl, catalog).some(
            (prototipo) => prototipo.id === prototipoFromUrl,
          )
          ? prototipoFromUrl
          : resolveDefaultPrototipo(clusterFromUrl, null, catalog),
      );
    } else if (
      prototipoFromUrl &&
      catalog.prototipos.some((prototipo) => prototipo.id === prototipoFromUrl)
    ) {
      setPrototipoId(prototipoFromUrl);
    }

    if (unidadFromUrl) {
      setUnidadId(unidadFromUrl);
    }
  }, [catalog, catalogStatus, searchParams]);

  useEffect(() => {
    if (catalogStatus !== "ready") {
      return;
    }

    try {
      const raw = localStorage.getItem(RECORRIDO_KEY);
      const recorrido = raw ? (JSON.parse(raw) as RecorridoSnapshot) : {};
      localStorage.setItem(
        RECORRIDO_KEY,
        JSON.stringify({
          ...recorrido,
          cliente: { ...recorrido.cliente, nombre: clienteNombre ?? "" },
        }),
      );
    } catch {
      // Ignorar errores de almacenamiento local.
    }
  }, [clienteNombre, catalogStatus]);

  const catalogMemo = useMemo(() => catalog, [catalog]);

  const handleClusterChange = (nextClusterId: string) => {
    const prototipos = getPrototiposCotizables(nextClusterId, catalogMemo);
    setClusterId(nextClusterId);
    setPrototipoId(prototipos[0]?.id);
    setUnidadId(undefined);
    setDescuento(0);
  };

  const handlePrototipoChange = (nextPrototipoId: string | undefined) => {
    setPrototipoId(nextPrototipoId);
    setUnidadId(undefined);
    setDescuento(0);
  };

  const { units: inventarioUnidades } = useClusterInventario(
    desarrollo?.id,
    clusterId || undefined,
  );

  useEffect(() => {
    if (unidadId || catalogStatus !== "ready") {
      return;
    }
    const unidadCode = searchParams.get("unidad")?.trim();
    if (!unidadCode || !inventarioUnidades.length) {
      return;
    }
    const match = inventarioUnidades.find((unit) => unit.unidad === unidadCode);
    if (match) {
      setUnidadId(match.id);
    }
  }, [catalogStatus, inventarioUnidades, searchParams, unidadId]);

  const activeDatosBancarios = useMemo(
    () => getDatosBancarios(desarrollo?.id, campoConfig),
    [campoConfig, desarrollo?.id],
  );

  const copyBankData = async () => {
    const text = [
      activeDatosBancarios.razonSocial,
      `RFC: ${activeDatosBancarios.rfc}`,
      `Banco: ${activeDatosBancarios.banco}`,
      `Sucursal: ${activeDatosBancarios.sucursal}`,
      `Cuenta: ${activeDatosBancarios.cuenta}`,
      `CLABE: ${activeDatosBancarios.clabe}`,
      `Concepto: ${activeDatosBancarios.concepto}`,
      `Reportar a: ${activeDatosBancarios.reportarA}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopiedBank(true);
    window.setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleLogout = () => logoutAsesorSession(router);

  const isReady = authReady && catalogStatus === "ready" && user && desarrollo;

  const showComplianceGate =
    isReady &&
    complianceGate?.playbookEnabled &&
    complianceGate.overdueCount > 0 &&
    !complianceAcknowledged;

  if (showComplianceGate && complianceGate) {
    return (
      <RecorridoComplianceGate
        desarrolloNombre={desarrollo.nombre}
        overdueCount={complianceGate.overdueCount}
        pendingCount={complianceGate.pendingCount}
        threshold={complianceGate.threshold}
        pauseThreshold={complianceGate.pauseThreshold}
        level={complianceGate.level}
        shouldBlock={complianceGate.shouldBlock}
        allowContinue={complianceGate.allowContinue ?? !complianceGate.shouldBlock}
        title={complianceGate.title}
        message={complianceGate.message}
        topExceptions={complianceGate.topExceptions}
        onContinue={() => {
          if (complianceGate.level === "coach" || complianceGate.shouldBlock) {
            writeRecorridoComplianceOverride(user.id);
          }
          setComplianceAcknowledged(true);
        }}
        onBack={() => router.replace("/dashboard")}
      />
    );
  }

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] px-6 text-center text-[#1e293b]">
        <p className="text-base font-semibold sm:text-lg">
          {catalogStatus === "redirecting" || !authReady
            ? "Redirigiendo al acceso de asesores..."
            : "Cargando cotizador..."}
        </p>
      </main>
    );
  }

  const isInvesttiTerreno = isInvesttiCatalogDesarrollo(desarrollo.id);
  const isInvesttiPortal = isInvesttiSimuladorPortal(portal?.slug);
  const showCotizadorAside = !isInvesttiTerreno;

  if (!clusterId && !isInvesttiTerreno) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F2F0E9] px-6 text-center text-[#1e293b]">
        <p className="text-base font-semibold sm:text-lg">
          No hay clusters disponibles para cotizar en {desarrollo.nombre}.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#201044] px-5 text-sm font-bold text-white"
        >
          Volver al dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F0E9] text-[#1e293b]">
      <header className="border-b border-[#201044]/10 bg-white px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-sm sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            {isInvesttiTerreno ? (
              <InvesttiDesarrolloLogo desarrolloId={desarrollo.id} size="header" />
            ) : desarrollo.logo ? (
              <div className="flex h-14 w-[7.5rem] shrink-0 items-center justify-center rounded-2xl border border-[#201044]/8 bg-[#F2F0E9] px-2 py-1.5 shadow-sm sm:h-[4.25rem] sm:w-[10.5rem] sm:px-3 sm:py-2">
                <Image
                  src={desarrollo.logo}
                  alt={desarrollo.nombre}
                  width={220}
                  height={88}
                  className="h-auto max-h-10 w-full object-contain sm:max-h-14"
                  priority
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              {!isInvesttiTerreno ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6cc24a] sm:text-[11px]">
                  Cotización express
                </p>
              ) : null}
              <h1
                className={`text-balance text-xl font-black leading-tight text-[#201044] sm:text-2xl md:text-[1.75rem] ${isInvesttiTerreno ? "" : "mt-1"}`}
              >
                {desarrollo.nombre}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-[0.9375rem]">
                Simulador con inventario real · PDF listo para enviar
              </p>
            </div>
            {isInvesttiCatalogDesarrollo(desarrollo.id) ? (
              <Image
                src={desarrollo.desarrolladorLogo ?? INVESTTI_GRUPO_LOGO}
                alt="Grupo Investti"
                width={120}
                height={48}
                className="hidden h-10 w-auto max-w-[7.5rem] shrink-0 object-contain sm:block"
              />
            ) : portal?.logo ? (
              <Image
                src={portal.logo}
                alt={portal.nombre}
                width={120}
                height={48}
                className="hidden h-8 w-auto shrink-0 object-contain opacity-70 sm:block"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
            {!isInvesttiPortal && prospectoId ? (
              <Link
                href="/mis-leads"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#6cc24a]/30 bg-[#6cc24a]/10 px-4 text-sm font-semibold text-[#201044] shadow-sm transition hover:bg-[#6cc24a]/15 sm:min-h-12 sm:flex-none sm:rounded-2xl sm:px-5"
              >
                <UsersRound className="h-4 w-4" />
                Mis prospectos
              </Link>
            ) : null}
            <Link
              href={isInvesttiPortal ? "/investti/desarrollos" : "/dashboard"}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#201044]/12 bg-white px-4 text-sm font-semibold text-[#201044] shadow-sm transition hover:bg-slate-50 sm:min-h-12 sm:flex-none sm:rounded-2xl sm:px-5"
            >
              <ArrowLeft className="h-4 w-4" />
              {isInvesttiPortal ? "Cambiar desarrollo" : "Dashboard"}
            </Link>
            {!isInvesttiPortal ? (
              <Link
                href="/recorrido"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6cc24a] px-4 text-sm font-bold text-[#201044] shadow-sm transition hover:bg-[#5bad3e] sm:min-h-12 sm:flex-none sm:rounded-2xl sm:px-5"
              >
                <MapPinned className="h-4 w-4" />
                Recorrido
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-semibold text-white shadow-md sm:min-h-12 sm:rounded-2xl sm:px-5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <section
        className={`mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 md:px-10 lg:items-start ${
          showCotizadorAside
            ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]"
            : ""
        }`}
      >
        <div className="rounded-2xl border border-[#201044]/8 bg-white p-4 shadow-lg shadow-[#201044]/5 sm:rounded-[1.75rem] sm:p-6 md:p-7">
          <div className="mt-1 sm:mt-0">
            <CotizadorPanel
              desarrolloId={desarrollo.id}
              desarrolloNombre={desarrollo.nombre}
              desarrolloLogo={desarrollo.logo}
              prospectoRegistrado={prospectoRegistrado}
              clusterId={clusterId}
              prototipoId={prototipoId}
              unidadId={unidadId}
              inventarioUnidades={inventarioUnidades}
              descuento={descuento}
              esquema={esquema}
              clienteNombre={clienteNombre}
              clienteEmail={clienteEmail}
              clienteTelefono={clienteTelefono}
              asesorNombre={user?.nombre}
              asesorId={user?.id}
              prospectoId={prospectoId}
              catalog={catalogMemo}
              campoConfig={campoConfig}
              showSelectors
              showCopy
              showPdf
              onClusterChange={handleClusterChange}
              onPrototipoChange={handlePrototipoChange}
              onUnidadChange={setUnidadId}
              onDescuentoChange={setDescuento}
              onEsquemaChange={setEsquema}
              pasajeEsquema={pasajeEsquema}
              pasajeLibreEnganche={pasajeLibreEnganche}
              pasajeLibreMensualidades={pasajeLibreMensualidades}
              pasajeLibreFechaFiniquito={pasajeLibreFechaFiniquito}
              pasajeLibreSinMensEnganche={pasajeLibreSinMensEnganche}
              pasajeLibreSinMensPago={pasajeLibreSinMensPago}
              pasajeLibreSinMensFechaPago={pasajeLibreSinMensFechaPago}
              pasajeLibreSinMensFechaFiniquito={pasajeLibreSinMensFechaFiniquito}
              onPasajeEsquemaChange={setPasajeEsquema}
              onPasajeLibreEngancheChange={setPasajeLibreEnganche}
              onPasajeLibreMensualidadesChange={setPasajeLibreMensualidades}
              onPasajeLibreFechaFiniquitoChange={setPasajeLibreFechaFiniquito}
              onPasajeLibreSinMensEngancheChange={setPasajeLibreSinMensEnganche}
              onPasajeLibreSinMensPagoChange={setPasajeLibreSinMensPago}
              onPasajeLibreSinMensFechaPagoChange={setPasajeLibreSinMensFechaPago}
              onPasajeLibreSinMensFechaFiniquitoChange={setPasajeLibreSinMensFechaFiniquito}
              onClienteNombreChange={setClienteNombre}
            />
          </div>
        </div>

        {showCotizadorAside ? (
          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-[#201044]/8 bg-white p-5 shadow-md sm:rounded-[1.75rem] sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6CC24A] sm:text-[11px]">
                Datos bancarios
              </p>
              <h3 className="mt-1.5 text-lg font-black text-[#201044]">Para apartado</h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Razón social
                  </dt>
                  <dd className="mt-0.5 break-words text-[0.9375rem] font-semibold leading-snug text-slate-700">
                    {activeDatosBancarios.razonSocial}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      RFC
                    </dt>
                    <dd className="mt-0.5 font-semibold text-slate-700">{activeDatosBancarios.rfc}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Banco
                    </dt>
                    <dd className="mt-0.5 font-semibold text-slate-700">{activeDatosBancarios.banco}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    CLABE
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-slate-700">
                    {activeDatosBancarios.clabe}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Concepto
                  </dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-slate-500">
                    {activeDatosBancarios.concepto}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => void copyBankData()}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-bbr-purple/12 bg-bbr-cream px-4 text-sm font-bold text-bbr-purple transition hover:bg-slate-100 sm:min-h-12"
              >
                <Copy className="h-4 w-4" />
                {copiedBank ? "Datos copiados" : "Copiar datos bancarios"}
              </button>
            </div>

            <div className="rounded-2xl bg-[#201044] p-5 sm:rounded-[1.75rem] sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6CC24A] sm:text-[11px]">
                Guía gabi
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-white/85">
                Propuesta comercial del momento. Seguimiento del prospecto y simulaciones
                bancarias en el CRM del desarrollador.
              </p>
            </div>
          </aside>
        ) : null}
      </section>
    </main>
  );
}
