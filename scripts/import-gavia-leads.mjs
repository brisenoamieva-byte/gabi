/**
 * Importa histórico de leads Xperience de Misión La Gavia → prospectos GABI
 * (CRM + afluencia/medios/citas en reportes).
 *
 * Uso:
 *   npm run leads:import:gavia
 *   npm run leads:import:gavia -- "C:/Users/brise/Downloads/Histórico Leads La Gavia 2026.xlsx"
 *   npm run leads:import:gavia -- --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { loadEnvLocal } from "./load-env-local.mjs";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "./mision-la-gavia-excel.mjs";

const DEFAULT_XLSX = "C:/Users/brise/Downloads/Histórico Leads La Gavia 2026.xlsx";
const PRODUCTO = "Misión La Gavia";
const ASIGNADO_POR_TAG = "import-gavia-xperience";

/** Vendedor Excel → asesor GABI (se crean si faltan). */
const GAVIA_VENDEDORES = [
  { vendedor: "Ignacio Underwood", id: "ignacio.underwood", email: "ignacio.underwood@grupoinvestti.com", nombre: "Ignacio Underwood" },
  { vendedor: "Emmanuel Escobar", id: "emmanuel.escobar", email: "emmanuel.escobar@grupoinvestti.com", nombre: "Emmanuel Escobar" },
  { vendedor: "Esther Bonnin", id: "ebonin", email: "ebonin@bbrhabitarea.com", nombre: "Esther Bonnin" },
  { vendedor: "Gabriela Bernal", id: "gbernal", email: "gbernal@bbrhabitarea.com", nombre: "Gabriela Bernal" },
  { vendedor: "Luis Escobar", id: "lescobar", email: "lescobar@bbrhabitarea.com", nombre: "Luis Escobar" },
  { vendedor: "Ibelise Espinoza", id: "iespinoza", email: "iespinoza@bbrhabitarea.com", nombre: "Ibelise Espinoza" },
  { vendedor: "Victor Rodriguez", id: "vrodriguez", email: "vrodriguez@bbrhabitarea.com", nombre: "Victor Rodriguez" },
  { vendedor: "Ilse Murillo", id: "imurillo", email: "imurillo@bbrhabitarea.com", nombre: "Ilse Murillo" },
];

const hashPin = (pin) => {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");

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

const normalizeEmail = (correo) => {
  const value = String(correo ?? "").trim().toLowerCase();
  if (!value) return null;
  // Placeholder Xperience: +52...@xperience.adryo.com.mx
  if (value.includes("@xperience.") || value.includes("@adryo.")) return null;
  return value;
};

/** Canal Excel → medio canónico del reporte La Gavia / PDF. */
const mapMedioPublicitario = (canal) => {
  const value = normalizeText(canal);
  if (!value) return null;
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tik") && value.includes("tok")) return "Tik Tok";
  if (value.includes("google") || value.includes("web") || value.includes("pagina")) {
    return "Página Web/GOOGLE";
  }
  if (value.includes("inmo") || value.includes("broker") || value.includes("inmobil")) {
    return "Inmobiliarias/Asesor Externo";
  }
  if (value.includes("telefono") || value.includes("llamada") || value.includes("contacto")) {
    return "Contacto Directo";
  }
  if (value.includes("oficina")) return "Oficina de Ventas";
  return String(canal).trim();
};

const mapMedioContacto = (canal) => {
  const value = normalizeText(canal);
  if (value.includes("telefono") || value.includes("llamada")) return "Teléfono";
  if (value.includes("whatsapp")) return "WhatsApp";
  if (value.includes("facebook") || value.includes("instagram") || value.includes("tik")) {
    return "Redes sociales";
  }
  if (value.includes("inmo")) return "Inmobiliaria";
  return String(canal ?? "").trim() || null;
};

const mapEtapaFromCalificacion = (calificacion) => {
  const cal = normalizeText(calificacion);
  if (!cal) return "nuevo";
  if (cal.startsWith("descartado") || cal.includes("descartado")) return "perdido";
  if (cal.includes("visito") || cal.includes("agendo cita") || cal.includes("cita")) return "cita";
  if (cal.includes("seguimiento") || cal.includes("lead valido") || cal.includes("en contacto")) {
    return "contactado";
  }
  return "nuevo";
};

const calificacionEsSpam = (calificacion) =>
  normalizeText(calificacion).startsWith("descartado") ||
  normalizeText(calificacion).includes("descartado /");

const parseCreatedAt = (fecha, hora) => {
  const day = String(fecha ?? "").trim();
  const time = String(hora ?? "12:00:00").trim() || "12:00:00";
  if (!day) return new Date().toISOString();
  // Excel often gives YYYY-MM-DD already when raw:false
  const iso = `${day.slice(0, 10)}T${time}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date(`${day.slice(0, 10)}T12:00:00`);
    return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
  }
  return d.toISOString();
};

const resolveAsesorId = (vendedor, asesoresByNormName, asesoresById) => {
  const raw = String(vendedor ?? "").trim();
  if (!raw || normalizeText(raw) === "agente ia") return null;

  const mapped = GAVIA_VENDEDORES.find((item) => normalizeText(item.vendedor) === normalizeText(raw));
  if (mapped && asesoresById.has(mapped.id)) return mapped.id;

  const byName = asesoresByNormName.get(normalizeText(raw));
  if (byName) return byName;

  for (const [name, id] of asesoresByNormName.entries()) {
    if (name.includes(normalizeText(raw)) || normalizeText(raw).includes(name)) return id;
  }
  return mapped?.id ?? null;
};

const upsertCampana = async (supabase, { nombre, canal }, dryRun) => {
  if (dryRun) return `dry-${nombre}`;
  const { data: existing } = await supabase
    .from("campanas")
    .select("id")
    .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID)
    .eq("nombre", nombre)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const tipo =
    normalizeText(canal).includes("inmo") ||
    normalizeText(canal).includes("telefono") ||
    normalizeText(canal).includes("contacto")
      ? "offline"
      : "online";

  const { data, error } = await supabase
    .from("campanas")
    .insert({
      desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
      nombre,
      canal: canal || null,
      tipo,
      activo: true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Campaña ${nombre}: ${error.message}`);
  return data.id;
};

