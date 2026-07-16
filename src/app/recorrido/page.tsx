"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  MapPin,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { PostVisitaModal } from "@/components/recorrido/PostVisitaModal";
import {
  RecorridoComplianceGate,
  readRecorridoComplianceOverride,
  writeRecorridoComplianceOverride,
} from "@/components/recorrido/RecorridoComplianceGate";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
import { trackVisita } from "@/lib/visitas/client";
import { PasajeAcabadosPanel } from "@/components/PasajeAcabadosPanel";
import { CotizadorPanel } from "@/components/CotizadorPanel";
import { InvesttiSimuladorPanel } from "@/components/corredor/investti/InvesttiSimuladorPanel";
import { MisionLaGaviaSimuladorPanel } from "@/components/corredor/mision-la-gavia/MisionLaGaviaSimuladorPanel";
import {
  getCotizadorKind,
  usesDedicatedSimulador,
} from "@/lib/catalog/desarrollos-registry";
import {
  investtiCatalogHasSimulador,
} from "@/lib/catalog/investti-desarrollos";
import {
  isPasajeDepartamentosCluster,
} from "@/lib/catalog/pasaje-alamos-acabados";
import {
  resolveMisionLaGaviaUnidadFromInventario,
  simularMisionLaGavia,
} from "@/lib/corredor/mision-la-gavia-simulador";
import {
  computePasajeSimulador,
  formatMonthYear,
  formatPctShort,
  PASAJE_FECHA_ENTREGA,
  type PasajeUnidadTipo,
} from "@/lib/cotizador/pasaje-simulador";
import { DocumentDownloadButton } from "@/components/DocumentDownloadButton";
import { RecorridoMasterPlanMedia } from "@/components/recorrido/RecorridoMasterPlanMedia";
import {
  availabilityViewDescription,
  mapProductoFiltroToAvailabilityTipo,
  resolveAvailabilityConfig,
} from "@/lib/availability";
import {
  getPrecioDesdeCluster,
  getPrecioDesdePrototipo,
  getUnidadesPorPrototipo,
  prototipoMuestraPrecioDesde,
} from "@/lib/inventario/prototipo-precios";
import { formatAreaM2 } from "@/lib/format/money";
import { useClusterInventario } from "@/lib/inventario/use-cluster-inventario";
import { useDesarrolloInventarioMap } from "@/lib/inventario/use-desarrollo-inventario-map";
import {
  clusters,
  enrichDesarrolloFromStatic,
  getDatosBancarios,
  desarrollos,
  getDisponibilidadesByCluster,
  getPrototipoById,
  prototipos as catalogPrototipos,
  type Cliente,
  type Cluster,
  type Desarrollo,
  type DisponibilidadUnidad,
  type Prototipo,
} from "@/lib/data";
import {
  getDefaultRecorridoContenido,
  type RecorridoContenido,
} from "@/lib/catalog/recorrido-content";
import {
  leadRegistrationMessage,
  shouldQueueLeadForCrm,
} from "@/lib/crm/sync-policy";
import { DEFAULT_RECORRIDO_ETAPAS } from "@/lib/catalog/types";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

import {
  confianzaItems,
  cierreItems,
  initialRecorridoState,
  medioContactoOptions,
  RECORRIDO_VERSION,
} from "@/lib/recorrido/constants";
import {
  buildPriceOptionsFromRange,
  contactMatches,
  DEFAULT_PRICE_OPTIONS,
  getClusterProductLabels,
  getProductoTipo,
  getProductTypeOptionsForDesarrollo,
  hasTerrenos,
  matchesProductoTipo,
  matchesRecamaras,
  normalizeEmail,
  normalizePhone,
  normalizeProductoTipo,
  normalizeRecamarasFiltro,
  PRICE_STEP,
  readLocalArray,
  recamarasOptions,
  roundDownToStep,
  roundUpToStep,
  writeLocalArray,
} from "@/lib/recorrido/filters";
import { formatRecorridoMoney } from "@/lib/recorrido/format";
import {
  RECORRIDO_CLIENTES_KEY,
  RECORRIDO_CRM_PENDING_KEY,
  RECORRIDO_LEADS_KEY,
  RECORRIDO_STORAGE_KEY,
} from "@/lib/recorrido/storage-keys";
import type {
  ClienteTemporal,
  ProductoSeleccion,
  RecamarasSeleccion,
  RecorridoState,
  RecommendedAvailability,
  StoredContact,
} from "@/lib/recorrido/types";
import {
  AvailabilityUnitCard,
  AvailabilityUnitDetail,
  BudgetCurrencyInput,
  Field,
  ListBox,
  Modal,
  NearbyPointsPanel,
  PriceSelector,
  ProductNarrativeCard,
  SectionTitle,
  Spec,
  StepCard,
  SummaryBox,
  ToggleCard,
  ToggleGroup,
  ZoneMap,
} from "@/components/recorrido/RecorridoUi";

export default function RecorridoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] text-slate-500">
          <p className="text-sm font-medium">Cargando recorrido…</p>
        </main>
      }
    >
      <RecorridoPageContent />
    </Suspense>
  );
}

function RecorridoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkApplied = useRef(false);
  const { authReady, user, desarrollo: sessionDesarrollo } = useRequireAsesorSession();
  const defaultContenido = getDefaultRecorridoContenido("la-vista-residencial");
  const [state, setState] = useState<RecorridoState>(initialRecorridoState);
  const [loaded, setLoaded] = useState(false);
  const [activeDesarrollo, setActiveDesarrollo] = useState<Desarrollo | null>(null);
  const [campoConfig, setCampoConfig] = useState<import("@/lib/catalog/campo-config").DesarrolloCampoConfig | null>(null);
  const [activeContenido, setActiveContenido] = useState<RecorridoContenido>(defaultContenido);
  const [masterPlanPdf, setMasterPlanPdf] = useState<{ url: string; nombre: string } | null>(
    null,
  );
  const [direction, setDirection] = useState(1);
  const [showTwoMinuteGuide, setShowTwoMinuteGuide] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [prospectoCotizadorRegistrado, setProspectoCotizadorRegistrado] = useState("");
  const [showAvailability, setShowAvailability] = useState(false);
  const [availabilityClusterId, setAvailabilityClusterId] = useState<string | null>(null);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [expandedTechnique, setExpandedTechnique] = useState<string | null>(
    defaultContenido.tecnicasCierre[0]?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [clientValidationMessage, setClientValidationMessage] = useState("");
  const [clientValidationStatus, setClientValidationStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [isRegisteringLead, setIsRegisteringLead] = useState(false);
  const [postVisita, setPostVisita] = useState<{
    desarrolloId: string;
    desarrolloNombre: string;
    asesorId: string;
    asesorNombre: string;
    clienteNombre: string;
    clienteEmail?: string;
    clienteTelefono?: string;
    clusterNombre?: string;
    prototipoNombre?: string;
    precioFinal?: number;
    initialEmailSent?: boolean;
  } | null>(null);
  const [recorridoEtapas, setRecorridoEtapas] = useState<string[]>([
    ...DEFAULT_RECORRIDO_ETAPAS,
  ]);
  const [activeClusters, setActiveClusters] = useState<Cluster[]>(clusters);
  const [activePrototipos, setActivePrototipos] = useState<Prototipo[]>(catalogPrototipos);
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
  const selectedProductTypes = useMemo(
    () => normalizeProductoTipo(state.productoTipo),
    [state.productoTipo],
  );
  const availableProductOptions = useMemo(
    () => getProductTypeOptionsForDesarrollo(activeDesarrollo),
    [activeDesarrollo],
  );
  const availableProductValues = useMemo(
    () => new Set(availableProductOptions.map((option) => option.value)),
    [availableProductOptions],
  );

  useEffect(() => {
    if (!activeDesarrollo) {
      return;
    }

    const current = normalizeProductoTipo(state.productoTipo);
    const pruned = current.filter((value) => availableProductValues.has(value));
    const next = pruned.length ? pruned : (["todos"] as ProductoSeleccion[]);

    if (
      next.length !== current.length ||
      next.some((value, index) => value !== current[index])
    ) {
      setState((prev) => ({ ...prev, productoTipo: next }));
    }
  }, [activeDesarrollo, availableProductValues, state.productoTipo]);

  const activeClusterIds = useMemo(
    () => activeClusters.map((cluster) => cluster.id),
    [activeClusters],
  );
  const { getClusterInventario } = useDesarrolloInventarioMap(
    activeDesarrollo?.id,
    activeClusterIds,
  );

  const desarrolloPriceRange = useMemo(() => {
    const desarrolloClusters = activeDesarrollo
      ? activeClusters.filter(
          (cluster) => !cluster.desarrolloId || cluster.desarrolloId === activeDesarrollo.id,
        )
      : activeClusters;
    const clusterIds = new Set(desarrolloClusters.map((cluster) => cluster.id));
    const desarrolloPrototipos = activePrototipos.filter((prototipo) =>
      clusterIds.has(prototipo.clusterId),
    );

    if (!desarrolloPrototipos.length) {
      return { min: DEFAULT_PRICE_OPTIONS[0], max: DEFAULT_PRICE_OPTIONS.at(-1) ?? 7000000 };
    }

    const precios = desarrolloPrototipos
      .map((prototipo) => {
        const unidades = getUnidadesPorPrototipo(
          getClusterInventario(prototipo.clusterId),
          prototipo.id,
        );
        return getPrecioDesdePrototipo(prototipo, unidades);
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!precios.length) {
      return { min: DEFAULT_PRICE_OPTIONS[0], max: DEFAULT_PRICE_OPTIONS.at(-1) ?? 7000000 };
    }

    return {
      min: Math.min(...precios),
      max: Math.max(...precios),
    };
  }, [activeDesarrollo, activeClusters, activePrototipos, getClusterInventario]);

  const priceOptions = useMemo(
    () => buildPriceOptionsFromRange(desarrolloPriceRange.min, desarrolloPriceRange.max),
    [desarrolloPriceRange.min, desarrolloPriceRange.max],
  );

  const lastSyncedDesarrolloIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeDesarrollo) {
      return;
    }

    if (lastSyncedDesarrolloIdRef.current === activeDesarrollo.id) {
      return;
    }

    lastSyncedDesarrolloIdRef.current = activeDesarrollo.id;

    const desiredMin = roundDownToStep(desarrolloPriceRange.min);
    const desiredMax = roundUpToStep(desarrolloPriceRange.max);

    setState((prev) => {
      if (prev.precioMinimo <= desiredMin && prev.precioMaximo >= desiredMax) {
        return prev;
      }

      return {
        ...prev,
        precioMinimo: Math.min(prev.precioMinimo, desiredMin),
        precioMaximo: Math.max(prev.precioMaximo, desiredMax),
      };
    });
  }, [activeDesarrollo, desarrolloPriceRange.min, desarrolloPriceRange.max]);
  const selectedRooms = useMemo(
    () => normalizeRecamarasFiltro(state.recamarasFiltro),
    [state.recamarasFiltro],
  );
  const { units: cotizadorInventario, source: clusterInventarioSource } = useClusterInventario(
    activeDesarrollo?.id,
    state.clusterId || undefined,
  );

  const clusterInventario = useMemo(() => {
    if (!state.clusterId) {
      return [];
    }

    return cotizadorInventario.length > 0
      ? cotizadorInventario
      : getClusterInventario(state.clusterId);
  }, [cotizadorInventario, getClusterInventario, state.clusterId]);

  const filteredPrototiposByCluster = useMemo(() => {
    const byCluster = new Map<string, Prototipo[]>();
    activeClusters.forEach((cluster) => {
      const clusterInventarioLocal = getClusterInventario(cluster.id);
      const matches = activePrototipos
        .filter((item) => item.clusterId === cluster.id)
        .filter((prototipo) => {
        const productType = getProductoTipo(cluster, prototipo);
        const matchesType = matchesProductoTipo(productType, selectedProductTypes);
        const unidades = getUnidadesPorPrototipo(clusterInventarioLocal, prototipo.id);
        const precioReferencia = getPrecioDesdePrototipo(prototipo, unidades);
        const matchesPrice =
          precioReferencia >= state.precioMinimo &&
          precioReferencia <= state.precioMaximo;
        const matchesRooms = matchesRecamaras(
          prototipo.recamaras,
          selectedRooms,
        );

        return matchesType && matchesPrice && matchesRooms;
      });

      byCluster.set(cluster.id, matches);
    });

    return byCluster;
  }, [
    state.precioMaximo,
    state.precioMinimo,
    selectedProductTypes,
    selectedRooms,
    activeClusters,
    activePrototipos,
    getClusterInventario,
  ]);

  const clusterPrecioDesdeLive = useMemo(() => {
    const map = new Map<string, number>();
    for (const cluster of activeClusters) {
      const prototiposCluster = activePrototipos.filter(
        (prototipo) => prototipo.clusterId === cluster.id,
      );
      map.set(
        cluster.id,
        getPrecioDesdeCluster(
          cluster.precioDesde,
          prototiposCluster,
          getClusterInventario(cluster.id),
        ),
      );
    }
    return map;
  }, [activeClusters, activePrototipos, getClusterInventario]);

  const filteredClusters = useMemo(
    () =>
      activeClusters.filter((cluster) => {
        const productMatches = filteredPrototiposByCluster.get(cluster.id)?.length;
        const precioDesde =
          clusterPrecioDesdeLive.get(cluster.id) ?? cluster.precioDesde;
        const terrainMatches =
          (selectedProductTypes.includes("todos") ||
            selectedProductTypes.includes("terreno")) &&
          selectedRooms.includes("cualquiera") &&
          hasTerrenos(cluster) &&
          precioDesde >= state.precioMinimo &&
          precioDesde <= state.precioMaximo;

        return Boolean(productMatches || terrainMatches);
      }),
    [
      filteredPrototiposByCluster,
      state.precioMaximo,
      state.precioMinimo,
      selectedProductTypes,
      selectedRooms,
      activeClusters,
      clusterPrecioDesdeLive,
    ],
  );

  const selectedCluster = activeClusters.find((cluster) => cluster.id === state.clusterId);
  const clusterPrototipos = state.clusterId
    ? filteredPrototiposByCluster.get(state.clusterId) ?? []
    : [];
  const selectedPrototipo = clusterPrototipos.find(
    (prototipo) => prototipo.id === state.prototipoId,
  );
  const unidadesPrototipoSeleccionado = useMemo(
    () =>
      selectedPrototipo
        ? getUnidadesPorPrototipo(clusterInventario, selectedPrototipo.id)
        : [],
    [clusterInventario, selectedPrototipo],
  );
  const precioDesdePrototipoSeleccionado = selectedPrototipo
    ? getPrecioDesdePrototipo(selectedPrototipo, unidadesPrototipoSeleccionado)
    : 0;
  const muestraPrecioDesdePrototipo = prototipoMuestraPrecioDesde(
    unidadesPrototipoSeleccionado,
  );
  const availabilityCluster =
    activeClusters.find((cluster) => cluster.id === availabilityClusterId) ?? selectedCluster;

  const { units: availabilityHookUnits, source: availabilityHookSource } = useClusterInventario(
    activeDesarrollo?.id,
    availabilityCluster?.id,
  );

  const availabilityInventario = useMemo(() => {
    if (
      availabilityCluster?.id &&
      state.clusterId === availabilityCluster.id &&
      cotizadorInventario.length > 0
    ) {
      return { units: cotizadorInventario, source: clusterInventarioSource };
    }

    return { units: availabilityHookUnits, source: availabilityHookSource };
  }, [
    availabilityCluster?.id,
    availabilityHookSource,
    availabilityHookUnits,
    clusterInventarioSource,
    cotizadorInventario,
    state.clusterId,
  ]);

  const isSembradoInventory = useMemo(() => {
    const source = availabilityInventario.source;
    return source === "sembrado" || source === "offline-cache";
  }, [availabilityInventario.source]);

  const availabilityUnits = useMemo(() => {
    if (!availabilityCluster) {
      return [];
    }

    if (availabilityInventario.source !== "local") {
      return availabilityInventario.units;
    }

    return getDisponibilidadesByCluster(availabilityCluster.id);
  }, [availabilityCluster, availabilityInventario.source, availabilityInventario.units]);

  const recommendedAvailability = useMemo<RecommendedAvailability[]>(() => {
    const scoreUnit = (unit: DisponibilidadUnidad) => {
      const prototipo = unit.prototipoId ? getPrototipoById(unit.prototipoId) : undefined;
      const productMatches = matchesProductoTipo(unit.tipo, selectedProductTypes);
      const priceMatches = unit.precio ? unit.precio <= state.cliente.presupuesto : false;
      const roomsMatches = prototipo
        ? matchesRecamaras(prototipo.recamaras, selectedRooms)
        : unit.tipo === "terreno";
      const immediateDelivery = unit.entrega?.toLowerCase().includes("inmediata") ?? false;
      const selectedPrototypeMatches =
        Boolean(selectedPrototipo && unit.prototipoId === selectedPrototipo.id);
      const priorityScore =
        unit.prioridadComercial === "alta"
          ? 15
          : unit.prioridadComercial === "media"
            ? 8
            : 0;
      const visitableScore = unit.visitable ? 5 : 0;
      const score =
        (productMatches ? 40 : 0) +
        (priceMatches ? 30 : 0) +
        (roomsMatches ? 20 : 0) +
        (immediateDelivery ? 15 : 0) +
        (selectedPrototypeMatches ? 10 : 0) +
        priorityScore +
        visitableScore;
      const reasons = [
        productMatches && "Coincide con el tipo de producto que busca el cliente.",
        priceMatches && "Está dentro del presupuesto capturado.",
        roomsMatches && prototipo && `Coincide con ${prototipo.recamaras} recámaras.`,
        immediateDelivery && "Tiene entrega inmediata.",
        selectedPrototypeMatches && "Coincide con el prototipo seleccionado.",
        unit.visitable && "Marcada como unidad visitable.",
        ...unit.razonesVenta,
        unit.instruccionRecorrido,
      ].filter(Boolean) as string[];

      return {
        unit,
        prototipo,
        score,
        reasons: reasons.length
          ? reasons
          : ["Disponible en inventario comercial (sembrado)."],
      };
    };

    return availabilityUnits
      .filter((unit) => unit.estatus === "disponible")
      .map(scoreUnit)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.unit.orden ?? 99) - (b.unit.orden ?? 99) ||
          a.unit.unidad.localeCompare(b.unit.unidad, "es"),
      );
  }, [
    availabilityUnits,
    selectedProductTypes,
    selectedRooms,
    selectedPrototipo,
    state.cliente.presupuesto,
  ]);
  const availabilityConfig = useMemo(
    () =>
      resolveAvailabilityConfig(
        availabilityUnits,
        undefined,
        mapProductoFiltroToAvailabilityTipo(selectedProductTypes),
        isSembradoInventory,
      ),
    [availabilityUnits, isSembradoInventory, selectedProductTypes],
  );
  const selectedAvailability =
    (selectedAvailabilityId
      ? clusterInventario.find((unit) => unit.id === selectedAvailabilityId) ??
        availabilityUnits.find((unit) => unit.id === selectedAvailabilityId)
      : undefined) ??
    recommendedAvailability[0]?.unit ??
    availabilityUnits.find((unit) => unit.estatus === "disponible") ??
    availabilityUnits[0];
  const selectedAvailabilityRecommendation = recommendedAvailability.find(
    (item) => item.unit.id === selectedAvailability?.id,
  );

  const pasajeSimuladorResult = useMemo(() => {
    if (getCotizadorKind(activeDesarrollo?.id ?? "") !== "pasaje") return null;
    const unidadElegida = state.unidadId
      ? clusterInventario.find((unit) => unit.id === state.unidadId) ??
        cotizadorInventario.find((unit) => unit.id === state.unidadId)
      : selectedAvailability ??
        cotizadorInventario.find((unit) => unit.prototipoId === selectedPrototipo?.id);
    const precioLista = unidadElegida?.precio ?? selectedPrototipo?.precioBase ?? 0;
    if (precioLista <= 0) return null;

    const tipo: PasajeUnidadTipo =
      unidadElegida?.tipo === "oficina" || selectedCluster?.tipo === "oficinas"
        ? "oficina"
        : "departamento";

    const parseISO = (value?: string) => {
      if (!value) return undefined;
      const parts = value.split("-").map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) return undefined;
      return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
    };

    return computePasajeSimulador({
      precioLista,
      tipo,
      esquema: state.pasajeEsquema ?? "contado",
      libre: {
        enganchePct: state.pasajeLibreEnganche ?? 0.2,
        mensualidadesPct: state.pasajeLibreMensualidades ?? 0.15,
        fechaFiniquito: parseISO(state.pasajeLibreFechaFiniquito),
      },
      libreSinMens: {
        enganchePct: state.pasajeLibreSinMensEnganche ?? 0.2,
        pagoPct: state.pasajeLibreSinMensPago ?? 0.2,
        fechaPagoIntermedio: parseISO(state.pasajeLibreSinMensFechaPago),
        fechaFiniquito: parseISO(state.pasajeLibreSinMensFechaFiniquito),
      },
    });
  }, [
    activeDesarrollo?.id,
    clusterInventario,
    cotizadorInventario,
    selectedAvailability,
    selectedCluster?.tipo,
    selectedPrototipo?.id,
    selectedPrototipo?.precioBase,
    state.unidadId,
    state.pasajeEsquema,
    state.pasajeLibreEnganche,
    state.pasajeLibreFechaFiniquito,
    state.pasajeLibreMensualidades,
    state.pasajeLibreSinMensEnganche,
    state.pasajeLibreSinMensFechaFiniquito,
    state.pasajeLibreSinMensFechaPago,
    state.pasajeLibreSinMensPago,
  ]);

  const misionLaGaviaSimuladorResult = useMemo(() => {
    if (getCotizadorKind(activeDesarrollo?.id ?? "") !== "mision-gavia") return null;
    const unidadRecord = resolveMisionLaGaviaUnidadFromInventario(
      cotizadorInventario,
      state.unidadId || selectedAvailability?.id,
    );
    if (!unidadRecord) return null;
    return simularMisionLaGavia({
      unidad: unidadRecord,
      esquema: state.misionLaGaviaEsquema ?? "contado",
    });
  }, [
    activeDesarrollo?.id,
    cotizadorInventario,
    selectedAvailability?.id,
    state.misionLaGaviaEsquema,
    state.unidadId,
  ]);

  // Precio de solicitud/cierre: lista de la unidad (o mínimo del prototipo), no precioBase de catálogo.
  const precioListaReferencia =
    (selectedAvailability?.precio && selectedAvailability.precio > 0
      ? selectedAvailability.precio
      : undefined) ??
    (precioDesdePrototipoSeleccionado > 0
      ? precioDesdePrototipoSeleccionado
      : undefined) ??
    selectedPrototipo?.precioBase ??
    0;
  const precioFinal =
    pasajeSimuladorResult?.precioTotal ??
    misionLaGaviaSimuladorResult?.precioTotal ??
    Math.max(0, precioListaReferencia - (state.descuento || 0));

  const tags = useMemo(() => {
    const list: { label: string; className: string }[] = [];

    if (state.cliente.objetivo === "invertir") {
      list.push({ label: "Inversionista", className: "bg-[#6CC24A] text-white" });
    }

    if (state.cliente.familia === "3-4" && state.cliente.objetivo === "vivir") {
      list.push({ label: "Familiar", className: "bg-[#201044] text-white" });
    }

    if (state.cliente.presupuesto > 4000000) {
      list.push({ label: "Premium", className: "bg-[#22c55e] text-white" });
    }

    return list;
  }, [state.cliente.familia, state.cliente.objetivo, state.cliente.presupuesto]);

  const masterPlanImage = useMemo(() => {
    return (
      activeDesarrollo?.masterPlanImage ??
      activeContenido.overview.masterPlanImage ??
      null
    );
  }, [activeContenido.overview.masterPlanImage, activeDesarrollo?.masterPlanImage]);

  const masterPlanStats = useMemo(() => {
    return activeContenido.overview.masterPlanStats ?? [];
  }, [activeContenido.overview.masterPlanStats]);

  const hasMasterPlanVisual = Boolean(masterPlanImage || masterPlanPdf?.url);

  useEffect(() => {
    if (!authReady || !sessionDesarrollo) {
      return;
    }

    const desarrolloId = sessionDesarrollo.id;

    const loadCatalog = async () => {
      try {
        const response = await fetch(
          `/api/catalog/recorrido?desarrolloId=${encodeURIComponent(desarrolloId)}`,
        );
        const data = (await response.json()) as {
          desarrollo?: Desarrollo & {
            campoConfig?: import("@/lib/catalog/campo-config").DesarrolloCampoConfig;
          };
          clusters?: Cluster[];
          prototipos?: Prototipo[];
          recorridoEtapas?: string[];
          recorridoContenido?: RecorridoContenido;
          masterPlanPdf?: { url: string; nombre: string; filename?: string } | null;
        };

        if (data.desarrollo) {
          setActiveDesarrollo(enrichDesarrolloFromStatic(data.desarrollo));
          setCampoConfig(data.desarrollo.campoConfig ?? null);
        } else {
          setActiveDesarrollo(desarrollos.find((item) => item.id === desarrolloId) ?? null);
          setCampoConfig(null);
        }

        if (data.recorridoContenido) {
          setActiveContenido(data.recorridoContenido);
        } else {
          setActiveContenido(getDefaultRecorridoContenido(desarrolloId));
        }

        if (data.recorridoEtapas?.length) {
          setRecorridoEtapas(data.recorridoEtapas);
        }
        if (data.clusters?.length) {
          setActiveClusters(data.clusters);
        }
        if (data.prototipos?.length) {
          setActivePrototipos(data.prototipos);
        }
        setMasterPlanPdf(
          data.masterPlanPdf?.url
            ? { url: data.masterPlanPdf.url, nombre: data.masterPlanPdf.nombre }
            : null,
        );
      } catch {
        setActiveDesarrollo(desarrollos.find((item) => item.id === desarrolloId) ?? null);
        setMasterPlanPdf(null);
      }
    };

    if (!user?.id) {
      setLoaded(true);
      return;
    }

    void loadCatalog();

    if (readRecorridoComplianceOverride(user.id)) {
      setComplianceAcknowledged(true);
    }

    void fetch(
      `/api/asesores/crm-compliance/gate?asesorId=${encodeURIComponent(user.id)}&desarrolloId=${encodeURIComponent(desarrolloId)}`,
    )
      .then((res) => res.json())
      .then((data: { gate?: typeof complianceGate }) => {
        if (data.gate) {
          setComplianceGate(data.gate);
        }
      })
      .catch(() => setComplianceGate(null));

    const saved = localStorage.getItem(RECORRIDO_STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<RecorridoState>;
        setState({
          ...initialRecorridoState,
          ...parsed,
          // Nuevo recorrido siempre inicia en Confianza (etapa 0).
          // La etapa guardada no se reanuda; deep links a unidad van a Producto aparte.
          etapa: 0,
          recorridoVersion: RECORRIDO_VERSION,
          productoTipo: normalizeProductoTipo(parsed.productoTipo),
          recamarasFiltro: normalizeRecamarasFiltro(parsed.recamarasFiltro),
        });
      } catch {
        localStorage.removeItem(RECORRIDO_STORAGE_KEY);
      }
    }

    setLoaded(true);
  }, [authReady, sessionDesarrollo, user?.id]);

  useEffect(() => {
    if (!loaded || deepLinkApplied.current) {
      return;
    }

    const unidadFromUrl = searchParams.get("unidadId")?.trim();
    if (!unidadFromUrl) {
      return;
    }

    deepLinkApplied.current = true;

    const clusterFromUrl = searchParams.get("clusterId")?.trim() || undefined;
    const prototipoFromUrl = searchParams.get("prototipoId")?.trim() || undefined;
    const productoEtapaIndex = Math.max(
      0,
      recorridoEtapas.findIndex((label) => label.toLowerCase().includes("producto")),
    );
    const etapaProducto = productoEtapaIndex >= 0 ? productoEtapaIndex : 3;

    setState((current) => ({
      ...current,
      ...(clusterFromUrl ? { clusterId: clusterFromUrl } : {}),
      ...(prototipoFromUrl ? { prototipoId: prototipoFromUrl } : {}),
      unidadId: unidadFromUrl,
      etapa: etapaProducto,
    }));
    setSelectedAvailabilityId(unidadFromUrl);
    if (clusterFromUrl) {
      setAvailabilityClusterId(clusterFromUrl);
    }
    setShowAvailability(true);
  }, [loaded, searchParams, recorridoEtapas]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(RECORRIDO_STORAGE_KEY, JSON.stringify(state));
    }
  }, [loaded, state]);

  const prevShowQuoteRef = useRef(false);
  useEffect(() => {
    if (showQuote && !prevShowQuoteRef.current) {
      setProspectoCotizadorRegistrado(state.cliente.nombre.trim());
    }
    prevShowQuoteRef.current = showQuote;
  }, [showQuote, state.cliente.nombre]);

  const patchState = (patch: Partial<RecorridoState>) => {
    setState((current) => ({ ...current, ...patch }));
  };

  const patchCliente = (patch: Partial<ClienteTemporal>) => {
    const shouldResetLead = ["nombre", "email", "telefono", "medioContacto"].some(
      (key) => key in patch,
    );
    setClientValidationMessage("");
    setClientValidationStatus("idle");
    setState((current) => ({
      ...current,
      leadId: shouldResetLead ? undefined : current.leadId,
      cliente: { ...current.cliente, ...patch },
    }));
  };

  const goToStep = (step: number) => {
    setDirection(step > state.etapa ? 1 : -1);
    patchState({ etapa: Math.min(Math.max(step, 0), recorridoEtapas.length - 1) });
  };

  const registerLeadBeforeNeeds = async () => {
    if (state.leadId) {
      return true;
    }

    const normalizedEmail = normalizeEmail(state.cliente.email);
    const normalizedPhone = normalizePhone(state.cliente.telefono);
    const clientName = state.cliente.nombre.trim();

    if (!clientName) {
      setClientValidationStatus("error");
      setClientValidationMessage("Captura el nombre del prospecto antes de continuar.");
      return false;
    }

    if (!normalizedEmail && !normalizedPhone) {
      setClientValidationStatus("error");
      setClientValidationMessage("Captura email o teléfono para validar al prospecto.");
      return false;
    }

    const existingClients = readLocalArray<StoredContact>(RECORRIDO_CLIENTES_KEY);
    const existingLeads = readLocalArray<StoredContact>(RECORRIDO_LEADS_KEY);
    const duplicate = [...existingClients, ...existingLeads].find((contact) =>
      contactMatches(contact, normalizedEmail, normalizedPhone),
    );

    if (duplicate) {
      setClientValidationStatus("error");
      setClientValidationMessage(
        "Este prospecto ya fue registrado. Continúa el recorrido o consulta su historial en el CRM del desarrollo.",
      );
      return false;
    }

    setIsRegisteringLead(true);

    const desarrolloId = sessionDesarrollo?.id ?? activeDesarrollo?.id ?? "";
    const lead = {
      id: crypto.randomUUID(),
      cliente: state.cliente,
      nombre: state.cliente.nombre,
      email: normalizedEmail,
      telefono: normalizedPhone,
      medioContacto: state.cliente.medioContacto,
      asesorId: user?.id ?? "local",
      desarrolloId,
      normalizedEmail,
      normalizedPhone,
      fechaRegistro: new Date().toISOString(),
      crmStatus: "pending",
    };

    try {
      const response = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          asesorId: lead.asesorId,
          cliente: {
            nombre: state.cliente.nombre,
            email: normalizedEmail,
            telefono: normalizedPhone,
            medioContacto: state.cliente.medioContacto,
          },
        }),
      });
      const result = (await response.json()) as {
        status?: "synced" | "queued" | "duplicate" | "error";
        crmId?: string;
        reason?: string;
      };

      if (result.status === "duplicate") {
        setClientValidationStatus("error");
        setClientValidationMessage("Este prospecto ya está en el CRM del desarrollo.");
        return false;
      }

      const savedLead = {
        ...lead,
        crmStatus: result.status === "synced" ? "synced" : "queued",
        crmId: result.crmId,
        crmReason: result.reason,
      };
      writeLocalArray(RECORRIDO_LEADS_KEY, [...existingLeads, savedLead]);
      patchState({ leadId: savedLead.id });

      void trackVisita({
        tipo: "lead_registrado",
        desarrolloId,
        asesorId: lead.asesorId,
        asesorNombre: user?.nombre,
        clienteNombre: clientName,
        clienteEmail: normalizedEmail,
        clienteTelefono: normalizedPhone,
        medioContacto: state.cliente.medioContacto,
        crmStatus: savedLead.crmStatus,
        crmId: savedLead.crmId,
      });

      if (shouldQueueLeadForCrm(result)) {
        writeLocalArray(RECORRIDO_CRM_PENDING_KEY, [
          ...readLocalArray(RECORRIDO_CRM_PENDING_KEY),
          savedLead,
        ]);
      }

      setClientValidationStatus("success");
      setClientValidationMessage(leadRegistrationMessage(result));
      return true;
    } catch {
      const queuedLead = { ...lead, crmStatus: "local" };
      writeLocalArray(RECORRIDO_LEADS_KEY, [...existingLeads, queuedLead]);
      patchState({ leadId: queuedLead.id });
      void trackVisita({
        tipo: "lead_registrado",
        desarrolloId,
        asesorId: lead.asesorId,
        asesorNombre: user?.nombre,
        clienteNombre: clientName,
        clienteEmail: normalizedEmail,
        clienteTelefono: normalizedPhone,
        medioContacto: state.cliente.medioContacto,
        crmStatus: "local",
      });
      setClientValidationStatus("success");
      setClientValidationMessage("Prospecto registrado en gabi.");
      return true;
    } finally {
      setIsRegisteringLead(false);
    }
  };

  const handleNextStep = async () => {
    if (state.etapa === 0) {
      const canContinue = await registerLeadBeforeNeeds();

      if (!canContinue) {
        return;
      }
    }

    goToStep(state.etapa + 1);
  };

  const patchProductFilters = (
    patch: Pick<
      Partial<RecorridoState>,
      "productoTipo" | "precioMinimo" | "precioMaximo" | "recamarasFiltro"
    >,
  ) => {
    setState((current) => ({
      ...current,
      ...patch,
      clusterId: "",
      prototipoId: "",
      unidadId: "",
      descuento: 0,
    }));
    setShowQuote(false);
  };

  const toggleProductoTipo = (value: ProductoSeleccion) => {
    const selectedProductTypes = normalizeProductoTipo(state.productoTipo);
    const nextValue: ProductoSeleccion[] =
      value === "todos"
        ? ["todos"]
        : selectedProductTypes.includes(value)
          ? selectedProductTypes.filter((item) => item !== value && item !== "todos")
          : [...selectedProductTypes.filter((item) => item !== "todos"), value];

    patchProductFilters({
      productoTipo: nextValue.length ? nextValue : ["todos"],
    });
  };

  const toggleRecamarasFiltro = (value: RecamarasSeleccion) => {
    const selectedRooms = normalizeRecamarasFiltro(state.recamarasFiltro);
    const nextValue: RecamarasSeleccion[] =
      value === "cualquiera"
        ? ["cualquiera"]
        : selectedRooms.includes(value)
          ? selectedRooms.filter((item) => item !== value && item !== "cualquiera")
          : [...selectedRooms.filter((item) => item !== "cualquiera"), value];

    patchProductFilters({
      recamarasFiltro: nextValue.length ? nextValue : ["cualquiera"],
    });
  };

  const updatePrecioMinimo = (value: number) => {
    const nextValue = Math.max(0, value);

    patchProductFilters({
      precioMinimo: nextValue,
      precioMaximo: Math.max(state.precioMaximo, nextValue),
    });
  };

  const updatePrecioMaximo = (value: number) => {
    const nextValue = Math.max(0, value);

    patchProductFilters({
      precioMinimo: Math.min(state.precioMinimo, nextValue),
      precioMaximo: nextValue,
    });
  };

  const handleClusterSelect = (clusterId: string) => {
    patchState({ clusterId, prototipoId: "", unidadId: "", descuento: 0 });
    setSelectedAvailabilityId(null);
    setShowQuote(false);
  };

  const handlePrototipoSelect = (prototipoId: string) => {
    const prototipo = clusterPrototipos.find((item) => item.id === prototipoId);
    patchState({
      prototipoId,
      unidadId: "",
      descuento: prototipo ? Math.min(state.descuento, prototipo.bonoMaximo) : 0,
    });
    setSelectedAvailabilityId(null);
  };

  const handlePrototipoUnidadSelect = (unidadId: string) => {
    const unit =
      clusterInventario.find((item) => item.id === unidadId) ??
      availabilityUnits.find((item) => item.id === unidadId);
    const prototipoFromUnit = unit?.prototipoId
      ? activePrototipos.find((item) => item.id === unit.prototipoId)
      : undefined;

    setSelectedAvailabilityId(unidadId);
    patchState({
      unidadId,
      ...(unit?.prototipoId ? { prototipoId: unit.prototipoId } : {}),
      descuento: prototipoFromUnit
        ? Math.min(state.descuento, prototipoFromUnit.bonoMaximo)
        : state.descuento,
    });
  };

  const openCotizador = (unidadId?: string) => {
    const resolvedUnidadId = unidadId ?? state.unidadId ?? selectedAvailabilityId ?? "";
    const unit =
      (resolvedUnidadId
        ? clusterInventario.find((item) => item.id === resolvedUnidadId) ??
          availabilityUnits.find((item) => item.id === resolvedUnidadId)
        : undefined) ?? selectedAvailability;

    patchState({
      clusterId: unit?.clusterId ?? state.clusterId,
      prototipoId: unit?.prototipoId ?? state.prototipoId,
      unidadId: unit?.id ?? "",
      descuento: 0,
    });

    if (unit?.id) {
      setSelectedAvailabilityId(unit.id);
    }

    setShowAvailability(false);
    setShowQuote(true);
  };

  const activeDatosBancarios = useMemo(
    () => getDatosBancarios(activeDesarrollo?.id, campoConfig),
    [activeDesarrollo?.id, campoConfig],
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
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const finishRecorrido = async () => {
    const asesorId = user?.id ?? "local";
    const asesorNombre = user?.nombre ?? "Asesor";
    const desarrolloId = sessionDesarrollo?.id ?? activeDesarrollo?.id ?? "";

    const clientId = crypto.randomUUID();
    const saved = localStorage.getItem(RECORRIDO_CLIENTES_KEY);
    const previousClients = saved ? JSON.parse(saved) : [];
    const newClient = {
      id: clientId,
      nombre: state.cliente.nombre || "Cliente sin nombre",
      email: state.cliente.email,
      telefono: state.cliente.telefono,
      medioContacto: state.cliente.medioContacto,
      asesorId,
      desarrolloId,
      interesClusterId: state.clusterId,
      interesPrototipoId: state.prototipoId,
      presupuesto: state.cliente.presupuesto,
      status: "recorrido-completado",
      fechaRegistro: new Date().toISOString(),
      notas: state.cliente.notas,
      etapaRecorrido: recorridoEtapas.length,
      recorrido: state,
      precioFinal,
    };

    localStorage.setItem(RECORRIDO_CLIENTES_KEY, JSON.stringify([...previousClients, newClient]));
    localStorage.removeItem(RECORRIDO_STORAGE_KEY);

    let emailSent = false;

    if (asesorId !== "local" && desarrolloId) {
      const trackResult = await trackVisita({
        tipo: "recorrido_completado",
        desarrolloId,
        asesorId,
        asesorNombre,
        clienteNombre: state.cliente.nombre,
        clienteEmail: state.cliente.email,
        clienteTelefono: state.cliente.telefono,
        medioContacto: state.cliente.medioContacto,
        clusterId: state.clusterId || undefined,
        clusterNombre: selectedCluster?.nombre,
        prototipoId: state.prototipoId || undefined,
        prototipoNombre: selectedPrototipo?.nombre,
        precioFinal: precioFinal || undefined,
        etapaAlcanzada: recorridoEtapas.length,
      });
      emailSent = trackResult.emailSent ?? false;
    }

    setPostVisita({
      desarrolloId,
      desarrolloNombre: activeDesarrollo?.nombre ?? "Desarrollo",
      asesorId,
      asesorNombre,
      clienteNombre: state.cliente.nombre || "Prospecto",
      clienteEmail: state.cliente.email || undefined,
      clienteTelefono: state.cliente.telefono || undefined,
      clusterNombre: selectedCluster?.nombre,
      prototipoNombre: selectedPrototipo?.nombre,
      precioFinal: precioFinal || undefined,
      initialEmailSent: emailSent,
    });
  };

  const closePostVisita = () => {
    setPostVisita(null);
    router.replace("/dashboard");
  };

  const progress = ((state.etapa + 1) / recorridoEtapas.length) * 100;

  if (!authReady || !loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] text-[#1e293b]">
        <p className="text-xl font-bold">Cargando recorrido...</p>
      </main>
    );
  }

  const showComplianceGate =
    complianceGate?.playbookEnabled &&
    complianceGate.overdueCount > 0 &&
    !complianceAcknowledged;

  if (showComplianceGate && complianceGate) {
    return (
      <RecorridoComplianceGate
        desarrolloNombre={activeDesarrollo?.nombre ?? sessionDesarrollo?.nombre ?? "Desarrollo"}
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
          if (user?.id && (complianceGate.level === "coach" || complianceGate.shouldBlock)) {
            writeRecorridoComplianceOverride(user.id);
          }
          setComplianceAcknowledged(true);
        }}
        onBack={() => router.replace("/dashboard")}
      />
    );
  }

  return (
    <main className="min-h-screen bg-bbr-cream text-bbr-purple">
      <section className="sticky top-0 z-30 border-b border-bbr-cream-dark bg-bbr-cream/95 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-sm backdrop-blur md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              {activeDesarrollo?.logo ? (
                <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-xl border border-[#201044]/10 bg-[#F2F0E9] p-2 md:h-12 md:w-[4.5rem]">
                  <Image
                    src={activeDesarrollo.logo}
                    alt={activeDesarrollo.nombre}
                    width={120}
                    height={80}
                    priority
                    className="h-auto max-h-8 w-full object-contain"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6CC24A]">
                  Recorrido guiado
                </p>
                <h1 className="truncate text-lg font-black text-[#201044] md:text-2xl">
                  {activeDesarrollo?.nombre ?? "Desarrollo activo"}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden flex-col items-end sm:flex">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Plataforma
                </p>
                <GabiLogo variant="platform" />
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#201044] shadow-sm transition active:scale-95 md:px-5"
              >
                Salir
              </button>
            </div>
          </div>

          <div className="relative h-3 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-[#6CC24A]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recorridoEtapas.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => goToStep(index)}
                className={`min-w-[4.75rem] shrink-0 snap-start rounded-2xl px-2 py-3 text-center text-[11px] font-black transition sm:min-w-0 sm:flex-1 sm:text-xs md:text-sm ${
                  index === state.etapa
                    ? "bg-[#201044] text-white"
                    : index < state.etapa
                      ? "bg-[#6CC24A]/20 text-[#201044]"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[10px] md:h-6 md:w-6 md:text-xs">
                  {index + 1}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={state.etapa}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="min-h-[calc(100vh-220px)]"
          >
            {state.etapa === 0 && (
              <StepCard
                eyebrow="Etapa 1"
                title="Ganar confianza"
                tip="Mantén contacto visual, sonríe, apretón de manos firme"
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                  <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                    <h2 className="mb-5 text-xl font-black text-[#201044]">
                      Recordatorios de apertura
                    </h2>
                    <div className="space-y-3">
                      {confianzaItems.map((item, index) => (
                        <div
                          key={item.title}
                          className="flex gap-4 rounded-2xl bg-slate-50 p-4 text-left"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6CC24A]/15 text-base font-black text-[#201044]">
                            {index + 1}
                          </span>
                          <span>
                            <span className="block text-base font-black text-[#201044] md:text-lg">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-sm font-semibold text-slate-500">
                              {item.detail}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                    <div className="mb-5">
                      <h2 className="text-xl font-black text-[#201044]">
                        Prospecto de esta visita
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        Datos para personalizar el recorrido. Si el desarrollo lo
                        tiene activo, se envían al CRM — el seguimiento posterior
                        vive ahí.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nombre del prospecto">
                        <input
                          value={state.cliente.nombre}
                          onChange={(event) => patchCliente({ nombre: event.target.value })}
                          className="input-xl"
                          placeholder="Nombre completo"
                        />
                      </Field>
                      <Field label="Teléfono">
                        <input
                          value={state.cliente.telefono}
                          onChange={(event) => patchCliente({ telefono: event.target.value })}
                          className="input-xl"
                          placeholder="442 000 0000"
                        />
                      </Field>
                      <Field label="Email">
                        <input
                          type="email"
                          value={state.cliente.email}
                          onChange={(event) => patchCliente({ email: event.target.value })}
                          className="input-xl"
                          placeholder="cliente@email.com"
                        />
                      </Field>
                      <Field label="Medio de contacto">
                        <select
                          value={state.cliente.medioContacto}
                          onChange={(event) =>
                            patchCliente({
                              medioContacto: event.target.value as Cliente["medioContacto"],
                            })
                          }
                          className="input-xl"
                        >
                          {medioContactoOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    {clientValidationMessage && (
                      <div
                        className={`mt-5 rounded-2xl p-4 text-sm font-bold ${
                          clientValidationStatus === "error"
                            ? "bg-[#ef4444]/10 text-[#b91c1c]"
                            : "bg-[#22c55e]/10 text-[#166534]"
                        }`}
                      >
                        {clientValidationMessage}
                      </div>
                    )}
                  </div>
                </div>
              </StepCard>
            )}

            {state.etapa === 1 && (
              <StepCard
                eyebrow="Etapa 2"
                title="Detección de necesidades"
                tip="Trata de sacar información valiosa durante la plática"
              >
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="¿Para vivir o invertir?">
                        <ToggleGroup
                          value={state.cliente.objetivo}
                          options={[
                            { value: "vivir", label: "Vivir" },
                            { value: "invertir", label: "Invertir" },
                          ]}
                          onChange={(value) =>
                            patchCliente({ objetivo: value as ClienteTemporal["objetivo"] })
                          }
                        />
                      </Field>
                      <Field label="¿Presupuesto aproximado?">
                        <BudgetCurrencyInput
                          value={state.cliente.presupuesto}
                          min={2500000}
                          max={7000000}
                          onChange={(presupuesto) => patchCliente({ presupuesto })}
                        />
                        <input
                          type="range"
                          min={2500000}
                          max={7000000}
                          step={50000}
                          value={state.cliente.presupuesto}
                          onChange={(event) =>
                            patchCliente({ presupuesto: Number(event.target.value) })
                          }
                          className="mt-4 w-full accent-[#6CC24A]"
                        />
                        <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400">
                          <span>{formatRecorridoMoney(2500000)}</span>
                          <span>{formatRecorridoMoney(7000000)}</span>
                        </div>
                      </Field>
                      <Field label="¿Familia tamaño?">
                        <select
                          value={state.cliente.familia}
                          onChange={(event) =>
                            patchCliente({
                              familia: event.target.value as ClienteTemporal["familia"],
                            })
                          }
                          className="input-xl"
                        >
                          <option value="1-2">1-2 personas</option>
                          <option value="3-4">3-4 personas</option>
                          <option value="5+">5+ personas</option>
                        </select>
                      </Field>
                      <ToggleCard
                        label="¿Mascotas?"
                        checked={state.cliente.mascotas}
                        onClick={() => patchCliente({ mascotas: !state.cliente.mascotas })}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                      <h2 className="mb-4 text-xl font-black text-[#201044]">
                        Tags automáticos
                      </h2>
                      <div className="flex flex-wrap gap-3">
                        {tags.length ? (
                          tags.map((tag) => (
                            <span
                              key={tag.label}
                              className={`rounded-full px-5 py-3 text-base font-black ${tag.className}`}
                            >
                              {tag.label}
                            </span>
                          ))
                        ) : (
                          <p className="text-slate-500">Completa datos para perfilar.</p>
                        )}
                      </div>
                    </div>
                    <Field label="Radiografía del cliente">
                      <textarea
                        value={state.cliente.notas}
                        onChange={(event) => patchCliente({ notas: event.target.value })}
                        className="input-xl min-h-48"
                        placeholder="Motivadores, objeciones, urgencia, estilo de vida..."
                      />
                    </Field>
                  </div>
                </div>
              </StepCard>
            )}

            {state.etapa === 2 && (
              <StepCard
                eyebrow="Etapa 3"
                title="Presentación del desarrollo"
                tip="Vende la macro: zona, respaldo del desarrollador y visión del desarrollo antes de entrar al cluster."
              >
                <div className="space-y-6">
                  <ProductNarrativeCard
                    step="1"
                    title={activeContenido.zona.titulo}
                    subtitle={activeContenido.zona.subtitulo}
                    icon={<MapPin className="h-7 w-7" />}
                  >
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <ZoneMap zona={activeContenido.zona} />
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-[#6CC24A]/15 p-5">
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6CC24A]">
                            Guion para asesor
                          </p>
                          <p className="mt-3 text-lg font-bold text-[#201044]">
                            {activeContenido.zona.mensajeAsesor}
                          </p>
                        </div>
                        <NearbyPointsPanel zona={activeContenido.zona} />
                      </div>
                    </div>
                  </ProductNarrativeCard>

                  <ProductNarrativeCard
                    step="2"
                    title={activeContenido.desarrollador.titulo}
                    subtitle={activeContenido.desarrollador.subtitulo}
                    icon={<ShieldCheck className="h-7 w-7" />}
                  >
                    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="rounded-[1.5rem] bg-[#201044] p-6 text-white">
                        {activeContenido.desarrollador.logoPath ? (
                          <div className="mb-6 flex h-20 w-56 items-center justify-start rounded-2xl bg-black/15 p-4">
                            <Image
                              src={activeContenido.desarrollador.logoPath}
                              alt={activeContenido.desarrollador.titulo}
                              width={260}
                              height={110}
                              className="h-auto max-h-12 w-full object-contain object-left"
                            />
                          </div>
                        ) : null}
                        <p className="text-lg font-bold text-white/80">
                          {activeContenido.desarrollador.historia}
                        </p>
                        <p className="mt-5 rounded-2xl bg-white/10 p-4 text-base font-bold">
                          {activeContenido.desarrollador.fraseAsesor}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          {activeContenido.desarrollador.metricas.map((metrica) => (
                            <div
                              key={metrica.valor}
                              className="rounded-2xl bg-slate-50 p-5 text-center"
                            >
                              <p className="text-3xl font-black text-[#6CC24A]">
                                {metrica.valor}
                              </p>
                              <p className="mt-2 text-sm font-bold text-slate-500">
                                {metrica.etiqueta}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {activeContenido.desarrollador.respaldo.map((item) => (
                            <p
                              key={item}
                              className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600"
                            >
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22c55e]" />
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ProductNarrativeCard>

                  <ProductNarrativeCard
                    step="3"
                    title={activeContenido.overview.titulo}
                    subtitle={activeContenido.overview.subtitulo}
                    icon={<TrendingUp className="h-7 w-7" />}
                  >
                    <div className="mb-5 flex flex-col gap-5 rounded-[1.5rem] border border-[#201044]/10 bg-gradient-to-br from-white to-[#f4ead6] p-5 text-[#201044] md:flex-row md:items-center md:justify-between">
                      {activeContenido.overview.logoPath ? (
                        <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-white p-4 shadow-inner md:w-56">
                          <Image
                            src={activeContenido.overview.logoPath}
                            alt={activeContenido.overview.titulo}
                            width={260}
                            height={220}
                            className="h-auto max-h-28 w-full object-contain"
                          />
                        </div>
                      ) : null}
                      <div className="max-w-2xl">
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#6CC24A]">
                          Desarrollo comercializado
                        </p>
                        {activeContenido.overview.guiaAsesor ? (
                          <p className="mt-2 text-lg font-bold text-[#201044]/75">
                            {activeContenido.overview.guiaAsesor}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                      <div className="space-y-3">
                        {activeContenido.overview.narrativa.map((linea) => (
                          <p
                            key={linea}
                            className="rounded-2xl bg-slate-50 p-5 text-lg font-bold text-[#201044]"
                          >
                            {linea}
                          </p>
                        ))}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeContenido.overview.destacados.map((item) => (
                          <div
                            key={item}
                            className="rounded-2xl bg-[#6CC24A]/15 p-5 font-black text-[#201044]"
                          >
                            {item}
                          </div>
                        ))}
                        {activeContenido.bondades.slice(0, 4).map((bondad) => (
                          <div
                            key={bondad}
                            className="rounded-2xl border border-slate-200 bg-white p-5 font-bold text-slate-600"
                          >
                            {bondad}
                          </div>
                        ))}
                      </div>
                    </div>
                    {hasMasterPlanVisual || masterPlanStats.length > 0 ? (
                      <div className="mt-6 space-y-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6CC24A]">
                            {hasMasterPlanVisual ? "Master plan" : "Datos clave del desarrollo"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {hasMasterPlanVisual
                              ? "Ubica clusters, plazas, parques y accesos con el cliente antes de filtrar producto."
                              : getCotizadorKind(activeDesarrollo?.id ?? "") === "investti"
                                ? "Revisa etapas, metrajes y amenidades con el brochure antes de abrir el simulador."
                                : "Confirma escala, metraje y ritmo de venta con el cliente antes de filtrar producto."}
                          </p>
                        </div>
                        {hasMasterPlanVisual ? (
                          <RecorridoMasterPlanMedia
                            imageSrc={masterPlanImage}
                            pdfUrl={masterPlanPdf?.url}
                            pdfNombre={masterPlanPdf?.nombre}
                            titulo={activeContenido.overview.titulo}
                          />
                        ) : null}
                        {masterPlanPdf && masterPlanImage && activeDesarrollo ? (
                          <DocumentDownloadButton
                            compact
                            variant="master-plan"
                            desarrolloId={activeDesarrollo.id}
                            label="Descargar master plan PDF"
                          />
                        ) : null}
                        {masterPlanStats.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {masterPlanStats.map((stat) => (
                              <div
                                key={stat.etiqueta}
                                className="rounded-2xl bg-[#1B4332]/10 p-4 text-center"
                              >
                                <p className="text-2xl font-black text-[#1B4332]">{stat.valor}</p>
                                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                                  {stat.etiqueta}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {activeDesarrollo ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {activeDesarrollo.brochurePdf ? (
                          <DocumentDownloadButton
                            compact
                            variant="desarrollo"
                            desarrolloId={activeDesarrollo.id}
                            label="Brochure del desarrollo"
                          />
                        ) : null}
                        {activeDesarrollo.tarjetasProcesoPdf ? (
                          <DocumentDownloadButton
                            compact
                            variant="tarjetas-proceso"
                            desarrolloId={activeDesarrollo.id}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </ProductNarrativeCard>

                  <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6CC24A]">
                          Cierre de la macro
                        </p>
                        <h3 className="text-2xl font-black text-[#201044]">
                          Técnica de 2 Minutos
                        </h3>
                        <p className="mt-2 text-slate-500">
                          Resume zona, desarrollo, amenidades y respaldo. Luego avanza a Producto para filtrar clusters.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTwoMinuteGuide(true)}
                        className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#201044] px-6 text-lg font-black text-white shadow-xl shadow-[#201044]/20 transition active:scale-[0.99]"
                      >
                        <FileText className="h-7 w-7" />
                        Ver guion
                      </button>
                    </div>
                  </div>
                </div>
              </StepCard>
            )}

            {state.etapa === 3 && (
              <StepCard
                eyebrow="Etapa 4"
                title="Selección de producto"
                tip="Filtra por necesidades, elige cluster y prototipo. Conecta beneficios antes de mostrar precio."
              >
                <div className="space-y-6">
                  <SectionTitle title="Filtra y selecciona un cluster" />
                  <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                    <div className="grid gap-5 lg:grid-cols-[1fr_1fr_0.8fr]">
                      <Field label="Tipo de producto">
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
                          {availableProductOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleProductoTipo(option.value)}
                              className={`min-h-14 rounded-xl px-3 text-sm font-black transition md:text-base ${
                                selectedProductTypes.includes(option.value)
                                  ? "bg-[#201044] text-white shadow"
                                  : "text-slate-500"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <div>
                        <p className="mb-2 text-base font-black text-[#201044]">
                          Rango de precio
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <PriceSelector
                            label="Desde"
                            value={state.precioMinimo}
                            options={priceOptions}
                            onChange={updatePrecioMinimo}
                          />
                          <PriceSelector
                            label="Hasta"
                            value={state.precioMaximo}
                            options={priceOptions}
                            onChange={updatePrecioMaximo}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updatePrecioMinimo(state.precioMinimo - PRICE_STEP)
                            }
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-[#201044]"
                          >
                            Desde -$250k
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updatePrecioMinimo(state.precioMinimo + PRICE_STEP)
                            }
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-[#201044]"
                          >
                            Desde +$250k
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updatePrecioMaximo(state.precioMaximo - PRICE_STEP)
                            }
                            className="rounded-full bg-[#6CC24A]/15 px-4 py-2 text-sm font-black text-[#201044]"
                          >
                            Hasta -$250k
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updatePrecioMaximo(state.precioMaximo + PRICE_STEP)
                            }
                            className="rounded-full bg-[#6CC24A]/15 px-4 py-2 text-sm font-black text-[#201044]"
                          >
                            Hasta +$250k
                          </button>
                        </div>
                      </div>

                      <Field label="Recámaras">
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
                          {recamarasOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleRecamarasFiltro(option.value)}
                              className={`min-h-14 rounded-xl px-3 text-sm font-black transition md:text-base ${
                                selectedRooms.includes(option.value)
                                  ? "bg-[#201044] text-white shadow"
                                  : "text-slate-500"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {selectedProductTypes.includes("terreno") && (
                          <p className="mt-2 text-sm font-semibold text-slate-500">
                            Para terrenos, usa “Cualquiera” o combínalo con casa/departamento
                            al filtrar por producto.
                          </p>
                        )}
                      </Field>
                    </div>

                    <div className="mt-5 rounded-2xl bg-[#6CC24A]/15 p-4 font-bold text-[#201044]">
                      Mostrando {filteredClusters.length} cluster
                      {filteredClusters.length === 1 ? "" : "s"} que coinciden con la
                      búsqueda del cliente.
                    </div>
                  </div>

                  {filteredClusters.length ? (
                    <div className="grid items-stretch gap-5 md:grid-cols-3">
                      {filteredClusters.map((cluster) => {
                        const clusterPrototipos =
                          filteredPrototiposByCluster.get(cluster.id) ?? [];
                        const terrainMatch =
                          (selectedProductTypes.includes("todos") ||
                            selectedProductTypes.includes("terreno")) &&
                          selectedRooms.includes("cualquiera") &&
                          hasTerrenos(cluster);
                        const productLabels = getClusterProductLabels(
                          cluster,
                          clusterPrototipos,
                          terrainMatch,
                        );

                        return (
                          <div
                            key={cluster.id}
                            className={`flex h-full min-h-[33rem] flex-col overflow-hidden rounded-[2rem] bg-white shadow-lg ring-4 transition ${
                              state.clusterId === cluster.id
                                ? "ring-[#6CC24A]"
                                : "ring-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleClusterSelect(cluster.id)}
                              className="flex flex-1 flex-col text-left active:scale-[0.99]"
                            >
                            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#201044] to-[#201044] p-6 text-white">
                              {cluster.logo ? (
                                <Image
                                  src={cluster.logo}
                                  alt={cluster.nombre}
                                  width={260}
                                  height={140}
                                  className="max-h-24 w-full object-contain"
                                />
                              ) : (
                                <Building2 className="h-14 w-14" />
                              )}
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                              <h3 className="text-2xl font-black text-[#201044]">
                                {cluster.nombre}
                              </h3>
                              <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-slate-500">
                                {cluster.descripcion}
                              </p>
                              <p className="mt-4 text-lg font-black text-[#6CC24A]">
                                Desde{" "}
                                {formatRecorridoMoney(
                                  clusterPrecioDesdeLive.get(cluster.id) ??
                                    cluster.precioDesde,
                                )}
                              </p>
                              <div className="mt-2 min-h-[4.75rem] rounded-2xl bg-slate-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                  Entrega
                                </p>
                                {cluster.entregaEtapas?.length ? (
                                  <div className="mt-2 grid gap-1.5">
                                    {cluster.entregaEtapas.map((entrega) => (
                                      <p
                                        key={entrega.etapa}
                                        className="flex items-center justify-between gap-3 text-xs font-black text-[#201044]"
                                      >
                                        <span>Etapa {entrega.etapa}</span>
                                        <span className="text-right text-slate-500">
                                          {entrega.fecha}
                                        </span>
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-sm font-black text-[#201044]">
                                    {cluster.entregaGeneral}
                                  </p>
                                )}
                              </div>
                              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                                {productLabels.map((label) => (
                                  <span
                                    key={label}
                                    className="rounded-full bg-[#201044]/10 px-3 py-1 text-xs font-black text-[#201044]"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                            </button>
                            {activeDesarrollo ? (
                              <div className="border-t border-slate-100 px-5 py-3">
                                <DocumentDownloadButton
                                  compact
                                  variant="cluster"
                                  clusterId={cluster.id}
                                  desarrolloId={activeDesarrollo.id}
                                  label="Descargar brochure"
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                      <p className="text-xl font-black text-[#201044]">
                        No hay clusters para estos criterios.
                      </p>
                      <p className="mt-2 text-slate-500">
                        Ajusta tipo de producto, presupuesto o recámaras para ampliar la
                        búsqueda.
                      </p>
                    </div>
                  )}

                  {selectedCluster && (
                    <>
                      <SectionTitle title={`Prototipos en ${selectedCluster.nombre}`} />
                      {clusterPrototipos.length ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {clusterPrototipos.map((prototipo) => {
                            const unidades = getUnidadesPorPrototipo(
                              clusterInventario,
                              prototipo.id,
                            );
                            const precioDesde = getPrecioDesdePrototipo(prototipo, unidades);
                            const desde = prototipoMuestraPrecioDesde(unidades);

                            return (
                            <button
                              key={prototipo.id}
                              type="button"
                              onClick={() => handlePrototipoSelect(prototipo.id)}
                              className={`rounded-[1.5rem] bg-white p-5 text-left shadow-lg ring-4 transition active:scale-[0.99] ${
                                state.prototipoId === prototipo.id
                                  ? "ring-[#6CC24A]"
                                  : "ring-transparent"
                              }`}
                            >
                              {prototipo.fotos[0] && (
                                <div className="mb-4 h-40 overflow-hidden rounded-2xl bg-slate-100">
                                  <Image
                                    src={prototipo.fotos[0]}
                                    alt={`Fachada ${prototipo.nombre}`}
                                    width={420}
                                    height={320}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <h3 className="text-xl font-black text-[#201044]">
                                {prototipo.nombre}
                              </h3>
                              <p className="mt-2 font-black text-[#6CC24A]">
                                {desde ? "Desde " : ""}
                                {formatRecorridoMoney(precioDesde)}
                              </p>
                              {unidades.length > 0 ? (
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {unidades.length}{" "}
                                  {unidades.length === 1 ? "unidad" : "unidades"} en inventario
                                </p>
                              ) : null}
                              <p className="mt-3 text-sm text-slate-500">
                                {formatAreaM2(prototipo.construccionM2) || "—"} |{" "}
                                {prototipo.recamaras} rec. | {prototipo.banos} baños
                              </p>
                            </button>
                            );
                          })}
                        </div>
                      ) : activeDesarrollo && getCotizadorKind(activeDesarrollo.id) === "investti" ? (
                        <div className="space-y-5 rounded-[2rem] bg-white p-6 shadow-lg">
                          <div>
                            <p className="text-xl font-black text-[#201044]">Terrenos · simulador</p>
                            <p className="mt-2 text-sm text-slate-500">
                              Elige manzana y lote con la lista oficial Investti. Misma lógica que
                              Control Gerencia.
                            </p>
                          </div>
                          {investtiCatalogHasSimulador(activeDesarrollo.id) ? (
                            <InvesttiSimuladorPanel
                              desarrolloId={activeDesarrollo.id}
                              presentation="corredor"
                            />
                          ) : (
                            <p className="text-sm text-slate-500">
                              Lista de precios pendiente para este desarrollo.
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => openCotizador()}
                            className="w-full rounded-2xl bg-[#6CC24A] px-5 py-4 text-lg font-black text-white shadow-lg active:scale-95"
                          >
                            Abrir cotizador
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-[2rem] bg-white p-6 shadow-lg">
                          <p className="text-xl font-black text-[#201044]">
                            Este cluster coincide por terrenos.
                          </p>
                          <p className="mt-2 text-slate-500">
                            Aún no hay fichas técnicas de terrenos cargadas. Publícalas desde el
                            panel admin cuando estén listas.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedPrototipo && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                      <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                        <div className="mb-5 grid gap-4">
                          {selectedPrototipo.fotos[0] ? (
                            <div className="overflow-hidden rounded-[1.5rem] bg-slate-100">
                              <Image
                                src={selectedPrototipo.fotos[0]}
                                alt={`Fachada ${selectedPrototipo.nombre}`}
                                width={900}
                                height={680}
                                className="h-72 w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-48 items-center justify-center rounded-[1.5rem] bg-slate-100 text-slate-400">
                              Foto placeholder
                            </div>
                          )}
                          {selectedPrototipo.planos[0] && (
                            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                              <div className="border-b border-slate-100 px-4 py-3">
                                <p className="text-sm font-black uppercase tracking-wide text-[#6CC24A]">
                                  Plano del modelo
                                </p>
                              </div>
                              <Image
                                src={selectedPrototipo.planos[0]}
                                alt={`Plano ${selectedPrototipo.nombre}`}
                                width={900}
                                height={900}
                                className="max-h-[520px] w-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                        <h2 className="text-2xl font-black text-[#201044]">
                          {selectedPrototipo.nombre}
                        </h2>
                        {activeDesarrollo ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <DocumentDownloadButton
                              compact
                              variant="ficha-tecnica"
                              prototipoId={selectedPrototipo.id}
                              desarrolloId={activeDesarrollo.id}
                            />
                            {selectedCluster ? (
                              <DocumentDownloadButton
                                compact
                                variant="cluster"
                                clusterId={selectedCluster.id}
                                desarrolloId={activeDesarrollo.id}
                                label="Brochure del cluster"
                              />
                            ) : null}
                          </div>
                        ) : null}
                        <p className="mt-2 text-2xl font-black text-[#6CC24A]">
                          {muestraPrecioDesdePrototipo ? (
                            <>
                              Desde {formatRecorridoMoney(precioDesdePrototipoSeleccionado)}
                              <span className="mt-1 block text-sm font-semibold text-slate-500">
                                {unidadesPrototipoSeleccionado.length} unidades de este modelo;
                                el precio varía por nivel y ubicación.
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="mr-3 text-lg text-slate-400 line-through">
                                {formatRecorridoMoney(selectedPrototipo.precioBase)}
                              </span>
                              {formatRecorridoMoney(precioDesdePrototipoSeleccionado)}
                            </>
                          )}
                        </p>
                        {unidadesPrototipoSeleccionado.length > 0 ? (
                          <div className="mt-6 space-y-3">
                            <h3 className="text-lg font-black text-[#201044]">
                              {selectedCluster?.tipo === "oficinas"
                                ? "Oficinas disponibles de este modelo"
                                : selectedCluster?.tipo === "departamentos"
                                  ? "Departamentos disponibles de este modelo"
                                  : "Unidades disponibles de este modelo"}
                            </h3>
                            <p className="text-sm text-slate-500">
                              Elige la unidad concreta para cotizar con su precio de lista.
                            </p>
                            <div className="space-y-3">
                              {unidadesPrototipoSeleccionado.map((unidad) => (
                                <AvailabilityUnitCard
                                  key={unidad.id}
                                  unit={unidad}
                                  selected={selectedAvailabilityId === unidad.id}
                                  onSelect={() => handlePrototipoUnidadSelect(unidad.id)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                          <Spec
                            label="Construcción"
                            value={formatAreaM2(selectedPrototipo.construccionM2) || "—"}
                          />
                          <Spec
                            label="Terreno"
                            value={formatAreaM2(selectedPrototipo.terrenoM2) || "—"}
                          />
                          <Spec label="Recámaras" value={`${selectedPrototipo.recamaras}`} />
                          <Spec label="Baños" value={`${selectedPrototipo.banos}`} />
                          <Spec label="Niveles" value={`${selectedPrototipo.niveles}`} />
                          <Spec label="Entrega" value={selectedPrototipo.entrega} />
                        </div>
                        {selectedPrototipo.casaMuestra && (
                          <p className="mt-5 rounded-2xl bg-[#6CC24A]/15 p-4 font-bold text-[#201044]">
                            Casa muestra: {selectedPrototipo.casaMuestra.numero} | Clave:{" "}
                            {selectedPrototipo.casaMuestra.clave}
                          </p>
                        )}
                      </div>

                      <div className="space-y-5">
                        {isPasajeDepartamentosCluster(selectedCluster?.id) ? (
                          <PasajeAcabadosPanel />
                        ) : (
                          <>
                            <ListBox
                              title="Equipamiento incluido"
                              items={selectedPrototipo.equipamientoIncluido}
                              positive
                            />
                            <ListBox title="No incluye" items={selectedPrototipo.noIncluye} />
                          </>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedCluster) {
                                return;
                              }

                              setAvailabilityClusterId(selectedCluster.id);
                              setSelectedAvailabilityId(null);
                              setShowAvailability(true);
                            }}
                            className="rounded-2xl border border-[#201044]/20 bg-white px-5 py-5 text-lg font-black text-[#201044] shadow-lg active:scale-95"
                          >
                            Ver unidades disponibles
                          </button>
                          <button
                            type="button"
                            onClick={() => openCotizador()}
                            className="rounded-2xl bg-[#6CC24A] px-5 py-5 text-lg font-black text-white shadow-lg active:scale-95"
                          >
                            Cotizar ahora
                          </button>
                        </div>
                        {activeDesarrollo && getCotizadorKind(activeDesarrollo.id) === "mision-gavia" ? (
                          <div className="mt-6 space-y-4 rounded-[1.5rem] border border-[#5B8A7D]/20 bg-slate-50/80 p-5">
                            <p className="text-sm font-black text-[#14453D]">
                              Simulador lista mar26
                            </p>
                            <MisionLaGaviaSimuladorPanel
                              desarrolloId={activeDesarrollo.id}
                              desarrolloNombre={activeDesarrollo.nombre}
                              desarrolloLogo={activeDesarrollo.logo}
                              prospectoRegistrado={prospectoCotizadorRegistrado}
                              clusterId={state.clusterId}
                              prototipoId={state.prototipoId}
                              unidadId={state.unidadId || undefined}
                              inventarioUnidades={cotizadorInventario}
                              catalog={{ clusters: activeClusters, prototipos: activePrototipos }}
                              clienteNombre={state.cliente.nombre}
                              asesorNombre={user?.nombre}
                              asesorId={user?.id}
                              esquema={state.misionLaGaviaEsquema ?? "contado"}
                              showSelectors
                              showCopy
                              onUnidadChange={(id) => patchState({ unidadId: id ?? "" })}
                              onEsquemaChange={(value) =>
                                patchState({ misionLaGaviaEsquema: value })
                              }
                              onClienteNombreChange={(nombre) => patchCliente({ nombre })}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </StepCard>
            )}

            {state.etapa === 4 && (
              <StepCard
                eyebrow="Etapa 5"
                title="Ideas de Cierre"
                tip="Úsalas como inspiración conversacional, no como una lista de pasos obligatorios."
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                  <div className="space-y-4">
                    {activeContenido.tecnicasCierre.map((tecnica) => {
                      const open = expandedTechnique === tecnica.id;

                      return (
                        <div key={tecnica.id} className="rounded-[1.5rem] bg-white p-5 shadow-lg">
                          <button
                            type="button"
                            onClick={() => setExpandedTechnique(open ? null : tecnica.id)}
                            className="flex w-full items-center justify-between gap-4 text-left"
                          >
                            <span>
                              <span className="text-xl font-black text-[#201044]">
                                {tecnica.nombre}
                              </span>
                            </span>
                            <span className="text-2xl font-black text-[#6CC24A]">
                              {open ? "−" : "+"}
                            </span>
                          </button>
                          <AnimatePresence>
                            {open && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 space-y-3 text-slate-600">
                                  <p>{tecnica.descripcion}</p>
                                  <p className="rounded-2xl bg-slate-50 p-4 font-semibold">
                                    Ejemplo: {tecnica.ejemplo}
                                  </p>
                                  <p>
                                    <strong>¿Cuándo usar?</strong> {tecnica.cuandoUsar}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
                    <h2 className="mb-5 text-xl font-black text-[#201044]">
                      Recordatorios de cierre
                    </h2>
                    <div className="space-y-3">
                      {cierreItems.map((item, index) => (
                        <div
                          key={item}
                          className="flex w-full items-center gap-4 rounded-2xl bg-slate-50 p-4 text-base font-bold text-slate-700 md:text-lg"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044] text-base font-black text-white">
                            {index + 1}
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setShowRequest(true)}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#6CC24A] px-6 py-5 text-lg font-black text-white shadow-lg active:scale-95"
                      >
                        <FileText className="h-6 w-6" />
                        Generar solicitud de compra
                      </button>
                      <button
                        type="button"
                        onClick={finishRecorrido}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#201044] bg-white px-6 py-5 text-lg font-black text-[#201044] shadow-sm active:scale-95"
                      >
                        <ClipboardCheck className="h-6 w-6" />
                        Finalizar recorrido
                      </button>
                    </div>
                  </div>
                </div>
              </StepCard>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToStep(state.etapa - 1)}
            disabled={state.etapa === 0}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-black text-[#201044] shadow-sm transition disabled:opacity-40 sm:flex-none sm:px-5"
          >
            <ArrowLeft className="h-5 w-5" />
            Anterior
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={state.etapa === recorridoEtapas.length - 1 || isRegisteringLead}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#201044] px-4 text-base font-black text-white shadow-lg transition disabled:opacity-40 sm:flex-none sm:px-6"
          >
            {isRegisteringLead ? "Validando..." : "Siguiente"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </footer>

      {showAvailability && availabilityCluster && (
        <Modal
          onClose={() => setShowAvailability(false)}
          title={`Unidades disponibles · ${availabilityCluster.nombre}`}
          size="wide"
        >
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-[#201044]/10 bg-[#201044]/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6CC24A]">
                    Guía gabi ·{" "}
                    {availabilityConfig.layoutMode === "departamentos"
                      ? "Departamentos"
                      : availabilityConfig.layoutMode === "mixto"
                        ? "Inventario mixto"
                        : availabilityConfig.layoutMode === "referencial"
                          ? "Referencia"
                          : "Casas y lotes"}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-[#201044]">
                    {availabilityConfig.advisorHint}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {availabilityViewDescription.recomendadas}
                  </p>
                </div>
                {activeDesarrollo ? (
                  <DocumentDownloadButton
                    compact
                    variant="disponibilidad"
                    clusterId={availabilityCluster.id}
                    desarrolloId={activeDesarrollo.id}
                    etapa={selectedAvailability?.etapa}
                    label={
                      selectedAvailability?.etapa
                        ? `Inventario · Etapa ${selectedAvailability.etapa}`
                        : "Descargar inventario PDF"
                    }
                  />
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="rounded-[2rem] bg-[#201044] p-5 text-white shadow-lg">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#6CC24A]">
                    A dónde dirigir al cliente
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    Unidades disponibles para mostrar en visita.
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-white/75">
                    {isSembradoInventory
                      ? "Inventario completo según sembrado. Ordenadas por afinidad con el perfil del cliente."
                      : "Ordenadas por presupuesto, producto, recámaras, entrega y disponibilidad."}
                  </p>
                </div>

                {recommendedAvailability.length ? (
                  <div className="space-y-3">
                    {recommendedAvailability.map((recommendation, index) => (
                      <AvailabilityUnitCard
                        key={recommendation.unit.id}
                        unit={recommendation.unit}
                        recommendation={recommendation}
                        rank={index + 1}
                        selected={selectedAvailability?.id === recommendation.unit.id}
                        onSelect={() => setSelectedAvailabilityId(recommendation.unit.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] bg-white p-5 shadow-lg">
                    <p className="text-xl font-black text-[#201044]">
                      No hay unidades disponibles en este momento.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Descarga el inventario PDF o confirma disponibilidad con administración comercial.
                    </p>
                  </div>
                )}
              </div>

              <AvailabilityUnitDetail
                unit={selectedAvailability}
                recommendation={selectedAvailabilityRecommendation}
                onShow={() => selectedAvailability && setSelectedAvailabilityId(selectedAvailability.id)}
                onQuote={() => {
                  if (!selectedAvailability?.id) {
                    return;
                  }
                  openCotizador(selectedAvailability.id);
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {showTwoMinuteGuide && (
        <Modal
          onClose={() => setShowTwoMinuteGuide(false)}
          title={activeContenido.tecnicaDosMinutos.titulo}
        >
          <div className="space-y-5">
            <div className="rounded-[2rem] bg-[#201044] p-6 text-white">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#6CC24A]">
                Guion comercial
              </p>
              <h3 className="mt-3 text-2xl font-black">
                Explica todo lo importante en menos de 2 minutos.
              </h3>
              <p className="mt-3 text-sm font-semibold text-white/80 md:text-base">
                Usa estos puntos como guía verbal antes de pasar a la selección de
                cluster y prototipo. La idea es ser claro, completo y breve.
              </p>
            </div>

            <div className="grid gap-3">
              {activeContenido.tecnicaDosMinutos.puntos.map((punto, index) => (
                <div
                  key={punto}
                  className="flex gap-4 rounded-2xl bg-[#6CC24A]/10 p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#6CC24A] font-black text-white">
                    {index + 1}
                  </span>
                  <span className="font-semibold leading-7 text-[#201044]">{punto}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showQuote &&
        activeDesarrollo &&
        (selectedPrototipo || usesDedicatedSimulador(activeDesarrollo.id)) && (
        <Modal onClose={() => setShowQuote(false)} title="Cotizador">
          <CotizadorPanel
            desarrolloId={activeDesarrollo.id}
            desarrolloNombre={activeDesarrollo.nombre}
            clusterId={state.clusterId}
            prototipoId={state.prototipoId}
            unidadId={state.unidadId || undefined}
            inventarioUnidades={cotizadorInventario}
            onUnidadChange={(id) => patchState({ unidadId: id ?? "" })}
            descuento={state.descuento}
            esquema={state.esquema}
            clienteNombre={state.cliente.nombre}
            clienteEmail={state.cliente.email}
            clienteTelefono={state.cliente.telefono}
            desarrolloLogo={activeDesarrollo.logo}
            prospectoRegistrado={prospectoCotizadorRegistrado}
            asesorNombre={user?.nombre}
            asesorId={user?.id}
            catalog={{ clusters: activeClusters, prototipos: activePrototipos }}
            campoConfig={campoConfig}
            showCopy
            showPdf
            onDescuentoChange={(value) => patchState({ descuento: value })}
            onEsquemaChange={(value) => patchState({ esquema: value })}
            pasajeEsquema={state.pasajeEsquema ?? "contado"}
            pasajeLibreEnganche={state.pasajeLibreEnganche}
            pasajeLibreMensualidades={state.pasajeLibreMensualidades}
            pasajeLibreFechaFiniquito={state.pasajeLibreFechaFiniquito}
            pasajeLibreSinMensEnganche={state.pasajeLibreSinMensEnganche}
            pasajeLibreSinMensPago={state.pasajeLibreSinMensPago}
            pasajeLibreSinMensFechaPago={state.pasajeLibreSinMensFechaPago}
            pasajeLibreSinMensFechaFiniquito={state.pasajeLibreSinMensFechaFiniquito}
            onPasajeEsquemaChange={(value) => patchState({ pasajeEsquema: value })}
            onPasajeLibreEngancheChange={(value) =>
              patchState({ pasajeLibreEnganche: value })
            }
            onPasajeLibreMensualidadesChange={(value) =>
              patchState({ pasajeLibreMensualidades: value })
            }
            onPasajeLibreFechaFiniquitoChange={(value) =>
              patchState({ pasajeLibreFechaFiniquito: value })
            }
            onPasajeLibreSinMensEngancheChange={(value) =>
              patchState({ pasajeLibreSinMensEnganche: value })
            }
            onPasajeLibreSinMensPagoChange={(value) =>
              patchState({ pasajeLibreSinMensPago: value })
            }
            onPasajeLibreSinMensFechaPagoChange={(value) =>
              patchState({ pasajeLibreSinMensFechaPago: value })
            }
            onPasajeLibreSinMensFechaFiniquitoChange={(value) =>
              patchState({ pasajeLibreSinMensFechaFiniquito: value })
            }
            misionLaGaviaEsquema={state.misionLaGaviaEsquema ?? "contado"}
            onMisionLaGaviaEsquemaChange={(value) =>
              patchState({ misionLaGaviaEsquema: value })
            }
            onClienteNombreChange={(nombre) => patchCliente({ nombre })}
          />
        </Modal>
      )}

      {showRequest && (
        <Modal onClose={() => setShowRequest(false)} title="Solicitud de compra">
          <div className="grid gap-5 lg:grid-cols-2">
            <SummaryBox title="Cliente">
              <p>{state.cliente.nombre || "Cliente sin nombre"}</p>
              <p>{state.cliente.telefono || "Sin teléfono"}</p>
              <p>{state.cliente.email || "Sin email"}</p>
            </SummaryBox>
            <SummaryBox title="Producto seleccionado">
              <p>{selectedCluster?.nombre || "Sin cluster"}</p>
              <p>{selectedPrototipo?.nombre || "Sin prototipo"}</p>
              <p className="font-black text-[#6CC24A]">
                {formatRecorridoMoney(
                  pasajeSimuladorResult?.precioTotal ??
                    misionLaGaviaSimuladorResult?.precioTotal ??
                    precioFinal,
                )}
              </p>
              {pasajeSimuladorResult ? (
                <p className="text-xs text-slate-500">
                  Lista {formatRecorridoMoney(pasajeSimuladorResult.precioLista)} · Contado{" "}
                  {formatRecorridoMoney(pasajeSimuladorResult.precioContado)}
                </p>
              ) : misionLaGaviaSimuladorResult ? (
                <p className="text-xs text-slate-500">
                  {misionLaGaviaSimuladorResult.unidad} · Lista{" "}
                  {formatRecorridoMoney(misionLaGaviaSimuladorResult.precioLista)} ·{" "}
                  {misionLaGaviaSimuladorResult.esquemaLabel}
                </p>
              ) : null}
            </SummaryBox>
            {misionLaGaviaSimuladorResult ? (
              <SummaryBox title={`Esquema · ${misionLaGaviaSimuladorResult.esquemaLabel}`}>
                <p>
                  Enganche ({formatPctShort(misionLaGaviaSimuladorResult.enganchePct)}):{" "}
                  <strong>{formatRecorridoMoney(misionLaGaviaSimuladorResult.enganche)}</strong>
                </p>
                {misionLaGaviaSimuladorResult.numMensualidades &&
                misionLaGaviaSimuladorResult.mensualidad ? (
                  <p>
                    {misionLaGaviaSimuladorResult.numMensualidades} pagos de{" "}
                    <strong>{formatRecorridoMoney(misionLaGaviaSimuladorResult.mensualidad)}</strong>
                  </p>
                ) : null}
                {misionLaGaviaSimuladorResult.finiquito ? (
                  <p>
                    Finiquito ({formatPctShort(misionLaGaviaSimuladorResult.finiquitoPct ?? 0)}):{" "}
                    <strong>{formatRecorridoMoney(misionLaGaviaSimuladorResult.finiquito)}</strong>
                  </p>
                ) : null}
              </SummaryBox>
            ) : null}
            {pasajeSimuladorResult ? (
              <SummaryBox title={`Esquema · ${pasajeSimuladorResult.esquemaLabel}`}>
                <p>
                  Enganche ({formatPctShort(pasajeSimuladorResult.enganchePct)}):{" "}
                  <strong>{formatRecorridoMoney(pasajeSimuladorResult.enganche)}</strong>
                </p>
                {pasajeSimuladorResult.numMensualidades &&
                pasajeSimuladorResult.mensualidadCliente ? (
                  <p>
                    {pasajeSimuladorResult.numMensualidades} mensualidades de{" "}
                    <strong>{formatRecorridoMoney(pasajeSimuladorResult.mensualidadCliente)}</strong>
                    {pasajeSimuladorResult.fechaPrimerMes &&
                    pasajeSimuladorResult.fechaUltimoMes
                      ? ` · ${formatMonthYear(pasajeSimuladorResult.fechaPrimerMes)} → ${formatMonthYear(
                          pasajeSimuladorResult.fechaUltimoMes,
                        )}`
                      : ""}
                  </p>
                ) : null}
                {pasajeSimuladorResult.pagoIntermedio &&
                pasajeSimuladorResult.pagoIntermedioPct ? (
                  <p>
                    Pago ({formatPctShort(pasajeSimuladorResult.pagoIntermedioPct)}):{" "}
                    <strong>{formatRecorridoMoney(pasajeSimuladorResult.pagoIntermedio)}</strong>
                    {pasajeSimuladorResult.fechaPagoIntermedio
                      ? ` en ${formatMonthYear(pasajeSimuladorResult.fechaPagoIntermedio)}`
                      : ""}
                  </p>
                ) : null}
                {pasajeSimuladorResult.finiquito ? (
                  <p>
                    Finiquito ({formatPctShort(pasajeSimuladorResult.finiquitoPct ?? 0)}):{" "}
                    <strong>{formatRecorridoMoney(pasajeSimuladorResult.finiquito)}</strong>
                    {pasajeSimuladorResult.fechaFiniquito
                      ? ` en ${formatMonthYear(pasajeSimuladorResult.fechaFiniquito)}`
                      : ""}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">
                  Entrega estimada: {formatMonthYear(PASAJE_FECHA_ENTREGA)}
                </p>
              </SummaryBox>
            ) : null}
            {getCotizadorKind(activeDesarrollo?.id ?? "") !== "investti" ? (
              <SummaryBox title="Datos bancarios">
                <p>{activeDatosBancarios.razonSocial}</p>
                <p>RFC: {activeDatosBancarios.rfc}</p>
                <p>Banco: {activeDatosBancarios.banco}</p>
                <p>Cuenta: {activeDatosBancarios.cuenta}</p>
                <p>CLABE: {activeDatosBancarios.clabe}</p>
                <p>Concepto: {activeDatosBancarios.concepto}</p>
              </SummaryBox>
            ) : null}
            <div className="flex flex-col gap-3">
              {getCotizadorKind(activeDesarrollo?.id ?? "") !== "investti" ? (
                <button
                  type="button"
                  onClick={copyBankData}
                  className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#201044] px-6 text-lg font-black text-white"
                >
                  <Copy className="h-6 w-6" />
                  {copied ? "Datos copiados" : "Copiar datos bancarios"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={finishRecorrido}
                className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#6CC24A] px-6 text-lg font-black text-white"
              >
                <ClipboardCheck className="h-6 w-6" />
                Finalizar recorrido
              </button>
            </div>
          </div>
        </Modal>
      )}

      {postVisita ? (
        <PostVisitaModal {...postVisita} onClose={closePostVisita} />
      ) : null}
    </main>
  );
}

