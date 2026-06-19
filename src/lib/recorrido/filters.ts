import type { Cluster, Desarrollo, DisponibilidadUnidad, Prototipo } from "@/lib/data";
import type {
  ProductoFiltro,
  ProductoSeleccion,
  RecamarasSeleccion,
  StoredContact,
} from "@/lib/recorrido/types";

export const PRICE_STEP = 250000;

export const DEFAULT_PRICE_OPTIONS = [
  2500000, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000,
];

export const roundDownToStep = (value: number) => Math.floor(value / PRICE_STEP) * PRICE_STEP;

export const roundUpToStep = (value: number) => Math.ceil(value / PRICE_STEP) * PRICE_STEP;

export function buildPriceOptionsFromRange(minPrice: number, maxPrice: number): number[] {
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
}

export const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
export const normalizePhone = (value?: string) => value?.replace(/\D/g, "") ?? "";

export function readLocalArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalArray<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function contactMatches(contact: StoredContact, email: string, phone: string) {
  const contactEmail = normalizeEmail(
    contact.normalizedEmail || contact.email || contact.cliente?.email,
  );
  const contactPhone = normalizePhone(
    contact.normalizedPhone || contact.telefono || contact.cliente?.telefono,
  );

  return Boolean((email && contactEmail === email) || (phone && contactPhone === phone));
}

export const productTypeOptions: { value: ProductoSeleccion; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "terreno", label: "Terreno" },
  { value: "oficina", label: "Oficina" },
];

const desarrolloTipoToProducto: Record<Desarrollo["tiposProducto"][number], ProductoFiltro> = {
  casas: "casa",
  departamentos: "departamento",
  terrenos: "terreno",
  oficinas: "oficina",
};

export function getProductTypeOptionsForDesarrollo(desarrollo: Desarrollo | null) {
  const allowed = new Set<ProductoFiltro>(
    (desarrollo?.tiposProducto ?? []).map((tipo) => desarrolloTipoToProducto[tipo]),
  );

  if (allowed.size === 0) {
    return productTypeOptions;
  }

  return productTypeOptions.filter(
    (option) => option.value === "todos" || allowed.has(option.value),
  );
}

export function normalizeProductoTipo(value: unknown): ProductoSeleccion[] {
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
}

export const recamarasOptions: { value: RecamarasSeleccion; label: string }[] = [
  { value: "cualquiera", label: "Cualquiera" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4+", label: "4+" },
];

export function normalizeRecamarasFiltro(value: unknown): RecamarasSeleccion[] {
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
}

export const hasTerrenos = (cluster: Cluster) =>
  cluster.tipo === "terrenos" || cluster.descripcion.toLowerCase().includes("terreno");

export function getProductoTipo(cluster: Cluster, prototipo: Prototipo): ProductoFiltro {
  const name = prototipo.nombre.toLowerCase();

  if (cluster.tipo === "oficinas") {
    return "oficina";
  }

  if (cluster.tipo === "departamentos" || name.includes("tarento")) {
    return "departamento";
  }

  return "casa";
}

export const productTypeLabels: Record<ProductoFiltro, string> = {
  casa: "Casas",
  departamento: "Departamentos",
  terreno: "Terrenos",
  oficina: "Oficinas",
};

export function getClusterProductLabels(
  cluster: Cluster,
  prototipos: Prototipo[],
  includeTerrenos: boolean,
) {
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
}

export function matchesRecamaras(recamaras: number, filtros: RecamarasSeleccion[]) {
  if (filtros.includes("cualquiera")) {
    return true;
  }

  return filtros.some((filtro) =>
    filtro === "4+" ? recamaras >= 4 : recamaras === Number(filtro),
  );
}

export const matchesProductoTipo = (productType: ProductoFiltro, filtros: ProductoSeleccion[]) =>
  filtros.includes("todos") || filtros.includes(productType);

export const availabilityStatusLabel: Record<DisponibilidadUnidad["estatus"], string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
  bloqueado: "Bloqueado",
};

export const availabilityStatusClass: Record<DisponibilidadUnidad["estatus"], string> = {
  disponible: "bg-[#22c55e] text-white ring-[#22c55e]/30",
  apartado: "bg-[#6CC24A] text-white ring-[#6CC24A]/30",
  vendido: "bg-slate-400 text-white ring-slate-300",
  bloqueado: "bg-slate-700 text-white ring-slate-400",
};

export const availabilityTypeLabel: Record<"todos" | DisponibilidadUnidad["tipo"], string> = {
  todos: "Todos",
  casa: "Casas",
  departamento: "Deptos",
  terreno: "Terrenos",
  oficina: "Oficinas",
};
