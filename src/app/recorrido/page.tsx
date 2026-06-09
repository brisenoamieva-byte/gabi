"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  GraduationCap,
  HeartPulse,
  Landmark,
  MapPin,
  Route,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trees,
  TrendingUp,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { PostVisitaModal } from "@/components/recorrido/PostVisitaModal";
import { trackVisita } from "@/lib/visitas/client";
import { PasajeAcabadosPanel } from "@/components/PasajeAcabadosPanel";
import { CotizadorPanel } from "@/components/CotizadorPanel";
import { InvesttiSimuladorPanel } from "@/components/corredor/investti/InvesttiSimuladorPanel";
import {
  investtiCatalogHasSimulador,
  isInvesttiCatalogDesarrollo,
} from "@/lib/catalog/investti-desarrollos";
import {
  isPasajeDepartamentosCluster,
} from "@/lib/catalog/pasaje-alamos-acabados";
import {
  computePasajeSimulador,
  formatMonthYear,
  formatPctShort,
  PASAJE_FECHA_ENTREGA,
  type PasajeEsquemaPago,
  type PasajeUnidadTipo,
} from "@/lib/cotizador/pasaje-simulador";
import { DocumentDownloadButton } from "@/components/DocumentDownloadButton";
import {
  availabilityViewDescription,
  mapProductoFiltroToAvailabilityTipo,
  resolveAvailabilityConfig,
} from "@/lib/availability";
import {
  getPrecioDesdePrototipo,
  getUnidadesPorPrototipo,
  prototipoMuestraPrecioDesde,
} from "@/lib/inventario/prototipo-precios";
import { formatAreaM2 } from "@/lib/format/money";
import { formatSuperficiesLabel } from "@/lib/inventario/productos-recomendados";
import { fetchClusterInventario } from "@/lib/inventario/cluster-inventory-client";
import { useClusterInventario } from "@/lib/inventario/use-cluster-inventario";
import {
  clusters,
  enrichDesarrolloFromStatic,
  getDatosBancarios,
  desarrollos,
  formatPrice,
  getDisponibilidadesByCluster,
  getPrototipoById,
  prototipos as catalogPrototipos,
  type Cliente,
  type Cluster,
  type Desarrollo,
  type DisponibilidadUnidad,
  type Prototipo,
  type PuntoInteres,
} from "@/lib/data";
import {
  getDefaultRecorridoContenido,
  type RecorridoContenido,
  type RecorridoZonaContent,
} from "@/lib/catalog/recorrido-content";
import {
  leadRegistrationMessage,
  shouldQueueLeadForCrm,
} from "@/lib/crm/sync-policy";
import { DEFAULT_RECORRIDO_ETAPAS } from "@/lib/catalog/types";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
} from "@/lib/portal/session";

type ProductoFiltro = "casa" | "departamento" | "terreno" | "oficina";
type ProductoSeleccion = "todos" | ProductoFiltro;
type RecamarasFiltro = "2" | "3" | "4+";
type RecamarasSeleccion = "cualquiera" | RecamarasFiltro;
type ClienteTemporal = {
  nombre: string;
  telefono: string;
  email: string;
  medioContacto: Cliente["medioContacto"];
  objetivo: "vivir" | "invertir";
  presupuesto: number;
  familia: "1-2" | "3-4" | "5+";
  mascotas: boolean;
  notas: string;
};

type RecorridoState = {
  etapa: number;
  recorridoVersion?: number;
  leadId?: string;
  cliente: ClienteTemporal;
  productoTipo: ProductoSeleccion[];
  precioMinimo: number;
  precioMaximo: number;
  recamarasFiltro: RecamarasSeleccion[];
  clusterId: string;
  prototipoId: string;
  unidadId: string;
  descuento: number;
  esquema: "mensualidades" | "contado";
  pasajeEsquema?: PasajeEsquemaPago;
  pasajeLibreEnganche?: number;
  pasajeLibreMensualidades?: number;
  pasajeLibreFechaFiniquito?: string;
  pasajeLibreSinMensEnganche?: number;
  pasajeLibreSinMensPago?: number;
  pasajeLibreSinMensFechaPago?: string;
  pasajeLibreSinMensFechaFiniquito?: string;
};

const STORAGE_KEY = "gabi_recorrido_actual";
const CLIENTES_KEY = "gabi_clientes";
const LEADS_KEY = "gabi_leads";
const CRM_PENDING_KEY = "gabi_crm_pending";

const migrateLegacyEtapa = (
  etapa: number,
  parsed: Partial<RecorridoState>,
  stageCount = DEFAULT_RECORRIDO_ETAPAS.length,
) => {
  if (parsed.recorridoVersion === RECORRIDO_VERSION) {
    return Math.min(Math.max(etapa, 0), stageCount - 1);
  }

  if (etapa >= 2) {
    if (etapa === LEGACY_ETAPA_COUNT - 1) {
      return stageCount - 1;
    }

    if (parsed.clusterId || parsed.prototipoId) {
      return 3;
    }

    return 2;
  }

  return etapa;
};
const RECORRIDO_VERSION = 2;
const LEGACY_ETAPA_COUNT = 4;

