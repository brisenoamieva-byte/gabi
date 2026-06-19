import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const CATALOG_PATH = resolve(process.cwd(), "src/lib/comercial/xperience-catalog.json");

export const loadXperienceCatalog = () => {
  if (!existsSync(CATALOG_PATH)) {
    return {};
  }
  return JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const findAsesorByEmail = (asesores, email) => {
  const term = email.trim().toLowerCase();
  return asesores.find((item) => item.email?.trim().toLowerCase() === term);
};

const findVendedorEmail = (vendedor, catalog) => {
  const raw = String(vendedor ?? "").trim();
  if (!raw) {
    return null;
  }

  const map = catalog.vendedorToAsesorEmail ?? {};
  if (map[raw]) {
    return map[raw];
  }

  const normalized = normalizeText(raw);
  for (const [name, email] of Object.entries(map)) {
    if (normalizeText(name) === normalized) {
      return email;
    }
  }

  const partial = Object.entries(map).find(([name]) => {
    const nameNorm = normalizeText(name);
    return nameNorm.includes(normalized) || normalized.includes(nameNorm);
  });
  if (partial) {
    return partial[1];
  }

  if (isEmail(raw)) {
    return raw;
  }

  return null;
};

/**
 * Resuelve vendedor Xperience → asesor_id GABI.
 */
export const resolveXperienceAsesorId = (vendedor, asesores, options = {}) => {
  const { desarrolloId = null, catalog = loadXperienceCatalog() } = options;

  const email = findVendedorEmail(vendedor, catalog);
  if (email) {
    const byEmail = findAsesorByEmail(asesores, email);
    if (byEmail) {
      return byEmail.id;
    }
  }

  const term = normalizeText(vendedor);
  if (term) {
    const exact = asesores.find((item) => normalizeText(item.nombre) === term);
    if (exact) {
      return exact.id;
    }

    const firstToken = term.split(" ")[0];
    const partial = asesores.find((item) => normalizeText(item.nombre).includes(firstToken));
    if (partial) {
      return partial.id;
    }
  }

  if (desarrolloId && catalog.defaultAsesorIdByDesarrollo?.[desarrolloId]) {
    const defaultId = catalog.defaultAsesorIdByDesarrollo[desarrolloId];
    const exists = asesores.some((item) => item.id === defaultId);
    if (exists) {
      return defaultId;
    }
  }

  return null;
};

export const gabiAsesorIdFromEmail = (email) => {
  const local = email.split("@")[0]?.trim().toLowerCase();
  return local || null;
};