const ensureAsesores = async (supabase, dryRun) => {
  if (dryRun) return { created: 0, updated: 0 };
  let created = 0;
  let updated = 0;
  for (const item of GAVIA_VENDEDORES) {
    const { data: existing } = await supabase.from("asesores").select("id, desarrollos_ids").eq("id", item.id).maybeSingle();
    const desarrollos = new Set(existing?.desarrollos_ids ?? []);
    desarrollos.add(MISION_LA_GAVIA_DESARROLLO_ID);
    const payload = {
      id: item.id,
      nombre: item.nombre,
      email: item.email,
      rol: "asesor",
      activo: true,
      desarrollos_ids: [...desarrollos],
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      const { error } = await supabase.from("asesores").update(payload).eq("id", item.id);
      if (error) console.error(`[gavia-leads] Asesor update ${item.id}:`, error.message);
      else updated += 1;
    } else {
      const { error } = await supabase.from("asesores").insert({
        ...payload,
        pin_hash: hashPin("0000"),
        created_at: new Date().toISOString(),
      });
      if (error) console.error(`[gavia-leads] Asesor create ${item.id}:`, error.message);
      else {
        console.log(`[gavia-leads] Asesor creado: ${item.nombre} (${item.id}) · PIN 0000`);
        created += 1;
      }
    }
  }
  return { created, updated };
};