const confianzaItems = [
  {
    title: "Saludar, sonreír, presentarse",
    detail: "Primer contacto cálido y profesional.",
  },
  {
    title: "Entregar tarjeta digital",
    detail: "Refuerza confianza y deja un canal claro de contacto.",
  },
  {
    title: "Ofrecer bebida",
    detail: "Agua, café o refresco para bajar tensión y abrir conversación.",
  },
  {
    title: "Frase de rompimiento de hielo",
    detail: "Conecta antes de preguntar; observa lenguaje corporal.",
  },
  {
    title: "Llenar formato de afluencia",
    detail: "Registra origen y datos clave sin interrumpir la plática.",
  },
];
const cierreItems = [
  "¿Qué producto y ubicación se queda?",
  "¿Anticipo con tarjeta crédito o débito?",
  "¿Formalizamos ahora o dejar pasar promo?",
  "Solicitud de compra generada",
  "Felicitar y agradecer",
];
const medioContactoOptions: { value: Cliente["medioContacto"]; label: string }[] = [
  { value: "contacto-directo", label: "Contacto Directo" },
  { value: "referido", label: "Referido" },
  { value: "medios-digitales", label: "Medios Digitales" },
  { value: "pase", label: "Pase" },
  { value: "inmobiliaria-externo", label: "Inmobiliaria/externo" },
  { value: "espectacular", label: "Espectacular" },
  { value: "cross-selling", label: "Cross Selling" },
];

const initialState: RecorridoState = {
  etapa: 0,
  recorridoVersion: RECORRIDO_VERSION,
  leadId: undefined,
  cliente: {
    nombre: "",
    telefono: "",
    email: "",
    medioContacto: "contacto-directo",
    objetivo: "vivir",
    presupuesto: 3500000,
    familia: "1-2",
    mascotas: false,
    notas: "",
  },
  productoTipo: ["todos"],
  precioMinimo: 2500000,
  precioMaximo: 7000000,
  recamarasFiltro: ["cualquiera"],
  clusterId: "",
  prototipoId: "",
  unidadId: "",
  descuento: 0,
  esquema: "mensualidades",
};

const money = (value: number) => formatPrice(Math.max(0, value));
const PRICE_STEP = 250000;
const DEFAULT_PRICE_OPTIONS = [
  2500000,
  3000000,
  3500000,
  4000000,
  4500000,
  5000000,
  5500000,
  6000000,
  6500000,
  7000000,
];

const roundDownToStep = (value: number) =>
  Math.floor(value / PRICE_STEP) * PRICE_STEP;

const roundUpToStep = (value: number) =>
  Math.ceil(value / PRICE_STEP) * PRICE_STEP;

const buildPriceOptionsFromRange = (
  minPrice: number,
  maxPrice: number,
): number[] => {
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || maxPrice <= 0) {
    return DEFAULT_PRICE_OPTIONS;
  }

  const start = Math.max(0, roundDownToStep(minPrice));
  const end = Math.max(start + PRICE_STEP, roundUpToStep(maxPrice));
  const stops = Math.min(40, Math.ceil((end - start) / PRICE_STEP) + 1);
  const options: number[] = [];

  for (let i = 0; i < stops; i += 1) {
    options.push(start + i * PRICE_STEP);
  }

  return options;
};

type StoredContact = {
  id?: string;
  email?: string;
  telefono?: string;
  normalizedEmail?: string;
  normalizedPhone?: string;
  cliente?: Partial<ClienteTemporal>;
};

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
const normalizePhone = (value?: string) => value?.replace(/\D/g, "") ?? "";

const readLocalArray = <T,>(key: string): T[] => {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeLocalArray = <T,>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const contactMatches = (contact: StoredContact, email: string, phone: string) => {
  const contactEmail = normalizeEmail(
    contact.normalizedEmail || contact.email || contact.cliente?.email,
  );
  const contactPhone = normalizePhone(
    contact.normalizedPhone || contact.telefono || contact.cliente?.telefono,
  );

  return Boolean((email && contactEmail === email) || (phone && contactPhone === phone));
};

const productTypeOptions: { value: ProductoSeleccion; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "terreno", label: "Terreno" },
  { value: "oficina", label: "Oficina" },
];

const desarrolloTipoToProducto: Record<
  Desarrollo["tiposProducto"][number],
  ProductoFiltro
> = {
  casas: "casa",
  departamentos: "departamento",
  terrenos: "terreno",
  oficinas: "oficina",
};

const getProductTypeOptionsForDesarrollo = (
  desarrollo: Desarrollo | null,
): { value: ProductoSeleccion; label: string }[] => {
  const allowed = new Set<ProductoFiltro>(
    (desarrollo?.tiposProducto ?? []).map((tipo) => desarrolloTipoToProducto[tipo]),
  );

  if (allowed.size === 0) {
    return productTypeOptions;
  }

  return productTypeOptions.filter(
    (option) => option.value === "todos" || allowed.has(option.value),
  );
};

