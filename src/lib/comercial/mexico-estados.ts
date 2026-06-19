/** Normalización de origen_ciudad → entidad federativa (ids @svg-maps/mexico). */

export type MexicoEstadoId =
  | "agu"
  | "bcn"
  | "bcs"
  | "cam"
  | "chp"
  | "chh"
  | "coa"
  | "col"
  | "dur"
  | "gua"
  | "gro"
  | "hid"
  | "jal"
  | "cmx"
  | "mex"
  | "mic"
  | "mor"
  | "nay"
  | "nle"
  | "oax"
  | "pue"
  | "que"
  | "roo"
  | "slp"
  | "sin"
  | "son"
  | "tab"
  | "tam"
  | "tla"
  | "ver"
  | "yuc"
  | "zac"
  | "ext"
  | "unk";

export type MexicoEstadoMeta = {
  id: MexicoEstadoId;
  nombre: string;
  abrev?: string;
};

export const MEXICO_ESTADOS: MexicoEstadoMeta[] = [
  { id: "agu", nombre: "Aguascalientes", abrev: "AGS" },
  { id: "bcn", nombre: "Baja California", abrev: "BC" },
  { id: "bcs", nombre: "Baja California Sur", abrev: "BCS" },
  { id: "cam", nombre: "Campeche", abrev: "CAMP" },
  { id: "chp", nombre: "Chiapas", abrev: "CHIS" },
  { id: "chh", nombre: "Chihuahua", abrev: "CHIH" },
  { id: "coa", nombre: "Coahuila", abrev: "COAH" },
  { id: "col", nombre: "Colima", abrev: "COL" },
  { id: "dur", nombre: "Durango", abrev: "DGO" },
  { id: "gua", nombre: "Guanajuato", abrev: "GTO" },
  { id: "gro", nombre: "Guerrero", abrev: "GRO" },
  { id: "hid", nombre: "Hidalgo", abrev: "HGO" },
  { id: "jal", nombre: "Jalisco", abrev: "JAL" },
  { id: "cmx", nombre: "Ciudad de México", abrev: "CDMX" },
  { id: "mex", nombre: "Estado de México", abrev: "MEX" },
  { id: "mic", nombre: "Michoacán", abrev: "MICH" },
  { id: "mor", nombre: "Morelos", abrev: "MOR" },
  { id: "nay", nombre: "Nayarit", abrev: "NAY" },
  { id: "nle", nombre: "Nuevo León", abrev: "NL" },
  { id: "oax", nombre: "Oaxaca", abrev: "OAX" },
  { id: "pue", nombre: "Puebla", abrev: "PUE" },
  { id: "que", nombre: "Querétaro", abrev: "QRO" },
  { id: "roo", nombre: "Quintana Roo", abrev: "QROO" },
  { id: "slp", nombre: "San Luis Potosí", abrev: "SLP" },
  { id: "sin", nombre: "Sinaloa", abrev: "SIN" },
  { id: "son", nombre: "Sonora", abrev: "SON" },
  { id: "tab", nombre: "Tabasco", abrev: "TAB" },
  { id: "tam", nombre: "Tamaulipas", abrev: "TAMPS" },
  { id: "tla", nombre: "Tlaxcala", abrev: "TLAX" },
  { id: "ver", nombre: "Veracruz", abrev: "VER" },
  { id: "yuc", nombre: "Yucatán", abrev: "YUC" },
  { id: "zac", nombre: "Zacatecas", abrev: "ZAC" },
];

const ESTADO_BY_ID = Object.fromEntries(MEXICO_ESTADOS.map((e) => [e.id, e])) as Record<
  Exclude<MexicoEstadoId, "ext" | "unk">,
  MexicoEstadoMeta
>;

const stripAccents = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

type AliasEntry = { id: Exclude<MexicoEstadoId, "ext" | "unk">; terms: string[] };

