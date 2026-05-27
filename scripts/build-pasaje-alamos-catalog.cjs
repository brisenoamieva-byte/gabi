const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const findFile = (dir, pattern) => {
  if (!fs.existsSync(dir)) return null;
  const re = new RegExp(pattern, "i");
  for (const name of fs.readdirSync(dir)) {
    if (re.test(name)) return path.join(dir, name);
  }
  return null;
};

const escritorio =
  "c:/Users/brise/OneDrive/Obsoletos/archivos/Escritorio9nov19/Escritorio2/Escritorio";
const deptosPath = findFile(escritorio, "^deptos\\.xlsx$");
const oficinasPath = findFile(escritorio, "Simulador oficinas 1may26");

const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const parseDeptoRow = (row) => {
  const modeloRaw = String(row[4] ?? "").trim();
  const modelo = modeloRaw ? `Modelo ${modeloRaw.toUpperCase()}` : "Sin modelo";
  const vista1 = typeof row[5] === "string" ? String(row[5]).trim() : "";
  const vista2 = typeof row[6] === "string" ? String(row[6]).trim() : "";
  const m2Internos = Number(row[7] ?? 0);
  const m2Externos = Number(row[8] ?? 0);
  const m2Bodega = Number(row[9] ?? 0);
  const m2Totales = Number(row[10] ?? m2Internos + m2Externos);
  const recamaras = Number(row[11] ?? 0);
  const cajones = Number(row[12] ?? 0);
  const precioLista = Math.round(Number(row[14] ?? 0));
  const precioContado = Math.round(Number(row[15] ?? precioLista));

  return {
    modelo,
    modeloRaw,
    vista1,
    vista2,
    m2Internos,
    m2Externos,
    m2Bodega,
    m2Totales,
    recamaras,
    cajones,
    precioLista,
    precioContado,
  };
};

const parseOficinaRow = (row) => {
  const vista1 = typeof row[5] === "string" ? String(row[5]).trim() : "";
  const vista2 = typeof row[6] === "string" ? String(row[6]).trim() : "";
  const m2Internos = Number(row[7] ?? row[4] ?? 0);
  const m2Externos = Number(row[8] ?? 0);
  const m2Bodega = Number(row[9] ?? 0);
  const m2Totales = Number(row[10] ?? m2Internos + m2Externos);
  const cajones = Number(row[11] ?? 0);
  const precioLista = Math.round(Number(row[12] ?? 0));
  const precioContado = Math.round(Number(row[13] ?? precioLista));
  const typology = vista1 || "Álamos";
  const modelo = `${typology} · ${Math.round(m2Totales)} m²`;

  return {
    modelo,
    vista1,
    vista2,
    m2Internos,
    m2Externos,
    m2Bodega,
    m2Totales,
    cajones,
    precioLista,
    precioContado,
  };
};

const parseStatus = (row) => {
  const primary = String(row[3] ?? "").trim();
  if (/vendido/i.test(primary)) return "vendido";
  if (/apartado|aparta/i.test(primary)) return "apartado";
  return "disponible";
};

const readListaSheet = (filePath, kind) => {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets.Lista ?? wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerIndex = rows.findIndex(
    (row) => row[0] === "Unidad" && String(row[4] ?? "").toLowerCase().includes("status") === false && row[4] === "Status",
  );
  const start = headerIndex >= 0 ? headerIndex + 1 : 4;
  const units = [];

  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i];
    const id = String(row[0] ?? "").trim();
    if (!id || !id.includes("-")) continue;

    const numero = String(row[1] ?? "").trim();
    const nivel = Number(row[2] ?? 0);
    const estatus = parseStatus(row);

    if (kind === "departamento") {
      const parsed = parseDeptoRow(row);
      if (!parsed.precioLista) continue;

      units.push({
        id: slugify(id),
        unidad: numero,
        nivel,
        estatus,
        ...parsed,
        tipo: "departamento",
      });
      continue;
    }

    const parsed = parseOficinaRow(row);
    if (!parsed.precioLista) continue;

    units.push({
      id: slugify(id),
      unidad: numero,
      nivel,
      estatus,
      ...parsed,
      tipo: "oficina",
    });
  }

  return units;
};

