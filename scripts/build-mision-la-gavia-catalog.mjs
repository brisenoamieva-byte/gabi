/**
 * Genera catálogo + config simulador Misión La Gavia.
 *
 * Fuentes:
 *  - Simulador La Gavia (Precios, Listas, Descuentos, Depas)
 *  - Sembrado Control Gerencia (estatus comercial)
 *
 * Uso:
 *   node scripts/build-mision-la-gavia-catalog.mjs
 *   node scripts/build-mision-la-gavia-catalog.mjs [simulador.xlsx] [sembrado.xlsx]
 */
import fs from "fs";
import path from "path";
import {
  DEFAULT_SEMBRADO_XLSX,
  DEFAULT_SIMULADOR_XLSX,
  MISION_LA_GAVIA_CLUSTER_ID,
  parseEntregasMap,
  parsePreciosUnidades,
  parseSembradoMaps,
  parseSimuladorConfig,
  readWorkbook,
  sembradoToInventario,
} from "./mision-la-gavia-excel.mjs";

const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const simuladorPath = process.argv[2] ?? DEFAULT_SIMULADOR_XLSX;
const sembradoPath = process.argv[3] ?? DEFAULT_SEMBRADO_XLSX;

if (!fs.existsSync(simuladorPath)) {
  console.error("No se encontró simulador:", simuladorPath);
  process.exit(1);
}
if (!fs.existsSync(sembradoPath)) {
  console.error("No se encontró sembrado:", sembradoPath);
  process.exit(1);
}

const simWb = readWorkbook(simuladorPath);
const semWb = readWorkbook(sembradoPath);

const unidades = parsePreciosUnidades(simWb);
const sembradoByUnidad = parseSembradoMaps(semWb);
const entregasByUnidad = parseEntregasMap(simWb);
const simuladorConfig = parseSimuladorConfig(simWb, path.basename(simuladorPath));
simuladorConfig.sembradoSource = path.basename(sembradoPath);

const estatusCounts = {};
const modelosMap = new Map();

for (const u of unidades) {
  const sem = sembradoByUnidad.get(u.unidad);
  const estatusSembrado = sem?.estatus ?? "Disponibles";
  const estatus = sembradoToInventario(estatusSembrado);
  estatusCounts[estatus] = (estatusCounts[estatus] ?? 0) + 1;
  u.estatus = estatus;
  u.listaPrecios = sem?.listaPrecios ?? null;
  u.entregaIso = entregasByUnidad.get(u.unidad) ?? null;

  const key = u.modelo;
  const prev = modelosMap.get(key);
  if (!prev) {
    modelosMap.set(key, {
      modelo: u.modelo,
      recamaras: u.recamaras,
      m2TotalesMax: u.m2Totales,
      precioListaMin: u.precioLista,
      precioContadoMin: u.precioContado,
      count: 1,
    });
  } else {
    prev.count += 1;
    prev.m2TotalesMax = Math.max(prev.m2TotalesMax, u.m2Totales);
    prev.precioListaMin = Math.min(prev.precioListaMin, u.precioLista);
    prev.precioContadoMin = Math.min(prev.precioContadoMin, u.precioContado);
  }
}

const precioDesdeContado = Math.min(...unidades.map((u) => u.precioContado));
const precioDesdeLista = Math.min(...unidades.map((u) => u.precioLista));

const prototipos = [...modelosMap.values()].map((m) => {
  const slug = slugify(m.modelo);
  return {
    id: `${MISION_LA_GAVIA_CLUSTER_ID}-${slug}`,
    clusterId: MISION_LA_GAVIA_CLUSTER_ID,
    nombre: m.modelo,
    slug,
    construccionM2: Math.round(m.m2TotalesMax),
    niveles: 1,
    recamaras: m.recamaras,
    banos: m.recamaras >= 3 ? 2.5 : 2,
    precioBase: m.precioListaMin,
    bonoMaximo: m.precioListaMin - m.precioContadoMin,
    precioFinal: m.precioContadoMin,
    entrega: "Según calendario por torre",
    equipamientoIncluido: [],
    noIncluye: [],
    planos: [],
    fotos: [],
    activo: true,
    soldOut: false,
  };
});

const prototipoByModelo = new Map(prototipos.map((p) => [p.nombre, p.id]));