const ALIAS_ENTRIES: AliasEntry[] = [
  { id: "cmx", terms: ["cdmx", "ciudad de mexico", "distrito federal", "df", "mexico city"] },
  { id: "mex", terms: ["estado de mexico", "edomex", "mexico state", "toluca", "ecatepec", "naucalpan"] },
  { id: "jal", terms: ["guadalajara", "zapopan", "tlaquepaque", "tonala"] },
  { id: "nle", terms: ["monterrey", "san pedro garza", "san nicolas", "guadalupe nl"] },
  { id: "bcn", terms: ["tijuana", "mexicali", "ensenada", "baja california norte"] },
  { id: "bcs", terms: ["la paz bcs", "los cabos", "cabo san lucas", "baja california sur"] },
  { id: "sin", terms: ["culiacan", "mazatlan", "los mochis"] },
  { id: "son", terms: ["hermosillo", "ciudad obregon", "nogales"] },
  { id: "chh", terms: ["chihuahua city", "ciudad juarez", "juarez"] },
  { id: "coa", terms: ["saltillo", "torreon", "monclova"] },
  { id: "tam", terms: ["tampico", "reynosa", "matamoros", "nuevo laredo", "ciudad victoria"] },
  { id: "ver", terms: ["xalapa", "veracruz city", "veracruz puerto", "coatzacoalcos"] },
  { id: "pue", terms: ["puebla city", "tehuacan"] },
  { id: "que", terms: ["queretaro city", "santiago de queretaro"] },
  { id: "gua", terms: ["leon gto", "leon guanajuato", "celaya", "irapuato"] },
  { id: "yuc", terms: ["merida yuc", "merida yucatan"] },
  { id: "roo", terms: ["cancun", "playa del carmen", "tulum", "chetumal"] },
  { id: "cam", terms: ["campeche city", "ciudad del carmen"] },
  { id: "tab", terms: ["villahermosa"] },
  { id: "chp", terms: ["tuxtla", "san cristobal", "tapachula"] },
  { id: "oax", terms: ["oaxaca city", "oaxaca de juarez"] },
  { id: "mic", terms: ["morelia", "uruapan", "lazaro cardenas"] },
  { id: "gro", terms: ["acapulco", "chilpancingo", "zihuatanejo"] },
  { id: "mor", terms: ["cuernavaca"] },
  { id: "hid", terms: ["pachuca", "tulancingo"] },
  { id: "tla", terms: ["tlaxcala city"] },
  { id: "slp", terms: ["san luis potosi city"] },
  { id: "agu", terms: ["aguascalientes city"] },
  { id: "col", terms: ["colima city", "manzanillo"] },
  { id: "dur", terms: ["durango city"] },
  { id: "zac", terms: ["zacatecas city", "fresnillo"] },
  { id: "nay", terms: ["tepic", "puerto vallarta", "nuevo vallarta"] },
];

const ALIASES = ALIAS_ENTRIES;

const EXT_TERMS = [
  "usa",
  "estados unidos",
  "united states",
  "canada",
  "europa",
  "espana",
  "spain",
  "colombia",
  "argentina",
  "extranjero",
  "internacional",
  "foreign",
];

for (const estado of MEXICO_ESTADOS) {
  const entry = ALIASES.find((a) => a.id === estado.id);
  if (entry) {
    entry.terms.push(stripAccents(estado.nombre));
    if (estado.abrev) {
      entry.terms.push(stripAccents(estado.abrev));
    }
  }
}

export const mexicoEstadoNombre = (id: MexicoEstadoId): string => {
  if (id === "ext") return "Extranjero";
  if (id === "unk") return "Sin mapear";
  return ESTADO_BY_ID[id]?.nombre ?? id;
};

export const resolveOrigenEstado = (origen?: string | null): MexicoEstadoId => {
  const raw = origen?.trim();
  if (!raw) return "unk";

  const normalized = stripAccents(raw);

  if (EXT_TERMS.some((term) => normalized.includes(term))) {
    return "ext";
  }

  for (const entry of ALIASES) {
    for (const term of entry.terms) {
      if (normalized.includes(term)) {
        return entry.id;
      }
    }
  }

  return "unk";
};