const main = async () => {
  if (!loadEnvLocal()) {
    console.error("Falta .env.local con credenciales de Supabase.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const pathArg = args.find((a) => !a.startsWith("--"));
  const xlsxPath = resolve(pathArg ?? DEFAULT_XLSX);

  if (!existsSync(xlsxPath)) {
    console.error("No se encontró el Excel:", xlsxPath);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error: schemaProbe } = await supabase.from("prospectos").select("xperience_id").limit(1);
  if (schemaProbe?.message?.includes("xperience_id") || schemaProbe?.code === "42703") {
    console.error("\n[gavia-leads] Falta aplicar 020_xperience_lead_fields.sql en Supabase.\n");
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath, { cellDates: true, cellFormula: false });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Data ?? wb.Sheets[wb.SheetNames[0]], {
    defval: null,
    raw: false,
  });

  console.log(`[gavia-leads] Filas: ${rows.length} · ${xlsxPath}${dryRun ? " · DRY-RUN" : ""}`);

  const asesoresSeed = await ensureAsesores(supabase, dryRun);
  console.log(`[gavia-leads] Asesores: +${asesoresSeed.created} / ~${asesoresSeed.updated}`);

  const { data: asesoresDb } = await supabase.from("asesores").select("id, nombre, email");
  const asesoresByNormName = new Map();
  const asesoresById = new Set();
  for (const a of asesoresDb ?? []) {
    asesoresById.add(a.id);
    asesoresByNormName.set(normalizeText(a.nombre), a.id);
  }

  const campanaCache = new Map();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let withVisita = 0;
  let spamCount = 0;
  const unmappedVendedores = new Map();
  const mediosCount = new Map();

  for (const row of rows) {
    const xperienceId = Number(row.id);
    if (!xperienceId) {
      skipped += 1;
      continue;
    }

    const producto = String(row.Producto ?? "").trim();
    if (producto && normalizeText(producto) !== normalizeText(PRODUCTO) && !normalizeText(producto).includes("gavia")) {
      skipped += 1;
      continue;
    }

    const canal = String(row.Canal ?? "").trim() || null;
    const campanaNombre = String(row.Campaña ?? "Sin campaña").trim() || "Sin campaña";
    const calificacion = String(row.Calificación ?? "Sin Calificar").trim() || "Sin Calificar";
    const esSpam = calificacionEsSpam(calificacion);
    const esDuplicado = String(row["Asignado Por"] ?? "").includes("Duplicado");
    if (esSpam) spamCount += 1;

    const medioPublicitario = mapMedioPublicitario(canal);
    if (medioPublicitario) {
      mediosCount.set(medioPublicitario, (mediosCount.get(medioPublicitario) ?? 0) + 1);
    }

    const etapa = mapEtapaFromCalificacion(calificacion);
    const createdAt = parseCreatedAt(row.Fecha, row.Hora);
    const day = createdAt.slice(0, 10);
    const visitó = normalizeText(calificacion).includes("visito");
    const agendo = normalizeText(calificacion).includes("agendo cita");
    if (visitó) withVisita += 1;

    const asesorId = resolveAsesorId(row.Vendedor, asesoresByNormName, asesoresById);
    if (!asesorId && String(row.Vendedor ?? "").trim() && normalizeText(row.Vendedor) !== "agente ia") {
      const v = String(row.Vendedor).trim();
      unmappedVendedores.set(v, (unmappedVendedores.get(v) ?? 0) + 1);
    }

    const cacheKey = `${campanaNombre}|${canal ?? ""}`;
    let campanaId = campanaCache.get(cacheKey);
    if (!campanaId) {
      campanaId = await upsertCampana(supabase, { nombre: campanaNombre, canal }, dryRun);
      campanaCache.set(cacheKey, campanaId);
    }

    const payload = {
      desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
      xperience_id: xperienceId,
      producto_nombre: PRODUCTO,
      nombre: normalizeNombre(row.Nombre),
      email: normalizeEmail(row.Correo),
      telefono: normalizePhone(row.Teléfono),
      notas: String(row.Comentarios ?? "").trim() || null,
      asesor_id: asesorId,
      campana_id: dryRun ? null : campanaId,
      medio_publicitario: medioPublicitario,
      medio_contacto: mapMedioContacto(canal),
      calificacion,
      iscore: Number.isFinite(Number(row.iScore)) ? Number(row.iScore) : null,
      seller_score: Number.isFinite(Number(row.sellerScore)) ? Number(row.sellerScore) : null,
      asignado_por: String(row["Asignado Por"] ?? "").trim() || ASIGNADO_POR_TAG,
      bandera_correo: Number(row["Bandera Correo"] ?? 0),
      bandera_llamada: Number(row["Bandera Llamada"] ?? 0),
      bandera_whatsapp: Number(row["Bandera Whatsapp"] ?? 0),
      bandera_crm: Number(row["Bandera CRM"] ?? 0),
      es_spam: esSpam,
      es_duplicado: esDuplicado,
      etapa: esSpam ? "perdido" : etapa,
      visita_realizada_on: visitó ? day : null,
      visita_agendada_on: agendo || visitó ? day : null,
      activo: true,
      created_at: createdAt,
      updated_at: createdAt,
    };

    if (dryRun) {
      created += 1;
      continue;
    }

    const { data: existing } = await supabase
      .from("prospectos")
      .select("id, etapa, visita_realizada_on")
      .eq("xperience_id", xperienceId)
      .maybeSingle();

    if (existing?.id) {
      const updatePayload = { ...payload };
      delete updatePayload.created_at;
      // No degradar etapas avanzadas (apartado/vendido) en re-import.
      if (["apartado", "vendido"].includes(String(existing.etapa))) {
        delete updatePayload.etapa;
      } else if (!esSpam && existing.etapa === "cita" && etapa !== "perdido") {
        // Mantener cita si ya estaba
        delete updatePayload.etapa;
      }
      if (existing.visita_realizada_on && !payload.visita_realizada_on) {
        delete updatePayload.visita_realizada_on;
      }
      const { error } = await supabase.from("prospectos").update(updatePayload).eq("id", existing.id);
      if (error) {
        console.error(`[gavia-leads] Update ${xperienceId}:`, error.message);
        skipped += 1;
      } else {
        updated += 1;
      }
    } else {
      const { error } = await supabase.from("prospectos").insert(payload);
      if (error) {
        // Posible colisión de xperience_id global con otro desarrollo
        console.error(`[gavia-leads] Insert ${xperienceId}:`, error.message);
        skipped += 1;
      } else {
        created += 1;
      }
    }
  }

  console.log("\n[gavia-leads] Listo:");
  console.log(`  Creados:       ${created}`);
  console.log(`  Actualizados:  ${updated}`);
  console.log(`  Omitidos:      ${skipped}`);
  console.log(`  Spam/perdidos: ${spamCount}`);
  console.log(`  Con visita:    ${withVisita}`);
  console.log(`  Campañas:      ${campanaCache.size}`);
  console.log("  Medios:");
  for (const [medio, n] of [...mediosCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    - ${medio}: ${n}`);
  }
  if (unmappedVendedores.size) {
    console.log("  Vendedores sin mapear:");
    for (const [name, n] of unmappedVendedores) {
      console.log(`    - ${name} (${n})`);
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