const normalizeProductoTipo = (value: unknown): ProductoSeleccion[] => {
  if (Array.isArray(value)) {
    const validValues = value.filter((item): item is ProductoSeleccion =>
      productTypeOptions.some((option) => option.value === item),
    );

    return validValues.length ? validValues : ["todos"];
  }

  if (productTypeOptions.some((option) => option.value === value)) {
    return [value as ProductoSeleccion];
  }

  return ["todos"];
};

const recamarasOptions: { value: RecamarasSeleccion; label: string }[] = [
  { value: "cualquiera", label: "Cualquiera" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4+", label: "4+" },
];

const normalizeRecamarasFiltro = (value: unknown): RecamarasSeleccion[] => {
  if (Array.isArray(value)) {
    const validValues = value.filter((item): item is RecamarasSeleccion =>
      recamarasOptions.some((option) => option.value === item),
    );

    return validValues.length ? validValues : ["cualquiera"];
  }

  if (recamarasOptions.some((option) => option.value === value)) {
    return [value as RecamarasSeleccion];
  }

  return ["cualquiera"];
};

const hasTerrenos = (cluster: Cluster) =>
  cluster.tipo === "terrenos" || cluster.descripcion.toLowerCase().includes("terreno");

const getProductoTipo = (cluster: Cluster, prototipo: Prototipo): ProductoFiltro => {
  const name = prototipo.nombre.toLowerCase();

  if (cluster.tipo === "oficinas") {
    return "oficina";
  }

  if (cluster.tipo === "departamentos" || name.includes("tarento")) {
    return "departamento";
  }

  return "casa";
};

const productTypeLabels: Record<ProductoFiltro, string> = {
  casa: "Casas",
  departamento: "Departamentos",
  terreno: "Terrenos",
  oficina: "Oficinas",
};

const getClusterProductLabels = (
  cluster: Cluster,
  prototipos: Prototipo[],
  includeTerrenos: boolean,
) => {
  const productTypes = new Set<ProductoFiltro>();

  prototipos.forEach((prototipo) => {
    productTypes.add(getProductoTipo(cluster, prototipo));
  });

  if (cluster.tipo === "oficinas" && productTypes.size === 0) {
    productTypes.add("oficina");
  }

  if (includeTerrenos) {
    productTypes.add("terreno");
  }

  return Array.from(productTypes).map((type) => productTypeLabels[type]);
};

const matchesRecamaras = (recamaras: number, filtros: RecamarasSeleccion[]) => {
  if (filtros.includes("cualquiera")) {
    return true;
  }

  return filtros.some((filtro) =>
    filtro === "4+" ? recamaras >= 4 : recamaras === Number(filtro),
  );
};

const matchesProductoTipo = (productType: ProductoFiltro, filtros: ProductoSeleccion[]) =>
  filtros.includes("todos") || filtros.includes(productType);

const availabilityStatusLabel: Record<DisponibilidadUnidad["estatus"], string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
  bloqueado: "Bloqueado",
};

const availabilityStatusClass: Record<DisponibilidadUnidad["estatus"], string> = {
  disponible: "bg-[#22c55e] text-white ring-[#22c55e]/30",
  apartado: "bg-[#6CC24A] text-white ring-[#6CC24A]/30",
  vendido: "bg-slate-400 text-white ring-slate-300",
  bloqueado: "bg-slate-700 text-white ring-slate-400",
};

const availabilityTypeLabel: Record<"todos" | DisponibilidadUnidad["tipo"], string> = {
  todos: "Todos",
  casa: "Casas",
  departamento: "Deptos",
  terreno: "Terrenos",
  oficina: "Oficinas",
};

type RecommendedAvailability = {
  unit: DisponibilidadUnidad;
  prototipo?: Prototipo;
  score: number;
  reasons: string[];
};

