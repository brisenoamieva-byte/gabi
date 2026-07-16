/**
 * Importa inmobiliarias / asesores externos desde el Excel de
 * «Registro para Firma de Convenio BBR» → tabla partners (Alianzas).
 *
 * Uso:
 *   node scripts/import-partners-convenio-bbr.mjs --dry-run
 *   node scripts/import-partners-convenio-bbr.mjs
 *   node scripts/import-partners-convenio-bbr.mjs --file "C:/ruta/archivo.xlsx"
 *   node scripts/import-partners-convenio-bbr.mjs --solo-firmados
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { loadEnvLocal } from "./load-env-local.mjs";

const DEFAULT_XLSX =
  "C:/Users/brise/Downloads/Registro para Firma de Convenio BBR - Inmobiliaria (respuestas) (7).xlsx";
const COMERCIALIZADORA_ID = "bbr";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const soloFirmados = args.includes("--solo-firmados");
const fileFlag = args.findIndex((a) => a === "--file");
const filePath =
  fileFlag >= 0 && args[fileFlag + 1]
    ? resolve(args[fileFlag + 1])
    : DEFAULT_XLSX;

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");

const clean = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const normalizePhone = (telefono) => {
  const digits = String(telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) {
    return clean(telefono);
  }
  return digits.slice(-10);
};

const normalizeEmail = (correo) => {
  const value = String(correo ?? "").trim().toLowerCase();
  if (!value || !value.includes("@")) {
    return null;
  }
  return value;
};

const findCol = (row, matcher) => {
  const key = Object.keys(row).find((k) => matcher(normalizeText(k.replace(/\r?\n/g, " "))));
  return key ? row[key] : "";
};

const isAsesorIndependiente = (nombreComercial) => {
  const value = normalizeText(nombreComercial);
  return value === "asesor independiente" || value.startsWith("asesor independiente");
};

const buildNotas = (row) => {
  const parts = [];
  const clave = clean(findCol(row, (k) => k.includes("clave de convenio")));
  const razon = clean(findCol(row, (k) => k.includes("razon social")));
  const rfc = clean(findCol(row, (k) => k.includes("rfc")));
  const firmante = clean(
    findCol(row, (k) => k.includes("quien firmara") || k.includes("nombre completo de quien")),
  );
  const direccion = clean(findCol(row, (k) => k.includes("direccion")));
  const web = clean(findCol(row, (k) => k.includes("pagina web")));
  const asociacion = clean(findCol(row, (k) => k.includes("asociacion")));
  const asesores = clean(findCol(row, (k) => k.includes("numero de asesores")));
  const zona = clean(findCol(row, (k) => k.includes("zona de queretaro")));
  const previo = clean(findCol(row, (k) => k.includes("firmado convenio")));
  const ciudad = clean(findCol(row, (k) => k.includes("ciudad de residencia")));
  const estatus = clean(row.Estatus);

  if (clave) parts.push(`Clave convenio: ${clave}`);
  if (estatus) parts.push(`Estatus: ${estatus}`);
  if (razon) parts.push(`Razón social: ${razon}`);
  if (rfc) parts.push(`RFC: ${rfc}`);
  if (firmante) parts.push(`Firmante: ${firmante}`);
  if (direccion) parts.push(`Dirección: ${direccion}`);
  if (web) parts.push(`Web: ${web}`);
  if (asociacion) parts.push(`Asociación: ${asociacion}`);
  if (asesores) parts.push(`Asesores: ${asesores}`);
  if (zona) parts.push(`Zona: ${zona}`);
  if (previo) parts.push(`Convenio previo BBR: ${previo}`);
  if (ciudad) parts.push(`Ciudad: ${ciudad}`);
  parts.push("Origen: import convenio BBR");
  return parts.join("\n");
};

const mapRow = (row) => {
  const nombreComercial = clean(
    findCol(row, (k) => k.includes("nombre comercial de la inmobiliaria")),
  );
  const razon = clean(findCol(row, (k) => k.includes("razon social")));
  const firmante = clean(
    findCol(row, (k) => k.includes("quien firmara") || k.includes("nombre completo de quien")),
  );
  const contacto = clean(findCol(row, (k) => k.includes("asesor de contacto")));
  const telefono = normalizePhone(findCol(row, (k) => k.includes("telefono")));
  const email = normalizeEmail(findCol(row, (k) => k.includes("correo")));
  const estatus = normalizeText(row.Estatus);
  const clave = clean(findCol(row, (k) => k.includes("clave de convenio")));

  if (!nombreComercial && !razon && !firmante) {
    return null;
  }

  const asesorIndep = isAsesorIndependiente(nombreComercial ?? "");
  const tipo = asesorIndep ? "asesor_externo" : "inmobiliaria";
  const nombre = asesorIndep
    ? razon || firmante || contacto || nombreComercial
    : nombreComercial || razon || firmante;

  if (!nombre) {
    return null;
  }

  return {
    comercializadora_id: COMERCIALIZADORA_ID,
    tipo,
    nombre: nombre.trim(),
    contacto_nombre: contacto,
    telefono,
    email,
    notas: buildNotas(row),
    activo: true,
    _estatus: estatus,
    _clave: clave,
    _nombreKey: normalizeText(nombre),
  };
};

const main = async () => {
  loadEnvLocal();

  if (!existsSync(filePath)) {
    console.error(`No se encontró el Excel: ${filePath}`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const excelRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  console.log(`Excel: ${excelRows.length} filas · comercializadora=${COMERCIALIZADORA_ID}`);

  /** @type {Map<string, ReturnType<typeof mapRow>>} */
  const byName = new Map();
  let skippedEmpty = 0;
  let skippedNoFirmado = 0;

  for (const row of excelRows) {
    const mapped = mapRow(row);
    if (!mapped) {
      skippedEmpty += 1;
      continue;
    }
    if (soloFirmados && mapped._estatus !== "firmado") {
      skippedNoFirmado += 1;
      continue;
    }

    const existing = byName.get(mapped._nombreKey);
    if (!existing) {
      byName.set(mapped._nombreKey, mapped);
      continue;
    }
    // Preferir fila firmada / con clave de convenio más reciente (última gana si misma calidad)
    const preferNew =
      (mapped._estatus === "firmado" && existing._estatus !== "firmado") ||
      (mapped._estatus === existing._estatus && Boolean(mapped._clave));
    if (preferNew) {
      byName.set(mapped._nombreKey, mapped);
    }
  }

  const payload = Array.from(byName.values());
  console.log(
    `Únicos a sincronizar: ${payload.length} (vacíos: ${skippedEmpty}, no firmados omitidos: ${skippedNoFirmado})`,
  );
  console.log(
    `  inmobiliaria: ${payload.filter((p) => p.tipo === "inmobiliaria").length} · asesor_externo: ${payload.filter((p) => p.tipo === "asesor_externo").length}`,
  );

  if (dryRun) {
    console.log("\n--dry-run · primeras 12:");
    for (const row of payload.slice(0, 12)) {
      console.log(
        `  [${row.tipo}] ${row.nombre} · ${row.contacto_nombre ?? "—"} · ${row.telefono ?? "—"} · ${row.email ?? "—"}`,
      );
    }
    console.log("\nSin cambios en Supabase.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: listError } = await supabase
    .from("partners")
    .select("id, nombre, tipo, contacto_nombre, telefono, email, activo")
    .eq("comercializadora_id", COMERCIALIZADORA_ID);

  if (listError) {
    console.error("Error al listar partners:", listError.message);
    process.exit(1);
  }

  /** @type {Map<string, { id: string; nombre: string }>} */
  const existingByName = new Map();
  for (const row of existing ?? []) {
    existingByName.set(normalizeText(row.nombre), {
      id: row.id,
      nombre: row.nombre,
    });
  }

  let created = 0;
  let updated = 0;
  let errors = 0;
  const now = new Date().toISOString();

  for (const row of payload) {
    const body = {
      comercializadora_id: row.comercializadora_id,
      tipo: row.tipo,
      nombre: row.nombre,
      contacto_nombre: row.contacto_nombre,
      telefono: row.telefono,
      email: row.email,
      notas: row.notas,
      activo: row.activo,
      updated_at: now,
    };

    const prev = existingByName.get(row._nombreKey);
    if (prev) {
      const { error } = await supabase.from("partners").update(body).eq("id", prev.id);
      if (error) {
        console.error(`UPDATE ${row.nombre}:`, error.message);
        errors += 1;
      } else {
        updated += 1;
      }
    } else {
      const { error } = await supabase.from("partners").insert({
        ...body,
        created_at: now,
      });
      if (error) {
        console.error(`CREATE ${row.nombre}:`, error.message);
        errors += 1;
      } else {
        created += 1;
      }
    }
  }

  console.log(`\nListo. creados=${created} actualizados=${updated} errores=${errors}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