const buildPrototipos = (units, clusterId, kind) => {
  const byModel = new Map();

  for (const unit of units) {
    const key = unit.modelo;
    const current = byModel.get(key) ?? {
      modelo: key,
      modeloRaw: unit.modeloRaw ?? "",
      count: 0,
      minPrecio: Infinity,
      maxPrecio: 0,
      minM2: Infinity,
      maxM2: 0,
      recamaras: unit.recamaras ?? 0,
    };
    current.count += 1;
    current.minPrecio = Math.min(current.minPrecio, unit.precioLista);
    current.maxPrecio = Math.max(current.maxPrecio, unit.precioLista);
    current.minM2 = Math.min(current.minM2, unit.m2Totales || unit.m2Internos);
    current.maxM2 = Math.max(current.maxM2, unit.m2Totales || unit.m2Internos);
    if (unit.recamaras) current.recamaras = unit.recamaras;
    byModel.set(key, current);
  }

  const naturalKey = (raw) => {
    const value = String(raw ?? "").trim();
    const match = value.match(/^(\d+)([a-z]*)/i);
    if (!match) return [Number.MAX_SAFE_INTEGER, value.toLowerCase()];
    return [Number(match[1]), match[2].toLowerCase()];
  };

  return Array.from(byModel.values())
    .sort((a, b) => {
      const [aNum, aSuffix] = naturalKey(a.modeloRaw || a.modelo);
      const [bNum, bSuffix] = naturalKey(b.modeloRaw || b.modelo);
      if (aNum !== bNum) return aNum - bNum;
      if (aSuffix !== bSuffix) return aSuffix.localeCompare(bSuffix);
      return a.minPrecio - b.minPrecio;
    })
    .map((item) => {
      const id = `${clusterId}-${slugify(item.modelo)}`;
      const avgM2 = Math.round((item.minM2 + item.maxM2) / 2);
      const precioBase = item.minPrecio;
      const bonoMaximo = Math.max(0, item.maxPrecio - item.minPrecio);
      return {
        id,
        clusterId,
        nombre: item.modelo,
        slug: slugify(item.modelo),
        construccionM2: avgM2,
        niveles: 1,
        recamaras: kind === "departamento" ? item.recamaras || 2 : 0,
        banos: kind === "departamento" ? (item.recamaras >= 3 ? 2.5 : 2) : 1,
        precioBase,
        bonoMaximo,
        precioFinal: precioBase,
        entrega: "Por confirmar",
        equipamientoIncluido: [],
        noIncluye: [],
        planos: [],
        fotos: [],
        activo: true,
        soldOut: false,
      };
    });
};

const buildDisponibilidades = (units, clusterId, prototipos) => {
  const protoByName = new Map(prototipos.map((p) => [p.nombre, p.id]));

  return units.map((unit, index) => ({
    id: `${clusterId}-${unit.id}`,
    clusterId,
    unidad: unit.unidad,
    tipo: unit.tipo,
    estatus: unit.estatus,
    prototipoId: protoByName.get(unit.modelo),
    precio: unit.precioLista,
    superficieConstruccionM2: unit.m2Totales || unit.m2Internos,
    superficieInternaM2: unit.m2Internos || undefined,
    superficieExternaM2: unit.m2Externos || undefined,
    superficieBodegaM2: unit.m2Bodega || undefined,
    cajones: unit.cajones || undefined,
    nivel: String(unit.nivel),
    nivelOrden: unit.nivel,
    notas: [unit.vista1, unit.vista2].filter(Boolean).join(" · "),
    visitable: unit.estatus === "disponible",
    prioridadComercial: unit.estatus === "disponible" ? "alta" : "baja",
    razonesVenta: [unit.vista1, unit.vista2].filter(Boolean).map((v) => `Vista ${v}`),
    orden: index + 1,
    x: 0,
    y: 0,
  }));
};

const deptos = readListaSheet(deptosPath, "departamento");
const oficinas = readListaSheet(oficinasPath, "oficina");

const deptosPrototipos = buildPrototipos(deptos, "pasaje-alamos-departamentos", "departamento");
const oficinasPrototipos = buildPrototipos(oficinas, "pasaje-alamos-oficinas", "oficina");

const deptosDisponibilidades = buildDisponibilidades(
  deptos,
  "pasaje-alamos-departamentos",
  deptosPrototipos,
);
const oficinasDisponibilidades = buildDisponibilidades(
  oficinas,
  "pasaje-alamos-oficinas",
  oficinasPrototipos,
);

const summary = {
  deptos: {
    total: deptos.length,
    disponibles: deptos.filter((u) => u.estatus === "disponible").length,
    vendidos: deptos.filter((u) => u.estatus === "vendido").length,
    apartados: deptos.filter((u) => u.estatus === "apartado").length,
    modelos: deptosPrototipos.length,
    precioMin: Math.min(...deptos.map((u) => u.precioLista)),
    precioMax: Math.max(...deptos.map((u) => u.precioLista)),
  },
  oficinas: {
    total: oficinas.length,
    disponibles: oficinas.filter((u) => u.estatus === "disponible").length,
    vendidos: oficinas.filter((u) => u.estatus === "vendido").length,
    apartados: oficinas.filter((u) => u.estatus === "apartado").length,
    modelos: oficinasPrototipos.length,
    precioMin: Math.min(...oficinas.filter((u) => u.precioLista).map((u) => u.precioLista)),
    precioMax: Math.max(...oficinas.map((u) => u.precioLista)),
  },
};

const output = {
  summary,
  prototipos: [...deptosPrototipos, ...oficinasPrototipos],
  disponibilidades: [...deptosDisponibilidades, ...oficinasDisponibilidades],
};

const jsonPath = path.join(__dirname, "pasaje-alamos-catalog.json");
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf8");

const tsPath = path.join(__dirname, "..", "src", "lib", "catalog", "pasaje-alamos.generated.ts");
const ts = `// Generated by scripts/build-pasaje-alamos-catalog.cjs — do not edit by hand.
import type { DisponibilidadUnidad, Prototipo } from "@/lib/data";

export const pasajeAlamosCatalogSummary = ${JSON.stringify(summary, null, 2)} as const;

export const pasajeAlamosPrototipos: Prototipo[] = ${JSON.stringify(output.prototipos, null, 2)};

export const pasajeAlamosDisponibilidades: DisponibilidadUnidad[] = ${JSON.stringify(output.disponibilidades, null, 2)};
`;

fs.writeFileSync(tsPath, ts, "utf8");

console.log(JSON.stringify(summary, null, 2));
console.log("Wrote", jsonPath);
console.log("Wrote", tsPath);