export default function RecorridoPage() {
  const router = useRouter();
  const defaultContenido = getDefaultRecorridoContenido("la-vista-residencial");
  const [state, setState] = useState<RecorridoState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [activeDesarrollo, setActiveDesarrollo] = useState<Desarrollo | null>(null);
  const [activeContenido, setActiveContenido] = useState<RecorridoContenido>(defaultContenido);
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
  const [remoteAvailabilityUnits, setRemoteAvailabilityUnits] = useState<
    DisponibilidadUnidad[] | null
  >(null);
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
          getDisponibilidadesByCluster(prototipo.clusterId),
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
  }, [activeDesarrollo, activeClusters, activePrototipos]);

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
  const { units: cotizadorInventario } = useClusterInventario(
    activeDesarrollo?.id,
    state.clusterId || undefined,
  );

  const clusterInventario = useMemo(() => {
    if (!state.clusterId) {
      return [];
    }

    return cotizadorInventario.length > 0
      ? cotizadorInventario
      : getDisponibilidadesByCluster(state.clusterId);
  }, [cotizadorInventario, state.clusterId]);

  const filteredPrototiposByCluster = useMemo(() => {
    const byCluster = new Map<string, Prototipo[]>();
    activeClusters.forEach((cluster) => {
      const clusterInventario = getDisponibilidadesByCluster(cluster.id);
      const matches = activePrototipos
        .filter((item) => item.clusterId === cluster.id)
        .filter((prototipo) => {
        const productType = getProductoTipo(cluster, prototipo);
        const matchesType = matchesProductoTipo(productType, selectedProductTypes);
        const unidades = getUnidadesPorPrototipo(clusterInventario, prototipo.id);
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
  ]);

  const filteredClusters = useMemo(
    () =>
      activeClusters.filter((cluster) => {
        const productMatches = filteredPrototiposByCluster.get(cluster.id)?.length;
        const terrainMatches =
          (selectedProductTypes.includes("todos") ||
            selectedProductTypes.includes("terreno")) &&
          selectedRooms.includes("cualquiera") &&
          hasTerrenos(cluster) &&
          cluster.precioDesde >= state.precioMinimo &&
          cluster.precioDesde <= state.precioMaximo;

        return Boolean(productMatches || terrainMatches);
      }),
    [
      filteredPrototiposByCluster,
      state.precioMaximo,
      state.precioMinimo,
      selectedProductTypes,
      selectedRooms,
      activeClusters,
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
  useEffect(() => {
    if (!availabilityCluster || !activeDesarrollo) {
      setRemoteAvailabilityUnits(null);
      return;
    }

    let cancelled = false;

    const loadCuratedProducts = async () => {
      const result = await fetchClusterInventario(
        activeDesarrollo.id,
        availabilityCluster.id,
      );

      if (cancelled) {
        return;
      }

      if (result.source === "supabase") {
        setRemoteAvailabilityUnits(result.units);
      } else {
        setRemoteAvailabilityUnits(null);
      }
    };

    void loadCuratedProducts();

    return () => {
      cancelled = true;
    };
  }, [activeDesarrollo, availabilityCluster]);

  const isCuratedAvailability =
    remoteAvailabilityUnits !== null && remoteAvailabilityUnits.length > 0;

  const availabilityUnits = useMemo(
    () => {
      if (!availabilityCluster) {
        return [];
      }

      if (isCuratedAvailability) {
        return remoteAvailabilityUnits ?? [];
      }

      return getDisponibilidadesByCluster(availabilityCluster.id);
    },
    [availabilityCluster, isCuratedAvailability, remoteAvailabilityUnits],
  );

  const recommendedAvailability = useMemo<RecommendedAvailability[]>(() => {
    if (isCuratedAvailability) {
      return availabilityUnits
        .filter((unit) => unit.estatus === "disponible")
        .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99))
        .map((unit) => {
          const prototipo = unit.prototipoId ? getPrototipoById(unit.prototipoId) : undefined;
          const reasons = [
            ...unit.razonesVenta,
            unit.instruccionRecorrido,
          ].filter(Boolean) as string[];

          return {
            unit,
            prototipo,
            score: 100 - (unit.orden ?? 0),
            reasons: reasons.length
              ? reasons
              : ["Producto seleccionado por gerencia comercial para mostrar en visita."],
          };
        });
    }

    const scored = availabilityUnits
      .filter((unit) => unit.estatus !== "vendido" && unit.estatus !== "bloqueado")
      .map((unit) => {
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
        const statusScore =
          unit.estatus === "disponible" ? 25 : unit.estatus === "apartado" ? -35 : -80;
        const visitableScore = unit.visitable ? 10 : -20;
        const score =
          (productMatches ? 40 : 0) +
          (priceMatches ? 30 : 0) +
          (roomsMatches ? 20 : 0) +
          (immediateDelivery ? 15 : 0) +
          (selectedPrototypeMatches ? 10 : 0) +
          priorityScore +
          statusScore +
          visitableScore;
        const reasons = [
          productMatches && "Coincide con el tipo de producto que busca el cliente.",
          priceMatches && "Está dentro del presupuesto capturado.",
          roomsMatches && prototipo && `Coincide con ${prototipo.recamaras} recámaras.`,
          immediateDelivery && "Tiene entrega inmediata.",
          selectedPrototypeMatches && "Coincide con el prototipo seleccionado.",
          unit.visitable && "Es una unidad visitable para dirigir el recorrido.",
          ...unit.razonesVenta,
        ].filter(Boolean) as string[];

        return { unit, prototipo, score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 3);
  }, [
    availabilityUnits,
    isCuratedAvailability,
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
        isCuratedAvailability,
      ),
    [availabilityUnits, isCuratedAvailability, selectedProductTypes],
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
  const precioFinal = selectedPrototipo
    ? selectedPrototipo.precioBase - state.descuento
    : 0;

  const pasajeSimuladorResult = useMemo(() => {
    if (activeDesarrollo?.id !== "pasaje-alamos") return null;
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

  const [asesorNombre, setAsesorNombre] = useState<string | undefined>();
  const [asesorId, setAsesorId] = useState<string | undefined>();

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gabi_user");
      if (raw) {
        const parsed = JSON.parse(raw) as { id?: string; nombre?: string };
        if (parsed?.nombre) setAsesorNombre(parsed.nombre);
        if (parsed?.id) setAsesorId(parsed.id);
      }
    } catch {
      // Ignorar parse errors en localStorage.
    }
  }, []);

  useEffect(() => {
    const portal = readPortalSession();
    if (!localStorage.getItem("gabi_user")) {
      router.replace(portal ? resolveAdvisorEntryPath(portal) : "/portal");
      return;
    }

    if (!localStorage.getItem("gabi_desarrollo")) {
      router.replace("/desarrollos");
      return;
    }

    const desarrolloId = localStorage.getItem("gabi_desarrollo") ?? "";

    const loadCatalog = async () => {
      try {
        const response = await fetch(
          `/api/catalog/recorrido?desarrolloId=${encodeURIComponent(desarrolloId)}`,
        );
        const data = (await response.json()) as {
          desarrollo?: Desarrollo;
          clusters?: Cluster[];
          prototipos?: Prototipo[];
          recorridoEtapas?: string[];
          recorridoContenido?: RecorridoContenido;
        };

        if (data.desarrollo) {
          setActiveDesarrollo(enrichDesarrolloFromStatic(data.desarrollo));
        } else {
          setActiveDesarrollo(desarrollos.find((item) => item.id === desarrolloId) ?? null);
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
      } catch {
        setActiveDesarrollo(desarrollos.find((item) => item.id === desarrolloId) ?? null);
      }
    };

    void loadCatalog();

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<RecorridoState>;
        setState({
          ...initialState,
          ...parsed,
          etapa: migrateLegacyEtapa(parsed.etapa ?? 0, parsed),
          recorridoVersion: RECORRIDO_VERSION,
          productoTipo: normalizeProductoTipo(parsed.productoTipo),
          recamarasFiltro: normalizeRecamarasFiltro(parsed.recamarasFiltro),
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    setLoaded(true);
  }, [router]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

    const existingClients = readLocalArray<StoredContact>(CLIENTES_KEY);
    const existingLeads = readLocalArray<StoredContact>(LEADS_KEY);
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

    const storedUser = localStorage.getItem("gabi_user");
    const asesor = storedUser ? JSON.parse(storedUser) : null;
    const desarrolloId = localStorage.getItem("gabi_desarrollo") ?? "";
    const lead = {
      id: crypto.randomUUID(),
      cliente: state.cliente,
      nombre: state.cliente.nombre,
      email: normalizedEmail,
      telefono: normalizedPhone,
      medioContacto: state.cliente.medioContacto,
      asesorId: asesor?.id ?? "local",
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
      writeLocalArray(LEADS_KEY, [...existingLeads, savedLead]);
      patchState({ leadId: savedLead.id });

      void trackVisita({
        tipo: "lead_registrado",
        desarrolloId,
        asesorId: lead.asesorId,
        asesorNombre: asesor?.nombre,
        clienteNombre: clientName,
        clienteEmail: normalizedEmail,
        clienteTelefono: normalizedPhone,
        medioContacto: state.cliente.medioContacto,
        crmStatus: savedLead.crmStatus,
        crmId: savedLead.crmId,
      });

      if (shouldQueueLeadForCrm(result)) {
        writeLocalArray(CRM_PENDING_KEY, [
          ...readLocalArray(CRM_PENDING_KEY),
          savedLead,
        ]);
      }

      setClientValidationStatus("success");
      setClientValidationMessage(leadRegistrationMessage(result));
      return true;
    } catch {
      const queuedLead = { ...lead, crmStatus: "local" };
      writeLocalArray(LEADS_KEY, [...existingLeads, queuedLead]);
      patchState({ leadId: queuedLead.id });
      void trackVisita({
        tipo: "lead_registrado",
        desarrolloId,
        asesorId: lead.asesorId,
        asesorNombre: asesor?.nombre,
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
    () => getDatosBancarios(activeDesarrollo?.id),
    [activeDesarrollo?.id],
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
    let asesorId = "local";
    let asesorNombre = "Asesor";
    let desarrolloId = activeDesarrollo?.id ?? "";

    try {
      const userRaw = localStorage.getItem("gabi_user");
      const storedDesarrollo = localStorage.getItem("gabi_desarrollo");
      if (userRaw) {
        const user = JSON.parse(userRaw) as { id?: string; nombre?: string };
        if (user.id) {
          asesorId = user.id;
        }
        if (user.nombre) {
          asesorNombre = user.nombre;
        }
      }
      if (storedDesarrollo) {
        desarrolloId = storedDesarrollo;
      }
    } catch {
      // Usar valores por defecto si la sesión local está corrupta.
    }

    const clientId = crypto.randomUUID();
    const saved = localStorage.getItem(CLIENTES_KEY);
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

    localStorage.setItem(CLIENTES_KEY, JSON.stringify([...previousClients, newClient]));
    localStorage.removeItem(STORAGE_KEY);

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

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] text-[#1e293b]">
        <p className="text-xl font-bold">Cargando recorrido...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bbr-cream text-bbr-purple">
      <section className="sticky top-0 z-30 border-b border-bbr-cream-dark bg-bbr-cream/95 px-5 py-4 shadow-sm backdrop-blur md:px-8">
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
                          <span>{money(2500000)}</span>
                          <span>{money(7000000)}</span>
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
                    {masterPlanImage ? (
                      <div className="mt-6 space-y-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6CC24A]">
                            Master plan
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Ubica clusters, plazas, parques y accesos con el cliente antes de
                            filtrar producto.
                          </p>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-[#201044]/10 bg-white shadow-inner">
                          <Image
                            src={masterPlanImage}
                            alt={`Master plan · ${activeContenido.overview.titulo}`}
                            width={1600}
                            height={1200}
                            className="h-auto w-full object-contain"
                            priority={false}
                          />
                        </div>
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
                      <div className="mt-5">
                        <DocumentDownloadButton
                          compact
                          variant="desarrollo"
                          desarrolloId={activeDesarrollo.id}
                          label="Brochure del desarrollo"
                        />
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
                                Desde {money(cluster.precioDesde)}
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
                                {money(precioDesde)}
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
                      ) : isInvesttiCatalogDesarrollo(activeDesarrollo?.id) ? (
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
                              Desde {money(precioDesdePrototipoSeleccionado)}
                              <span className="mt-1 block text-sm font-semibold text-slate-500">
                                {unidadesPrototipoSeleccionado.length} unidades de este modelo;
                                el precio varía por nivel y ubicación.
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="mr-3 text-lg text-slate-400 line-through">
                                {money(selectedPrototipo.precioBase)}
                              </span>
                              {money(precioDesdePrototipoSeleccionado)}
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
                            Ver unidades recomendadas
                          </button>
                          <button
                            type="button"
                            onClick={() => openCotizador()}
                            className="rounded-2xl bg-[#6CC24A] px-5 py-5 text-lg font-black text-white shadow-lg active:scale-95"
                          >
                            Cotizar ahora
                          </button>
                        </div>
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

      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goToStep(state.etapa - 1)}
            disabled={state.etapa === 0}
            className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-base font-black text-[#201044] shadow-sm transition disabled:opacity-40"
          >
            <ArrowLeft className="h-5 w-5" />
            Anterior
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={state.etapa === recorridoEtapas.length - 1 || isRegisteringLead}
            className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#201044] px-6 text-base font-black text-white shadow-lg transition disabled:opacity-40"
          >
            {isRegisteringLead ? "Validando..." : "Siguiente"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </footer>

      {showAvailability && availabilityCluster && (
        <Modal
          onClose={() => setShowAvailability(false)}
          title={`Unidades recomendadas · ${availabilityCluster.nombre}`}
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
                    Te recomendamos mostrar estas unidades.
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-white/75">
                    {isCuratedAvailability
                      ? "Seleccionadas por gerencia comercial para esta visita."
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
                      No hay unidades recomendables en este momento.
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
        (selectedPrototipo || isInvesttiCatalogDesarrollo(activeDesarrollo.id)) && (
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
            asesorNombre={asesorNombre}
            asesorId={asesorId}
            catalog={{ clusters: activeClusters, prototipos: activePrototipos }}
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
                {money(pasajeSimuladorResult?.precioTotal ?? precioFinal)}
              </p>
              {pasajeSimuladorResult ? (
                <p className="text-xs text-slate-500">
                  Lista {money(pasajeSimuladorResult.precioLista)} · Contado{" "}
                  {money(pasajeSimuladorResult.precioContado)}
                </p>
              ) : null}
            </SummaryBox>
            {pasajeSimuladorResult ? (
              <SummaryBox title={`Esquema · ${pasajeSimuladorResult.esquemaLabel}`}>
                <p>
                  Enganche ({formatPctShort(pasajeSimuladorResult.enganchePct)}):{" "}
                  <strong>{money(pasajeSimuladorResult.enganche)}</strong>
                </p>
                {pasajeSimuladorResult.numMensualidades &&
                pasajeSimuladorResult.mensualidadCliente ? (
                  <p>
                    {pasajeSimuladorResult.numMensualidades} mensualidades de{" "}
                    <strong>{money(pasajeSimuladorResult.mensualidadCliente)}</strong>
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
                    <strong>{money(pasajeSimuladorResult.pagoIntermedio)}</strong>
                    {pasajeSimuladorResult.fechaPagoIntermedio
                      ? ` en ${formatMonthYear(pasajeSimuladorResult.fechaPagoIntermedio)}`
                      : ""}
                  </p>
                ) : null}
                {pasajeSimuladorResult.finiquito ? (
                  <p>
                    Finiquito ({formatPctShort(pasajeSimuladorResult.finiquitoPct ?? 0)}):{" "}
                    <strong>{money(pasajeSimuladorResult.finiquito)}</strong>
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
            <SummaryBox title="Datos bancarios">
              <p>{activeDatosBancarios.razonSocial}</p>
              <p>RFC: {activeDatosBancarios.rfc}</p>
              <p>Banco: {activeDatosBancarios.banco}</p>
              <p>Cuenta: {activeDatosBancarios.cuenta}</p>
              <p>CLABE: {activeDatosBancarios.clabe}</p>
              <p>Concepto: {activeDatosBancarios.concepto}</p>
            </SummaryBox>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={copyBankData}
                className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#201044] px-6 text-lg font-black text-white"
              >
                <Copy className="h-6 w-6" />
                {copied ? "Datos copiados" : "Copiar datos bancarios"}
              </button>
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

function StepCard({
  eyebrow,
  title,
  tip,
  children,
}: {
  eyebrow: string;
  title: string;
  tip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#6CC24A]">
          {eyebrow}
        </p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="text-3xl font-black text-[#201044] md:text-5xl">{title}</h2>
          <div className="flex max-w-xl items-start gap-3 rounded-2xl bg-[#6CC24A]/15 p-4 text-[#201044]">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#6CC24A]" />
            <p className="font-bold">{tip}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function BudgetCurrencyInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const clamp = (amount: number) => Math.min(max, Math.max(min, amount));

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={editing ? draft : money(value)}
      onFocus={(event) => {
        setEditing(true);
        setDraft(String(value));
        requestAnimationFrame(() => event.target.select());
      }}
      onBlur={() => {
        setEditing(false);
        const parsed = clamp(Number(draft.replace(/\D/g, "")) || min);
        onChange(parsed);
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "");
        setDraft(digits);
        if (digits) {
          onChange(clamp(Number(digits)));
        }
      }}
      className="input-xl tabular-nums tracking-tight"
      aria-label="Presupuesto aproximado en pesos mexicanos"
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-black text-[#201044]">{label}</span>
      {children}
    </label>
  );
}

function PriceSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  const optionValues = options.includes(value)
    ? options
    : [...options, value].sort((a, b) => a - b);

  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="input-xl appearance-none"
      >
        {optionValues.map((option) => (
          <option key={option} value={option}>
            {formatPrice(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function AvailabilityUnitCard({
  unit,
  recommendation,
  rank,
  selected,
  onSelect,
}: {
  unit: DisponibilidadUnidad;
  recommendation?: RecommendedAvailability;
  rank?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const prototipo = recommendation?.prototipo ?? (unit.prototipoId ? getPrototipoById(unit.prototipoId) : undefined);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.5rem] p-4 text-left shadow-lg transition active:scale-[0.99] ${
        selected ? "bg-[#201044] text-white" : "bg-white text-[#201044]"
      }`}
    >
      <div className="flex items-start gap-3">
        {rank ? (
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black ${
              selected ? "bg-[#6CC24A] text-white" : "bg-[#6CC24A]/15 text-[#6CC24A]"
            }`}
          >
            {rank}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-black">{unit.unidad}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${availabilityStatusClass[unit.estatus]}`}
            >
              {availabilityStatusLabel[unit.estatus]}
            </span>
          </span>
          <span className="mt-1 block text-sm font-semibold opacity-75">
            {prototipo?.nombre ?? availabilityTypeLabel[unit.tipo]}
            {unit.precio ? ` | ${money(unit.precio)}` : ""}
            {formatSuperficiesLabel(unit) ? ` | ${formatSuperficiesLabel(unit)}` : ""}
            {unit.entrega ? ` | Entrega ${unit.entrega}` : ""}
          </span>
          <span className="mt-3 block rounded-2xl bg-white/10 p-3 text-sm font-semibold">
            {recommendation?.reasons[0] ??
              unit.razonesVenta[0] ??
              "Unidad disponible para comparar con el cliente."}
          </span>
        </span>
      </div>
    </button>
  );
}

function AvailabilityUnitDetail({
  unit,
  recommendation,
  onShow,
  onQuote,
}: {
  unit?: DisponibilidadUnidad;
  recommendation?: RecommendedAvailability;
  onShow: () => void;
  onQuote: () => void;
}) {
  if (!unit) {
    return (
      <div className="rounded-[2rem] bg-white p-5 shadow-lg">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#6CC24A]">
          Unidad seleccionada
        </p>
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 font-semibold text-slate-500">
          No hay unidades disponibles cargadas para este cluster.
        </p>
      </div>
    );
  }

  const reasons = (recommendation?.reasons ?? unit.razonesVenta).slice(0, 3);

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-lg">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#6CC24A]">
        Unidad seleccionada
      </p>
      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-[#201044]">{unit.unidad}</h3>
            <p className="mt-1 font-semibold capitalize text-slate-500">
              {unit.tipo}
              {unit.etapa ? ` | Etapa ${unit.etapa}` : ""}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-2 text-xs font-black ${availabilityStatusClass[unit.estatus]}`}
          >
            {availabilityStatusLabel[unit.estatus]}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Spec label="Precio" value={unit.precio ? money(unit.precio) : "Por confirmar"} />
          <Spec
            label="Superficie"
            value={formatSuperficiesLabel(unit) || "Por confirmar"}
          />
          <Spec label="Entrega" value={unit.entrega ?? "Por confirmar"} />
          <Spec label="Nivel" value={unit.nivel ?? "-"} />
        </div>
        {reasons.length ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">Qué decir</p>
            <div className="mt-3 space-y-2">
              {reasons.map((reason) => (
                <p key={reason} className="flex gap-2 text-sm font-semibold text-[#201044]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
                  {reason}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        {unit.instruccionRecorrido && (
          <p className="rounded-2xl bg-[#6CC24A]/10 p-4 text-sm font-bold text-[#201044]">
            Recorrido: {unit.instruccionRecorrido}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onShow}
            className="rounded-2xl border border-[#201044]/20 bg-white px-4 py-4 text-sm font-black text-[#201044] shadow-sm"
          >
            Mostrar esta unidad
          </button>
          <button
            type="button"
            disabled={!unit.prototipoId}
            onClick={onQuote}
            className="rounded-2xl bg-[#6CC24A] px-4 py-4 text-sm font-black text-white shadow-sm disabled:opacity-40"
          >
            Usar para cotización
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-14 rounded-xl px-4 text-base font-black transition ${
            value === option.value ? "bg-[#201044] text-white shadow" : "text-slate-500"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToggleCard({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-2xl p-5 text-left text-lg font-black shadow-sm transition ${
        checked ? "bg-[#201044] text-white" : "bg-slate-50 text-[#201044]"
      }`}
    >
      <span className="mb-3 block">{label}</span>
      <span className="text-sm opacity-75">{checked ? "Sí" : "No"}</span>
    </button>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-2xl font-black text-[#201044] md:text-3xl">{title}</h2>;
}

function ProductNarrativeCard({
  step,
  title,
  subtitle,
  icon,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.3 }}
      className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6CC24A]">
            Paso {step}
          </p>
          <h3 className="mt-2 text-2xl font-black text-[#201044] md:text-4xl">
            {title}
          </h3>
          <p className="mt-2 max-w-3xl text-base font-semibold text-slate-500 md:text-lg">
            {subtitle}
          </p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#201044] text-white">
          {icon}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function ZoneMap({ zona }: { zona: RecorridoZonaContent }) {
  const destacados = zona.puntosCercanos.filter((punto) => punto.destacado);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg">
      <div className="relative h-[280px] bg-slate-100 md:h-[420px]">
        <iframe
          title={`Mapa de ubicación · ${zona.centro}`}
          src={zona.mapaEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6CC24A]">
            Punto central
          </p>
          <p className="mt-1 text-lg font-black text-[#201044]">{zona.centro}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            {zona.direccion}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <a
          href={zona.mapaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-[#201044] px-4 text-center text-sm font-black text-white transition hover:bg-[#35156D] active:scale-95"
        >
          Abrir ubicación exacta en Google Maps
        </a>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Referencias clave
          </p>
          <div className="flex flex-wrap gap-2">
            {destacados.map((punto) => (
              <span
                key={punto.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#6CC24A]/25 bg-[#6CC24A]/10 px-3 py-1.5 text-xs font-bold text-[#201044]"
              >
                <MapPin className="h-3 w-3 text-[#6CC24A]" />
                {punto.nombre} · {punto.tiempo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const categoriaIconMap: Record<string, LucideIcon> = {
  Comercio: ShoppingBag,
  Supermercados: Store,
  Educación: GraduationCap,
  Salud: HeartPulse,
  Conectividad: Route,
  "Cultura y ocio": Landmark,
  Empleo: Briefcase,
  "Vida diaria": UtensilsCrossed,
  Entorno: Trees,
};

function NearbyPointCard({ punto }: { punto: PuntoInteres }) {
  const Icon = categoriaIconMap[punto.categoria] ?? MapPin;

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        punto.destacado
          ? "border-[#6CC24A]/35 bg-[#6CC24A]/8"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            punto.destacado ? "bg-[#201044] text-white" : "bg-slate-100 text-[#201044]"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#6CC24A]">
              {punto.categoria}
            </p>
            {punto.destacado ? (
              <span className="rounded-full bg-[#201044] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Clave
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-black leading-snug text-[#201044]">{punto.nombre}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Aprox. {punto.tiempo}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{punto.detalle}</p>
        </div>
      </div>
    </article>
  );
}

function NearbyPointsPanel({ zona }: { zona: RecorridoZonaContent }) {
  const grouped = useMemo(() => {
    const map = new Map<string, PuntoInteres[]>();

    for (const categoria of zona.categoriasOrden) {
      const items = zona.puntosCercanos.filter((punto) => punto.categoria === categoria);
      if (items.length) {
        map.set(categoria, items);
      }
    }

    return map;
  }, [zona]);

  return (
    <div className="max-h-[520px] space-y-5 overflow-y-auto pr-1">
      {Array.from(grouped.entries()).map(([categoria, puntos]) => (
        <section key={categoria}>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#201044]">
            {categoria}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {puntos.length}
            </span>
          </h4>
          <div className="grid gap-3">
            {puntos.map((punto) => (
              <NearbyPointCard key={punto.id} punto={punto} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-black text-[#201044]">{value}</p>
    </div>
  );
}

function ListBox({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-lg">
      <h3 className="mb-4 text-lg font-black text-[#201044]">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="flex gap-2 text-sm font-semibold text-slate-600">
            {positive ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22c55e]" />
            ) : (
              <X className="h-5 w-5 shrink-0 text-slate-400" />
            )}
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  size = "default",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/70 p-2 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-h-[94vh] w-full overflow-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-8 ${
          size === "wide" ? "max-w-[96rem]" : "max-w-5xl"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#201044] md:text-3xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-[#201044]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function SummaryBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <h3 className="mb-3 text-lg font-black text-[#201044]">{title}</h3>
      <div className="space-y-1 font-semibold text-slate-600">{children}</div>
    </div>
  );
}
