/**
 * Importa leads historicos de Prospectia (Pasaje Alamos) a prospectos GABI
 * para que reportes en /admin/metricas?tab=leads reflejen volumen y funnel.
 *
 * Uso:
 *   npm run leads:import:prospectia -- "C:/Users/brise/Downloads/Prospectia 13072026.xlsx"
 *   npm run leads:import:prospectia -- "...xlsx" --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

const DEFAULT_XLSX = "C:/Users/brise/Downloads/Prospectia 13072026.xlsx";
const DEFAULT_DESARROLLO = "pasaje-alamos";
const ASIGNADO_POR = "import-prospectia";

const ASESOR_NOMBRE_TO_ID = {
  "Nicolás Roitman": "nroitman",
  "Nicolas Roitman": "nroitman",
  "Coy de Caso": "cdecaso",
  "Esther Bonnin": "ebonin",
};

/** Asesores Prospectia que se preservan; el resto (Lili, Cross, etc.) → gerente. */
const GERENTE_ASESOR_ID = "nroitman";

const resolveAsesorId = (asesorNombre) => {
  const name = String(asesorNombre ?? "").trim();
  if (!name) return { id: GERENTE_ASESOR_ID, missing: false };
  if (ASESOR_NOMBRE_TO_ID[name]) return { id: ASESOR_NOMBRE_TO_ID[name], missing: false };
  return { id: GERENTE_ASESOR_ID, missing: true };
};

const isTruthy = (value) => {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "sí" || v === "si";
};

const normalizeNombre = (nombre) => {
  const value = String(nombre ?? "").trim();
  if (!value || value === "[Nombre por registrar]") return "Nombre por registrar";
  return value;
};

const normalizePhone = (telefono) => {
  const digits = String(telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return String(telefono ?? "").trim() || null;
  return digits.slice(-10);
};

const normalizeCiudad = (ciudad) => {
  const raw = String(ciudad ?? "").trim();
  if (!raw || raw === "-") return null;
  const cleaned = raw.replace(/\(QRO\)/i, "").replace(/\s+/g, " ").trim();
  const lower = cleaned.toLowerCase();
  if (["queretaro", "querétaro", "qro"].includes(lower)) return "Querétaro";
  if (["cdmx", "ciudad de mexico", "ciudad de méxico", "df"].includes(lower)) return "CDMX";
  return cleaned;
};

const normalizeOrigenCampana = (origen) => {
  const raw = String(origen ?? "").trim();
  if (!raw || raw === "-") return { nombre: "Sin origen", canal: null };
  const lower = raw.toLowerCase();
  if (lower.includes("facebook") || lower === "fb") return { nombre: "Facebook", canal: "Facebook" };
  if (lower.includes("instagram") || lower === "ig") return { nombre: "Instagram", canal: "Instagram" };
  if (lower.includes("tiktok")) return { nombre: "TikTok", canal: "TikTok" };
  if (lower.includes("página") || lower.includes("pagina") || lower.includes("sitio web") || lower === "web")
    return { nombre: "Página web", canal: "Web" };
  if (lower.includes("whatsapp")) return { nombre: "WhatsApp", canal: "WhatsApp" };
  if (lower.includes("inmobiliaria") || lower.includes("broker") || lower.includes("asesor externo"))
    return { nombre: "Broker / Inmobiliaria", canal: "Broker" };
  if (lower.includes("contacto directo")) return { nombre: "Contacto Directo", canal: "Contacto directo" };
  if (lower.includes("referid")) return { nombre: "Referidos", canal: "Referidos" };
  if (lower.includes("redes")) return { nombre: "Redes sociales", canal: "Redes" };
  if (lower.includes("base")) return { nombre: "Base de datos", canal: "Base datos" };
  return { nombre: raw, canal: raw };
};

const mapEtapa = ({ descartado, estatus, etiqueta }) => {
  if (descartado) return "perdido";
  const et = String(etiqueta ?? "").trim().toLowerCase();
  if (et.includes("apartado")) return "apartado";
  if (et.includes("no comprar") || et.includes("no comprará") || et.includes("no comprara")) return "perdido";
  const st = String(estatus ?? "").trim().toLowerCase();
  if (st === "cierre") return "vendido";
  if (st === "cita" || st === "visita") return "cita";
  if (st === "contacto" || st === "calificado" || st === "potencial") return "contactado";
  return "nuevo";
};

const mapCalificacion = ({ descartado, etiqueta, estatus }) => {
  if (descartado) return "Descartado / No le Interesa";
  const et = String(etiqueta ?? "").trim().toLowerCase();
  if (et.includes("apartado") || String(estatus ?? "").toLowerCase() === "cierre") return "Activo / Visita";
  if (et.includes("seguimiento") || et.includes("llamar")) return "Activo / En Segumiento";
  const st = String(estatus ?? "").toLowerCase();
  if (st === "cita" || st === "visita") return "Activo / Visita";
  if (st === "calificado" || st === "contacto") return "Activo / Interesado";
  return "Sin Calificar";
};

const mapNivelInteres = (etiqueta) => {
  const et = String(etiqueta ?? "").trim().toLowerCase();
  if (et.includes("apartado") || et.includes("seguimiento")) return "alto";
  if (et.includes("llamar")) return "bajo";
  if (et.includes("no comprar") || et.includes("no contesta")) return "sin_interes";
  return null;
};

const parseCreatedAt = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

/** Solo fechas reales de "Visitó desarrollo" (no true/false/-). */
const parseVisitDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw.toLowerCase() === "false" || raw.toLowerCase() === "true" || raw === "-") {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  let xlsxPath = DEFAULT_XLSX;
  let desarrolloId = DEFAULT_DESARROLLO;
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--desarrollo-id") {
      desarrolloId = args[index + 1] ?? DEFAULT_DESARROLLO;
      index += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (!arg.startsWith("--")) {
      xlsxPath = arg;
    }
  }
  return { xlsxPath: resolve(xlsxPath), desarrolloId, dryRun };
};