const disponibilidades = unidades.map((u, index) => {
  const entregaLabel = u.entregaIso
    ? new Date(`${u.entregaIso}T12:00:00`).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : undefined;

  return {
    id: `${MISION_LA_GAVIA_CLUSTER_ID}-${slugify(u.unidad)}`,
    clusterId: MISION_LA_GAVIA_CLUSTER_ID,
    unidad: u.unidad,
    tipo: "departamento",
    estatus: u.estatus,
    prototipoId: prototipoByModelo.get(u.modelo),
    precio: u.precioLista,
    superficieConstruccionM2: u.m2Totales,
    superficieInternaM2: u.m2Internos,
    superficieExternaM2: u.m2Externos,
    torre: u.edificio,
    entrega: entregaLabel,
    notas: [u.edificio, u.lado, u.listaPrecios].filter(Boolean).join(" · "),
    visitable: u.estatus === "disponible",
    prioridadComercial: u.estatus === "disponible" ? "alta" : "baja",
    razonesVenta: [u.modelo, `Torre ${u.edificio}`],
    orden: index + 1,
    x: 0,
    y: 0,
  };
});

const catalogSummary = {
  total: unidades.length,
  modelos: modelosMap.size,
  edificios: [...new Set(unidades.map((u) => u.edificio))].length,
  precioDesdeLista,
  precioDesdeContado,
  estatusCounts,
  entregaDesde: (() => {
    const fechas = unidades.map((u) => u.entregaIso).filter(Boolean).sort();
    return fechas[0] ?? null;
  })(),
};

const outCatalog = path.join(process.cwd(), "src/lib/catalog/mision-la-gavia.generated.ts");
const outConfig = path.join(
  process.cwd(),
  "src/lib/corredor/mision-la-gavia-simulador-config.generated.ts",
);
const outUnidades = path.join(
  process.cwd(),
  "src/lib/corredor/mision-la-gavia-unidades.generated.ts",
);

const unidadesMotor = unidades.map((u) => ({
  unidad: u.unidad,
  edificio: u.edificio,
  lado: u.lado,
  modelo: u.modelo,
  recamaras: u.recamaras,
  m2Internos: u.m2Internos,
  m2Externos: u.m2Externos,
  m2Totales: u.m2Totales,
  precioLista: u.precioLista,
  precioContado: u.precioContado,
  precio303040: u.precio303040,
  precio3070: u.precio3070,
  precio1585: u.precio1585,
  entregaIso: u.entregaIso,
  estatus: u.estatus,
}));

fs.writeFileSync(
  outCatalog,
  `// Generated by scripts/build-mision-la-gavia-catalog.mjs — do not edit by hand.
import type { DisponibilidadUnidad, Prototipo } from "@/lib/data";

export const misionLaGaviaCatalogSummary = ${JSON.stringify(catalogSummary, null, 2)} as const;

export const misionLaGaviaPrototipos: Prototipo[] = ${JSON.stringify(prototipos, null, 2)};

export const misionLaGaviaDisponibilidades: DisponibilidadUnidad[] = ${JSON.stringify(disponibilidades, null, 2)};
`,
);

fs.writeFileSync(
  outConfig,
  `// Generated by scripts/build-mision-la-gavia-catalog.mjs — do not edit by hand.

export const MISION_LA_GAVIA_SIMULADOR_CONFIG = ${JSON.stringify(simuladorConfig, null, 2)} as const;

export type MisionLaGaviaEsquemaId = (typeof MISION_LA_GAVIA_SIMULADOR_CONFIG.esquemasPago)[number]["id"];
`,
);

fs.writeFileSync(
  outUnidades,
  `// Generated by scripts/build-mision-la-gavia-catalog.mjs — do not edit by hand.

export const MISION_LA_GAVIA_UNIDADES = ${JSON.stringify(unidadesMotor, null, 2)} as const;

export type MisionLaGaviaUnidad = (typeof MISION_LA_GAVIA_UNIDADES)[number];
`,
);

console.log("Unidades:", unidades.length);
console.log("Modelos:", modelosMap.size);
console.log("Precio desde (contado):", precioDesdeContado);
console.log("Estatus:", estatusCounts);
console.log("Escrito:", outCatalog);
console.log("Escrito:", outConfig);
console.log("Escrito:", outUnidades);
