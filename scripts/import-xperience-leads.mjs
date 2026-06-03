/**
 * Importa leads desde export Excel de Xperience/Investti.
 *
 * IMPORTANTE: cada fila trae un "Producto" (desarrollo en Xperience). Solo importa
 * filas cuyo producto esté mapeado a un desarrollo_id de GABI. No mezcla datos
 * de otros desarrolladores (ej. Grupo Investti) con Pasaje/La Vista por defecto.
 *
 * Uso (cuando tengas export de TUS desarrollos en GABI):
 *   npm run leads:import:xperience -- "C:/ruta/leads.xlsx" --map "{\"Pasaje Álamos\":\"pasaje-alamos\"}"
 *
 * Fallback explícito (todas las filas a un solo desarrollo — usar con cuidado):
 *   npm run leads:import:xperience -- "leads.xlsx" --desarrollo-id pasaje-alamos --allow-unmapped-fallback
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

const DEFAULT_XLSX = "C:/Users/brise/Downloads/leads_xperience.xlsx";

const calificacionEsSpam = (calificacion) =>
  String(calificacion ?? "")
    .trim()
    .toLowerCase()
    .startsWith("descartado");

const normalizeNombre = (nombre) => {
  const value = String(nombre ?? "").trim();
  if (!value || value === "[Nombre por registrar]") {
    return "Nombre por registrar";
  }
  return value;
};

const normalizePhone = (telefono) => {
  const value = String(telefono ?? "").trim();
  return value || null;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  let xlsxPath = DEFAULT_XLSX;
  let desarrolloId = null;
  let productoMap = {};
  let allowUnmappedFallback = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--desarrollo-id") {
      desarrolloId = args[index + 1] ?? null;
      index += 1;
    } else if (arg === "--map") {
      productoMap = JSON.parse(args[index + 1] ?? "{}");
      index += 1;
    } else if (arg === "--allow-unmapped-fallback") {
      allowUnmappedFallback = true;
    } else if (!arg.startsWith("--")) {
      xlsxPath = arg;
    }
  }

  return { xlsxPath: resolve(xlsxPath), desarrolloId, productoMap, allowUnmappedFallback };
};

const resolveDesarrolloId = (producto, fallbackId, productoMap, allowUnmappedFallback) => {
  if (productoMap[producto]) {
    return productoMap[producto];
  }
  if (allowUnmappedFallback && fallbackId) {
    return fallbackId;
  }
  return null;
};

const findAsesorId = (vendedor, asesores) => {
  const term = String(vendedor ?? "")
    .trim()
    .toLowerCase();
  if (!term) {
    return null;
  }
  const exact = asesores.find((item) => item.nombre.trim().toLowerCase() === term);
  if (exact) {
    return exact.id;
  }
  const partial = asesores.find((item) => item.nombre.trim().toLowerCase().includes(term.split(" ")[0]));
  return partial?.id ?? null;
};

const upsertCampana = async (supabase, { desarrolloId, nombre, canal }) => {
  const { data: existing } = await supabase
    .from("campanas")
    .select("id")
    .eq("desarrollo_id", desarrolloId)
    .eq("nombre", nombre)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const tipo =
    (canal ?? "").toLowerCase().includes("inmobiliaria") ||
    (canal ?? "").toLowerCase().includes("teléfono") ||
    (canal ?? "").toLowerCase().includes("contactos directos")
      ? "offline"
      : "online";

  const { data, error } = await supabase
    .from("campanas")
    .insert({
      desarrollo_id: desarrolloId,
      nombre,
      canal: canal || null,
      tipo,
      activo: true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo crear campaña ${nombre}: ${error.message}`);
  }

  return data.id;
};

const main = async () => {
  loadEnvLocal();
  const { xlsxPath, desarrolloId, productoMap, allowUnmappedFallback } = parseArgs();

  if (!Object.keys(productoMap).length && !allowUnmappedFallback) {
    console.error(
      "[xperience] Indica --map con producto→desarrollo_id de GABI, o --allow-unmapped-fallback con --desarrollo-id.",
    );
    console.error(
      "  Ejemplo: --map '{\"Pasaje Álamos\":\"pasaje-alamos\",\"La Vista Residencial\":\"la-vista-residencial\"}'",
    );
    process.exit(1);
  }

  if (!existsSync(xlsxPath)) {
    console.error(`[xperience] Archivo no encontrado: ${xlsxPath}`);
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { error: schemaProbe } = await supabase.from("prospectos").select("xperience_id").limit(1);
  if (schemaProbe?.message?.includes("xperience_id") || schemaProbe?.code === "42703") {
    console.error("\n[xperience] Falta aplicar 020_xperience_lead_fields.sql en Supabase.\n");
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Data ?? wb.Sheets[wb.SheetNames[0]]);

  const { data: asesores } = await supabase.from("asesores").select("id, nombre");
  const campanaCache = new Map();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const unmappedProductos = new Set();

  for (const row of rows) {
    const xperienceId = Number(row.id);
    if (!xperienceId) {
      skipped += 1;
      continue;
    }

    const producto = String(row.Producto ?? "").trim();
    const targetDesarrolloId = resolveDesarrolloId(
      producto,
      desarrolloId,
      productoMap,
      allowUnmappedFallback,
    );

    if (!targetDesarrolloId) {
      unmappedProductos.add(producto || "(sin producto)");
      skipped += 1;
      continue;
    }
    const campanaNombre = String(row.Campaña ?? "Sin campaña").trim();
    const canal = String(row.Canal ?? "").trim() || null;
    const cacheKey = `${targetDesarrolloId}|${campanaNombre}`;

    let campanaId = campanaCache.get(cacheKey);
    if (!campanaId) {
      campanaId = await upsertCampana(supabase, {
        desarrolloId: targetDesarrolloId,
        nombre: campanaNombre,
        canal,
      });
      campanaCache.set(cacheKey, campanaId);
    }

    const calificacion = String(row.Calificación ?? "Sin Calificar").trim();
    const esSpam = calificacionEsSpam(calificacion);
    const esDuplicado = String(row["Asignado Por"] ?? "").includes("Duplicado");
    const createdAt = `${row.Fecha}T${row.Hora ?? "12:00:00"}`;

    const payload = {
      desarrollo_id: targetDesarrolloId,
      xperience_id: xperienceId,
      producto_nombre: producto || null,
      nombre: normalizeNombre(row.Nombre),
      email: String(row.Correo ?? "").trim() || null,
      telefono: normalizePhone(row.Teléfono),
      notas: String(row.Comentarios ?? "").trim() || null,
      asesor_id: findAsesorId(row.Vendedor, asesores ?? []),
      campana_id: campanaId,
      calificacion,
      iscore: Number.isFinite(Number(row.iScore)) ? Number(row.iScore) : null,
      seller_score: Number.isFinite(Number(row.sellerScore)) ? Number(row.sellerScore) : null,
      asignado_por: String(row["Asignado Por"] ?? "").trim() || null,
      bandera_correo: Number(row["Bandera Correo"] ?? 0),
      bandera_llamada: Number(row["Bandera Llamada"] ?? 0),
      bandera_whatsapp: Number(row["Bandera Whatsapp"] ?? 0),
      bandera_crm: Number(row["Bandera CRM"] ?? 0),
      es_spam: esSpam,
      es_duplicado: esDuplicado,
      adryo_url: String(row["ver lead en Adryo"] ?? "").trim() || null,
      etapa: esSpam ? "perdido" : "nuevo",
      activo: true,
      created_at: createdAt,
      updated_at: createdAt,
    };

    const { data: existing } = await supabase
      .from("prospectos")
      .select("id")
      .eq("xperience_id", xperienceId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("prospectos").update(payload).eq("id", existing.id);
      if (error) {
        console.error(`[xperience] Error actualizando ${xperienceId}:`, error.message);
        skipped += 1;
      } else {
        updated += 1;
      }
    } else {
      const { error } = await supabase.from("prospectos").insert(payload);
      if (error) {
        console.error(`[xperience] Error insertando ${xperienceId}:`, error.message);
        skipped += 1;
      } else {
        created += 1;
      }
    }
  }

  console.log("\n[xperience] Importación completada:");
  console.log(`  Creados:      ${created}`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  Omitidos:     ${skipped}`);
  console.log(`  Campañas:     ${campanaCache.size}`);
  if (unmappedProductos.size) {
    console.log("\n  Productos sin mapeo a GABI (no importados):");
    for (const name of [...unmappedProductos].sort()) {
      console.log(`    - ${name}`);
    }
  }
};

main().catch((error) => {
  console.error("[xperience] Error fatal:", error);
  process.exit(1);
});
