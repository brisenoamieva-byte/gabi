/**
 * Asigna asesor_id de Prospectia (columna Asesor) a prospectos PA.
 * Coy de Caso → cdecaso, Esther Bonnin → ebonin, Nicolás Roitman → nroitman.
 * Cualquier otro nombre → nroitman (gerente) para reasignación.
 *
 *   npm run leads:assign:prospectia-asesores -- "C:/Users/brise/Downloads/Prospectia 13072026.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

const DEFAULT_XLSX = "C:/Users/brise/Downloads/Prospectia 13072026.xlsx";
const DESARROLLO_ID = "pasaje-alamos";
const GERENTE_ID = "nroitman";
const CHUNK = 80;

const KEEP_ASIGNACION = {
  "Coy de Caso": "cdecaso",
  "Esther Bonnin": "ebonin",
  "Nicolás Roitman": "nroitman",
  "Nicolas Roitman": "nroitman",
};

const resolveAsesorId = (asesorNombre) => {
  const name = String(asesorNombre ?? "").trim();
  if (!name) return GERENTE_ID;
  return KEEP_ASIGNACION[name] ?? GERENTE_ID;
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const main = async () => {
  loadEnvLocal();
  const dryRun = process.argv.includes("--dry-run");
  const xlsxArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const xlsxPath = resolve(xlsxArg ?? DEFAULT_XLSX);
  if (!existsSync(xlsxPath)) {
    console.error("No file:", xlsxPath);
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const wb = XLSX.readFile(xlsxPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: null,
    raw: false,
  });

  /** @type {Map<string, Array<{ xperienceId: number, promotor: string | null }>>} */
  const groups = new Map();
  const origenCounts = new Map();
  let skipped = 0;

  for (const row of rows) {
    const externalId = Number(row["ID lead"]);
    const origenNombre = String(row.Asesor ?? "").trim() || null;
    if (!Number.isFinite(externalId) || externalId <= 0) {
      skipped += 1;
      continue;
    }
    const asesorId = resolveAsesorId(origenNombre);
    origenCounts.set(origenNombre ?? "(vacío)", (origenCounts.get(origenNombre ?? "(vacío)") ?? 0) + 1);
    if (!groups.has(asesorId)) groups.set(asesorId, []);
    groups.get(asesorId).push({ xperienceId: externalId, promotor: origenNombre });
  }

  let updated = 0;
  let errors = 0;

  for (const [asesorId, items] of groups) {
    console.log(`[assign] ${asesorId}: ${items.length} leads`);
    if (dryRun) {
      updated += items.length;
      continue;
    }

    // Same asesor_id; promotor_nombre may differ — update in small chunks by id list,
    // setting promotor from Excel in a second pass per unique promotor.
    const byPromotor = new Map();
    for (const item of items) {
      const key = item.promotor ?? "";
      if (!byPromotor.has(key)) byPromotor.set(key, []);
      byPromotor.get(key).push(item.xperienceId);
    }

    for (const [promotor, ids] of byPromotor) {
      for (const idChunk of chunk(ids, CHUNK)) {
        const { data, error } = await supabase
          .from("prospectos")
          .update({
            asesor_id: asesorId,
            promotor_nombre: promotor || null,
            updated_at: new Date().toISOString(),
          })
          .in("xperience_id", idChunk)
          .eq("desarrollo_id", DESARROLLO_ID)
          .select("id");

        if (error) {
          console.error(asesorId, promotor, error.message);
          errors += 1;
          continue;
        }
        updated += data?.length ?? 0;
      }
    }
  }

  console.log({
    dryRun,
    updated,
    skipped,
    errors,
    totalExcel: rows.length,
    porOrigenExcel: Object.fromEntries([...origenCounts.entries()].sort((a, b) => b[1] - a[1])),
    porAsesorGabi: Object.fromEntries(
      [...groups.entries()].map(([id, list]) => [id, list.length]),
    ),
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
