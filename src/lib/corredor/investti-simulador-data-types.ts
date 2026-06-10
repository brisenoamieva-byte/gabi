export type InvesttiDesarrolloReglas = {
  engancheMinPct: number;
  plazoMaxMeses: number;
  mensualidadMinima: number;
  apartado: number;
};

export type InvesttiEsquemaConfig = {
  id: string;
  label: string;
  enganchePct: number;
  engancheDiferidoMeses: number;
  plazoMeses: number;
};

export type InvesttiSimuladorConfigData = {
  generatedAt: string;
  source: string;
  interestAnual: number;
  apartadoDefault: number;
  descuentosEsquemaPct: Record<string, number>;
  esquemas: InvesttiEsquemaConfig[];
  desarrolloSlug: Record<string, string>;
  slugDesarrollo: Record<string, string>;
  stats?: {
    lotes: number;
    byDev: Record<string, number>;
    precioDesdeLista?: Partial<Record<string, number>>;
    precioContadoDesde?: Partial<Record<string, number>>;
  };
  reglas: Record<string, InvesttiDesarrolloReglas>;
};

export type InvesttiLoteData = {
  desarrollo: string;
  manzana: string;
  lote: string;
  key: string;
  superficie: number;
  tipo: string;
  precioM2: number;
  precioLista: number;
  contado: number | null;
  m6?: number | null;
  m12?: number | null;
  m18?: number | null;
  m24?: number | null;
  m36?: number | null;
  m48?: number | null;
  m60?: number | null;
  entrega: string | null;
};

export type InvesttiSimuladorPayload = InvesttiSimuladorConfigData & {
  manzanas?: Array<{ desarrollo: string; manzana: string }>;
  lotes: InvesttiLoteData[];
};

export type InvesttiSimuladorPublishMeta = {
  source: string;
  generatedAt: string;
  updatedAt: string;
  origin: "supabase" | "static";
  stats: {
    lotes: number;
    byDev: Record<string, number>;
    precioDesdeLista?: Partial<Record<string, number>>;
    precioContadoDesde?: Partial<Record<string, number>>;
  };
};
