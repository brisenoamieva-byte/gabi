/**
 * Backfill visita_realizada_on desde Excel Prospectia (columna "Visitó desarrollo").
 * Solo filas con fecha real. Upsert por xperience_id = ID lead.
 *
 *   node scripts/backfill-prospectia-visitas.mjs "C:/Users/brise/Downloads/Prospectia 13072026.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

const DEFAULT_XLSX = "C:/Users/brise/Downloads/Prospectia 13072026.xlsx";

const parseVisitDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw.toLowerCase() === "false" || raw.toLowerCase() === "true" || raw === "-") {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const main = async () => {
  loadEnvLocal();
  const xlsxPath = resolve(process.argv[2] ?? DEFAULT_XLSX);
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

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const row of rows) {
    const externalId = Number(row["ID lead"]);
    const visita = parseVisitDate(row["Visitó desarrollo"]);
    if (!Number.isFinite(externalId) || !visita) {
      skipped += 1;
      continue;
    }

    const { data, error } = await supabase
      .from("prospectos")
      .update({
        visita_realizada_on: visita,
        updated_at: new Date().toISOString(),
      })
      .eq("xperience_id", externalId)
      .eq("desarrollo_id", "pasaje-alamos")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(externalId, error.message);
      skipped += 1;
      continue;
    }
    if (!data?.id) {
      missing += 1;
      continue;
    }
    updated += 1;
  }

  console.log({ updated, skipped, missing, total: rows.length });
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