const upsertCampana = async (supabase, { desarrolloId, nombre, canal, dryRun, cache }) => {
  const cacheKey = `${desarrolloId}|${nombre}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (dryRun) {
    const fake = `dry-campana-${cache.size + 1}`;
    cache.set(cacheKey, fake);
    return fake;
  }
  const { data: existing } = await supabase
    .from("campanas")
    .select("id")
    .eq("desarrollo_id", desarrolloId)
    .eq("nombre", nombre)
    .maybeSingle();
  if (existing?.id) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }
  const tipo =
    (canal ?? "").toLowerCase().includes("contacto") ||
    (canal ?? "").toLowerCase().includes("broker") ||
    (canal ?? "").toLowerCase().includes("referid") ||
    (canal ?? "").toLowerCase().includes("base")
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
  if (error) throw new Error(`No se pudo crear campaña ${nombre}: ${error.message}`);
  cache.set(cacheKey, data.id);
  return data.id;
};

const main = async () => {
  loadEnvLocal();
  const { xlsxPath, desarrolloId, dryRun } = parseArgs();
  if (!existsSync(xlsxPath)) {
    console.error(`[prospectia] Archivo no encontrado: ${xlsxPath}`);
    process.exit(1);
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { error: schemaProbe } = await supabase.from("prospectos").select("xperience_id").limit(1);
  if (schemaProbe?.message?.includes("xperience_id") || schemaProbe?.code === "42703") {
    console.error("\n[prospectia] Falta aplicar 020_xperience_lead_fields.sql en Supabase.\n");
    process.exit(1);
  }
  const wb = XLSX.readFile(xlsxPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: false });
  const campanaCache = new Map();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let asesorAssigned = 0;
  let asesorMissing = 0;
  const unmappedAsesores = new Map();
  const etapaCounts = new Map();
  const campanaCounts = new Map();
  console.log(`[prospectia] ${dryRun ? "DRY-RUN · " : ""}${rows.length} filas → desarrollo ${desarrolloId}`);

  for (const row of rows) {
    const externalId = Number(row["ID lead"]);
    if (!Number.isFinite(externalId) || externalId <= 0) {
      skipped += 1;
      continue;
    }
    const descartado = isTruthy(row.Descartado);
    const estatus = row.Estatus;
    const etiqueta = row["Etiqueta de seguimiento"];
    const etapa = mapEtapa({ descartado, estatus, etiqueta });
    etapaCounts.set(etapa, (etapaCounts.get(etapa) ?? 0) + 1);
    const origen = normalizeOrigenCampana(row.Origen);
    campanaCounts.set(origen.nombre, (campanaCounts.get(origen.nombre) ?? 0) + 1);
    let campanaId;
    try {
      campanaId = await upsertCampana(supabase, {
        desarrolloId,
        nombre: origen.nombre,
        canal: origen.canal,
        dryRun,
        cache: campanaCache,
      });
    } catch (error) {
      console.error(`[prospectia] Campaña:`, error instanceof Error ? error.message : error);
      skipped += 1;
      continue;
    }
    const { id: asesorId, missing } = resolveAsesorId(row.Asesor);
    if (asesorId) asesorAssigned += 1;
    else if (missing) {
      asesorMissing += 1;
      const name = String(row.Asesor).trim();
      unmappedAsesores.set(name, (unmappedAsesores.get(name) ?? 0) + 1);
    }
    const tipoContacto = String(row["Tipo de contacto"] ?? "").trim() || null;
    const createdAt = parseCreatedAt(row["Fecha de creación"]);
    const visitaRealizadaOn = parseVisitDate(row["Visitó desarrollo"]);
    const calificacion = mapCalificacion({ descartado, etiqueta, estatus });
    const notasParts = [
      etiqueta ? `Etiqueta Prospectia: ${etiqueta}` : null,
      row["Motivo de descarte"] && String(row["Motivo de descarte"]).trim() !== "Sin motivo de descarte"
        ? `Motivo: ${row["Motivo de descarte"]}`
        : null,
      tipoContacto ? `Contacto: ${tipoContacto}` : null,
    ].filter(Boolean);

    const payload = {
      desarrollo_id: desarrolloId,
      xperience_id: externalId,
      producto_nombre: "Pasaje Álamos",
      nombre: normalizeNombre(row.Nombre),
      email: String(row.Correo ?? "").trim() || null,
      telefono: normalizePhone(row.Teléfono),
      origen_ciudad: normalizeCiudad(row.Ciudad),
      medio_contacto: tipoContacto,
      medio_publicitario: origen.canal || origen.nombre,
      notas: notasParts.join(" · ") || null,
      asesor_id: asesorId,
      promotor_nombre: String(row.Asesor ?? "").trim() || null,
      campana_id: dryRun ? null : campanaId,
      calificacion,
      nivel_interes: mapNivelInteres(etiqueta),
      iscore: Number.isFinite(Number(row.Afinidad)) ? Number(row.Afinidad) : null,
      seller_score: Number.isFinite(Number(row.Interés)) ? Number(row.Interés) : null,
      asignado_por: ASIGNADO_POR,
      bandera_correo: String(tipoContacto ?? "").toLowerCase().includes("correo") ? 1 : 0,
      bandera_llamada: String(tipoContacto ?? "").toLowerCase().includes("tel") ? 1 : 0,
      bandera_whatsapp: String(tipoContacto ?? "").toLowerCase().includes("whats") ? 1 : 0,
      bandera_crm: 0,
      es_spam: false,
      es_duplicado: false,
      etapa: visitaRealizadaOn && etapa !== "vendido" && etapa !== "apartado" && etapa !== "perdido"
        ? "cita"
        : etapa,
      visita_realizada_on: visitaRealizadaOn,
      activo: true,
      created_at: createdAt,
      updated_at: parseCreatedAt(row["Fecha de revisión"]) || createdAt,
    };

    if (dryRun) {
      created += 1;
      continue;
    }

    const { data: existing } = await supabase
      .from("prospectos")
      .select("id, etapa, asignado_por")
      .eq("xperience_id", externalId)
      .maybeSingle();

    if (existing?.id) {
      const updatePayload = { ...payload };
      delete updatePayload.created_at;
      if (existing.asignado_por !== ASIGNADO_POR) delete updatePayload.etapa;
      const { error } = await supabase.from("prospectos").update(updatePayload).eq("id", existing.id);
      if (error) {
        console.error(`[prospectia] Update ${externalId}:`, error.message);
        skipped += 1;
      } else updated += 1;
    } else {
      let twin = null;
      if (payload.telefono) {
        const { data } = await supabase
          .from("prospectos")
          .select("id, xperience_id")
          .eq("desarrollo_id", desarrolloId)
          .eq("activo", true)
          .eq("telefono", payload.telefono)
          .is("xperience_id", null)
          .limit(1)
          .maybeSingle();
        twin = data;
      }
      if (!twin && payload.email) {
        const { data } = await supabase
          .from("prospectos")
          .select("id, xperience_id")
          .eq("desarrollo_id", desarrolloId)
          .eq("activo", true)
          .ilike("email", payload.email)
          .is("xperience_id", null)
          .limit(1)
          .maybeSingle();
        twin = data;
      }
      if (twin?.id) {
        const updatePayload = { ...payload };
        delete updatePayload.created_at;
        delete updatePayload.etapa;
        const { error } = await supabase.from("prospectos").update(updatePayload).eq("id", twin.id);
        if (error) {
          console.error(`[prospectia] Merge twin ${externalId}:`, error.message);
          skipped += 1;
        } else updated += 1;
      } else {
        const { error } = await supabase.from("prospectos").insert(payload);
        if (error) {
          console.error(`[prospectia] Insert ${externalId}:`, error.message);
          skipped += 1;
        } else created += 1;
      }
    }
  }

  console.log("\n[prospectia] Resultado:");
  console.log({ created, updated, skipped, asesorAssigned, asesorMissing, dryRun });
  console.log("Etapas:", [...etapaCounts.entries()].sort((a, b) => b[1] - a[1]));
  console.log("Campañas/origen:", [...campanaCounts.entries()].sort((a, b) => b[1] - a[1]));
  if (unmappedAsesores.size) {
    console.log(
      "Asesores sin match en GABI (quedan en promotor_nombre):",
      [...unmappedAsesores.entries()].sort((a, b) => b[1] - a[1]),
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
