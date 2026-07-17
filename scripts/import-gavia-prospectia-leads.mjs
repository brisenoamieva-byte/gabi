/**
 * Importa / consolida leads de Prospectia (Misión La Gavia) → prospectos GABI.
 *
 * El Excel digital previo era Xperience (IDs ~488k). Este archivo es Prospectia
 * (ID lead ~196k–201k) e incluye también walk-in, señalética, lonas, etc.
 *
 * Uso:
 *   node scripts/import-gavia-prospectia-leads.mjs
 *   node scripts/import-gavia-prospectia-leads.mjs "C:/ruta/Prospectia 16072026.xlsx"
 *   node scripts/import-gavia-prospectia-leads.mjs --dry-run
 *   node scripts/import-gavia-prospectia-leads.mjs --force-excel
 *
 * --force-excel: Prospectia manda el seguimiento (etapa, visitas, motivos).
 *   No retrocede apartado/vendido/cancelado salvo que Prospectia marque
 *   apartado, cierre o descarte.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { loadEnvLocal } from "./load-env-local.mjs";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "./mision-la-gavia-excel.mjs";

const DEFAULT_XLSX =
  "C:/Users/brise/OneDrive/Obsoletos/archivos/Escritorio9nov19/Escritorio2/Escritorio/Prospectia 16072026.xlsx";
const PRODUCTO = "Misión La Gavia";
const ASIGNADO_POR_TAG = "import-gavia-prospectia";

const GAVIA_VENDEDORES = [
  { vendedor: "Ignacio Underwood", id: "ignacio.underwood", email: "ignacio.underwood@grupoinvestti.com", nombre: "Ignacio Underwood" },
  { vendedor: "Emmanuel Escobar", id: "emmanuel.escobar", email: "emmanuel.escobar@grupoinvestti.com", nombre: "Emmanuel Escobar" },
  { vendedor: "Esther Bonnin", id: "ebonin", email: "ebonin@bbrhabitarea.com", nombre: "Esther Bonnin" },
  { vendedor: "Gabriela Bernal", id: "gbernal", email: "gbernal@bbrhabitarea.com", nombre: "Gabriela Bernal" },
  { vendedor: "Luis Escobar", id: "lescobar", email: "lescobar@bbrhabitarea.com", nombre: "Luis Escobar" },
  { vendedor: "Ibelise Espinoza", id: "iespinoza", email: "iespinoza@bbrhabitarea.com", nombre: "Ibelise Espinoza" },
  { vendedor: "Victor Rodriguez", id: "vrodriguez", email: "vrodriguez@bbrhabitarea.com", nombre: "Victor Rodriguez" },
  { vendedor: "Víctor Rodríguez", id: "vrodriguez", email: "vrodriguez@bbrhabitarea.com", nombre: "Victor Rodriguez" },
  { vendedor: "Ilse Murillo", id: "imurillo", email: "imurillo@bbrhabitarea.com", nombre: "Ilse Murillo" },
];

const ETAPAS_CERRADAS = new Set(["apartado", "vendido", "cancelado"]);

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

const isTruthy = (value) => {
  const v = normalizeText(value);
  return v === "true" || v === "1" || v === "si" || v === "yes";
};

const normalizeNombre = (nombre) => {
  const value = String(nombre ?? "").trim();
  if (!value || value === "[Nombre por registrar]") return "Nombre por registrar";
  return value;
};

/** Teléfonos: soporta número Excel y notación científica. */
const normalizePhone = (telefono) => {
  let raw = telefono;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    raw = raw.toFixed(0);
  } else {
    let s = String(raw ?? "").trim();
    if (/e[+-]/i.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) s = n.toFixed(0);
    }
    raw = s;
  }
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
};

const normalizeEmail = (correo) => {
  const value = String(correo ?? "").trim().toLowerCase();
  if (!value || !value.includes("@")) return null;
  if (value.includes("@xperience.") || value.includes("@adryo.") || value.includes("@prospectia.")) {
    return null;
  }
  return value;
};

const parseIso = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseVisitDate = (value) => {
  const iso = parseIso(value);
  if (!iso) return null;
  return iso.slice(0, 10);
};

const mapMedioPublicitario = (origen) => {
  const value = normalizeText(origen);
  if (!value) return null;
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tik")) return "Tik Tok";
  if (value.includes("pagina") || value.includes("web") || value.includes("google")) {
    return "Página Web/GOOGLE";
  }
  if (value.includes("inmobil") || value.includes("broker") || value.includes("asesor externo")) {
    return "Inmobiliarias/Asesor Externo";
  }
  if (value.includes("walk") || value.includes("oficina")) return "Oficina de Ventas";
  if (value.includes("telefono") || value.includes("contacto directo")) return "Contacto Directo";
  if (value.includes("referid")) return "Referidos";
  if (value.includes("senaletic") || value.includes("lona") || value.includes("espectacular")) {
    return "Señalética / Exterior";
  }
  if (value.includes("base")) return "Base de datos";
  if (value.includes("redes")) return "Redes sociales";
  return String(origen).trim();
};

const mapMedioContacto = (tipoContacto, quiereContacto) => {
  const raw = String(tipoContacto ?? quiereContacto ?? "").trim();
  const value = normalizeText(raw);
  if (!value) return null;
  if (value.includes("whats")) return "WhatsApp";
  if (value.includes("tel") || value.includes("llamad")) return "Teléfono";
  if (value.includes("correo") || value.includes("mail")) return "Correo";
  return raw;
};

const mapMotivoDescarte = (motivoRaw) => {
  const m = normalizeText(motivoRaw);
  if (!m || m.includes("sin motivo")) return { motivo: "no_le_interesa", detalle: null };
  if (m.includes("no tiene interes") || m.includes("no le interesa")) {
    return { motivo: "no_le_interesa", detalle: null };
  }
  if (m.includes("no contesta")) return { motivo: "no_localizable", detalle: null };
  if (m.includes("presupuesto")) return { motivo: "falta_presupuesto", detalle: null };
  if (m.includes("broker") || m.includes("proveedor")) return { motivo: "es_proveedor", detalle: null };
  if (m.includes("falso") || m.includes("invalido") || m.includes("inválido")) {
    return { motivo: "datos_falsos", detalle: null };
  }
  if (m.includes("duplicado") || m.includes("repetido")) return { motivo: "duplicado", detalle: null };
  if (m.includes("perfil")) return { motivo: "solo_informacion", detalle: String(motivoRaw).trim() };
  if (m.includes("otra inversion") || m.includes("otra inversión")) {
    return { motivo: "compro_otro_lado", detalle: String(motivoRaw).trim() };
  }
  return { motivo: "otro", detalle: String(motivoRaw).trim() };
};

/**
 * Status Gabi desde columnas Prospectia (prioridad comercial).
 *
 * Descartado / No comprará → perdido
 * Apartado → apartado
 * Cierre → vendido
 * Visitó desarrollo o Estatus Visita → visita
 * Estatus Cita → cita
 * Contacto / Calificado / Potencial / seguimiento / intentos → contactado
 * resto → nuevo
 */
const mapEtapa = (row) => {
  const descartado = isTruthy(row.Descartado);
  const etiqueta = normalizeText(row["Etiqueta de seguimiento"]);
  const estatus = normalizeText(row.Estatus);
  const visitaOn = parseVisitDate(row["Visitó desarrollo"]);

  if (descartado || etiqueta.includes("no comprar")) return "perdido";
  if (etiqueta.includes("apartado")) return "apartado";
  if (estatus === "cierre") return "vendido";
  if (visitaOn || estatus === "visita") return "visita";
  if (estatus === "cita") return "cita";
  if (estatus === "contacto" || estatus === "calificado" || estatus === "potencial") {
    return "contactado";
  }
  if (
    etiqueta.includes("seguimiento") ||
    etiqueta.includes("llamar") ||
    etiqueta.includes("no contesta")
  ) {
    return "contactado";
  }
  const intentos = Number(row["Intentos de contacto"] ?? 0);
  const tipo = String(row["Tipo de contacto"] ?? "").trim();
  if ((Number.isFinite(intentos) && intentos > 0) || tipo) return "contactado";
  return "nuevo";
};

const mapCalificacion = ({ descartado, etiqueta, estatus, etapa }) => {
  if (descartado || etapa === "perdido") return "Descartado / No le Interesa";
  if (etapa === "apartado" || etapa === "vendido") return "Activo / Visita";
  if (etapa === "visita" || etapa === "cita") return "Activo / Visita";
  const et = normalizeText(etiqueta);
  if (et.includes("seguimiento") || et.includes("llamar")) return "Activo / En Segumiento";
  const st = normalizeText(estatus);
  if (st === "calificado" || st === "contacto" || st === "potencial") return "Activo / Interesado";
  return "Sin Calificar";
};

const mergeEtapa = (existingEtapa, nextEtapa, forceExcel) => {
  if (!existingEtapa) return nextEtapa;
  if (forceExcel) {
    if (ETAPAS_CERRADAS.has(existingEtapa) && !ETAPAS_CERRADAS.has(nextEtapa) && nextEtapa !== "perdido") {
      return existingEtapa;
    }
    return nextEtapa;
  }
  if (ETAPAS_CERRADAS.has(existingEtapa)) return existingEtapa;
  if (existingEtapa === "perdido" && nextEtapa !== "perdido") return nextEtapa;
  const order = ["nuevo", "contactado", "cita", "visita", "apartado", "vendido"];
  const a = order.indexOf(existingEtapa);
  const b = order.indexOf(nextEtapa);
  if (nextEtapa === "perdido") return "perdido";
  if (a < 0) return nextEtapa;
  if (b < 0) return existingEtapa;
  return order[Math.max(a, b)];
};

const resolveAsesorId = (asesorNombre, asesoresByNormName, asesoresById) => {
  const raw = String(asesorNombre ?? "").trim();
  if (!raw || normalizeText(raw).includes("soporte prospectia")) return null;

  const mapped = GAVIA_VENDEDORES.find((item) => normalizeText(item.vendedor) === normalizeText(raw));
  if (mapped && asesoresById.has(mapped.id)) return mapped.id;

  const byName = asesoresByNormName.get(normalizeText(raw));
  if (byName) return byName;

  for (const [name, id] of asesoresByNormName.entries()) {
    if (name.includes(normalizeText(raw)) || normalizeText(raw).includes(name)) return id;
  }
  return mapped?.id ?? null;
};

const upsertCampana = async (supabase, { nombre, canal }, dryRun, cache) => {
  const key = `${nombre}|${canal ?? ""}`;
  if (cache.has(key)) return cache.get(key);
  if (dryRun) {
    const fake = `dry-${cache.size + 1}`;
    cache.set(key, fake);
    return fake;
  }
  const { data: existing } = await supabase
    .from("campanas")
    .select("id")
    .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID)
    .eq("nombre", nombre)
    .maybeSingle();
  if (existing?.id) {
    cache.set(key, existing.id);
    return existing.id;
  }
  const tipo =
    normalizeText(canal).includes("inmo") ||
    normalizeText(canal).includes("telefono") ||
    normalizeText(canal).includes("contacto") ||
    normalizeText(canal).includes("walk") ||
    normalizeText(canal).includes("senal") ||
    normalizeText(canal).includes("referid") ||
    normalizeText(canal).includes("base")
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
  cache.set(key, data.id);
  return data.id;
};

const ensureAsesores = async (supabase, dryRun) => {
  if (dryRun) return;
  const seen = new Set();
  for (const item of GAVIA_VENDEDORES) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const { data: existing } = await supabase
      .from("asesores")
      .select("id, desarrollos_ids")
      .eq("id", item.id)
      .maybeSingle();
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
      await supabase.from("asesores").update(payload).eq("id", item.id);
    } else {
      await supabase.from("asesores").insert({
        ...payload,
        pin_hash: hashPin("0000"),
        created_at: new Date().toISOString(),
      });
      console.log(`[gavia-prospectia] Asesor creado: ${item.nombre} (${item.id}) · PIN 0000`);
    }
  }
};

const playbookStepsFromRow = ({ row, etapa, telefono, createdAt }) => {
  const steps = [];
  const at = createdAt;
  const tipo = normalizeText(row["Tipo de contacto"]);
  const quiere = normalizeText(row["Quiere ser contactado"]);
  if (tipo.includes("whats") || quiere.includes("whats")) {
    steps.push({ step_id: "whatsapp-inicial", completed_at: at });
  }
  if (tipo.includes("tel") || Number(row["Intentos de contacto"] ?? 0) > 0) {
    steps.push({ step_id: "llamada-d0", completed_at: at });
  }
  if (telefono) steps.push({ step_id: "datos-completos", completed_at: at });
  if (etapa === "cita" || etapa === "visita" || etapa === "apartado" || etapa === "vendido") {
    steps.push({ step_id: "visita-agendada", completed_at: at });
  }
  if (etapa === "visita" || etapa === "apartado" || etapa === "vendido") {
    steps.push({ step_id: "recorrido", completed_at: at });
  }
  const seen = new Set();
  return steps.filter((s) => {
    if (seen.has(s.step_id)) return false;
    seen.add(s.step_id);
    return true;
  });
};

const syncPlaybookProgress = async (supabase, prospectoId, asesorId, steps, dryRun) => {
  if (dryRun || !prospectoId || !steps.length) return;
  const { error: delError } = await supabase
    .from("prospecto_playbook_progress")
    .delete()
    .eq("prospecto_id", prospectoId);
  if (delError) return;
  const rows = steps.map((step) => ({
    prospecto_id: prospectoId,
    step_id: step.step_id,
    completed_at: step.completed_at,
    completed_by: asesorId,
  }));
  await supabase.from("prospecto_playbook_progress").upsert(rows, {
    onConflict: "prospecto_id,step_id",
  });
};

/** Dedup intra-archivo: teléfono → email → ID; gana la Fecha de revisión más reciente. */
const dedupeRows = (rows) => {
  const bestByKey = new Map();
  const skippedDupes = [];

  for (const row of rows) {
    const id = Number(row["ID lead"]);
    if (!Number.isFinite(id) || id <= 0) continue;
    const phone = normalizePhone(row["Teléfono"]);
    const email = normalizeEmail(row["Correo"]);
    const key = phone ? `p:${phone}` : email ? `e:${email}` : `id:${id}`;
    const rev = new Date(row["Fecha de revisión"] || row["Fecha de creación"] || 0).getTime();
    const prev = bestByKey.get(key);
    if (!prev || rev >= prev.rev) {
      if (prev) skippedDupes.push(prev.row);
      bestByKey.set(key, { rev, row });
    } else {
      skippedDupes.push(row);
    }
  }

  return {
    rows: [...bestByKey.values()].map((item) => item.row),
    skippedDupes,
  };
};

const loadExistingProspectos = async (supabase) => {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("prospectos")
      .select(
        "id, xperience_id, telefono, email, etapa, asignado_por, updated_at, notas, visita_realizada_on, visita_agendada_on",
      )
      .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID)
      .eq("activo", true)
      .range(from, from + 999);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data?.length || data.length < 1000) break;
    from += 1000;
  }

  const byPhone = new Map();
  const byEmail = new Map();
  const byXpId = new Map();
  for (const p of all) {
    if (p.xperience_id != null) byXpId.set(Number(p.xperience_id), p);
    const ph = normalizePhone(p.telefono);
    if (ph) {
      const prev = byPhone.get(ph);
      if (!prev || String(p.updated_at) > String(prev.updated_at)) byPhone.set(ph, p);
    }
    const em = normalizeEmail(p.email);
    if (em) {
      const prev = byEmail.get(em);
      if (!prev || String(p.updated_at) > String(prev.updated_at)) byEmail.set(em, p);
    }
  }
  return { all, byPhone, byEmail, byXpId };
};

const appendProspectiaNote = (existingNotas, prospectiaId, etiqueta, motivo) => {
  const parts = [
    `Prospectia ID: ${prospectiaId}`,
    etiqueta ? `Etiqueta: ${etiqueta}` : null,
    motivo && normalizeText(motivo) !== "sin motivo de descarte" ? `Motivo: ${motivo}` : null,
  ].filter(Boolean);
  const stamp = parts.join(" · ");
  const prev = String(existingNotas ?? "").trim();
  if (!prev) return stamp;
  if (prev.includes(`Prospectia ID: ${prospectiaId}`)) {
    return prev.replace(/Prospectia ID: \d+[^.]*?(?= · |$)/, stamp);
  }
  return `${prev}\n${stamp}`.slice(0, 4000);
};

const main = async () => {
  if (!loadEnvLocal()) {
    console.error("Falta .env.local con credenciales de Supabase.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const forceExcel = args.includes("--force-excel");
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

  const wb = XLSX.readFile(xlsxPath);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: null,
    raw: true,
  });

  const { rows, skippedDupes } = dedupeRows(rawRows);
  console.log(
    `[gavia-prospectia] Filas Excel: ${rawRows.length} · tras dedupe: ${rows.length} · dupes internos: ${skippedDupes.length}${dryRun ? " · DRY-RUN" : ""}${forceExcel ? " · FORCE-EXCEL" : ""}`,
  );

  await ensureAsesores(supabase, dryRun);

  const { data: asesoresDb } = await supabase.from("asesores").select("id, nombre, email");
  const asesoresByNormName = new Map();
  const asesoresById = new Set();
  for (const a of asesoresDb ?? []) {
    asesoresById.add(a.id);
    asesoresByNormName.set(normalizeText(a.nombre), a.id);
  }

  const existing = await loadExistingProspectos(supabase);
  console.log(
    `[gavia-prospectia] Prospectos activos en Gabi: ${existing.all.length} (phones ${existing.byPhone.size})`,
  );

  const campanaCache = new Map();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let matchedByPhone = 0;
  let matchedByEmail = 0;
  let matchedById = 0;
  let playbookSynced = 0;
  const etapaCount = new Map();
  const origenCount = new Map();
  const unmappedAsesores = new Map();

  for (const row of rows) {
    const prospectiaId = Number(row["ID lead"]);
    if (!Number.isFinite(prospectiaId) || prospectiaId <= 0) {
      skipped += 1;
      continue;
    }

    const descartado = isTruthy(row.Descartado);
    const etiqueta = String(row["Etiqueta de seguimiento"] ?? "").trim() || null;
    const estatus = String(row.Estatus ?? "").trim() || null;
    const etapaMapped = mapEtapa(row);
    const visitaRealizadaOn = parseVisitDate(row["Visitó desarrollo"]);
    const telefono = normalizePhone(row["Teléfono"]);
    const email = normalizeEmail(row["Correo"]);
    const createdAt = parseIso(row["Fecha de creación"]) || new Date().toISOString();
    const revisedAt = parseIso(row["Fecha de revisión"]) || createdAt;
    const origenRaw = String(row.Origen ?? "").trim() || "Sin origen";
    const medioPublicitario = mapMedioPublicitario(origenRaw);
    const medioContacto = mapMedioContacto(row["Tipo de contacto"], row["Quiere ser contactado"]);
    const tipoContacto = String(row["Tipo de contacto"] ?? "").trim();

    origenCount.set(origenRaw, (origenCount.get(origenRaw) || 0) + 1);

    let campanaId;
    try {
      campanaId = await upsertCampana(
        supabase,
        { nombre: origenRaw, canal: medioPublicitario || origenRaw },
        dryRun,
        campanaCache,
      );
    } catch (error) {
      console.error(`[gavia-prospectia] Campaña:`, error instanceof Error ? error.message : error);
      skipped += 1;
      continue;
    }

    const asesorId = resolveAsesorId(row.Asesor, asesoresByNormName, asesoresById);
    if (!asesorId && String(row.Asesor ?? "").trim() && !normalizeText(row.Asesor).includes("soporte")) {
      const name = String(row.Asesor).trim();
      unmappedAsesores.set(name, (unmappedAsesores.get(name) || 0) + 1);
    }

    let twin = null;
    let matchKind = null;
    if (telefono && existing.byPhone.has(telefono)) {
      twin = existing.byPhone.get(telefono);
      matchKind = "phone";
      matchedByPhone += 1;
    } else if (email && existing.byEmail.has(email)) {
      twin = existing.byEmail.get(email);
      matchKind = "email";
      matchedByEmail += 1;
    } else if (existing.byXpId.has(prospectiaId)) {
      twin = existing.byXpId.get(prospectiaId);
      matchKind = "id";
      matchedById += 1;
    }

    const etapa = mergeEtapa(twin?.etapa, etapaMapped, forceExcel || !twin);
    etapaCount.set(etapa, (etapaCount.get(etapa) || 0) + 1);

    const { motivo, detalle } =
      etapa === "perdido" ? mapMotivoDescarte(row["Motivo de descarte"]) : { motivo: null, detalle: null };

    const calificacion = mapCalificacion({ descartado, etiqueta, estatus, etapa });
    const notas = appendProspectiaNote(twin?.notas, prospectiaId, etiqueta, row["Motivo de descarte"]);

    const payload = {
      desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
      producto_nombre: PRODUCTO,
      nombre: normalizeNombre(row.Nombre),
      email,
      telefono,
      origen_ciudad: String(row.Ciudad ?? "").trim() || null,
      medio_contacto: medioContacto,
      medio_publicitario: medioPublicitario,
      notas,
      asesor_id: asesorId,
      promotor_nombre: String(row.Asesor ?? "").trim() || null,
      campana_id: dryRun ? null : campanaId,
      calificacion,
      nivel_interes:
        etapa === "visita" || etapa === "cita" || etapa === "apartado"
          ? "alto"
          : etiqueta && normalizeText(etiqueta).includes("llamar")
            ? "bajo"
            : etapa === "perdido"
              ? "sin_interes"
              : "medio",
      iscore: Number.isFinite(Number(row.Afinidad)) ? Number(row.Afinidad) : null,
      seller_score: Number.isFinite(Number(row.Interés)) ? Number(row.Interés) : null,
      bandera_correo: normalizeText(tipoContacto).includes("correo") ? 1 : 0,
      bandera_llamada:
        normalizeText(tipoContacto).includes("tel") || Number(row["Intentos de contacto"] ?? 0) > 0
          ? 1
          : 0,
      bandera_whatsapp:
        normalizeText(tipoContacto).includes("whats") ||
        normalizeText(row["Quiere ser contactado"]).includes("whats")
          ? 1
          : 0,
      bandera_crm: 1,
      es_spam: false,
      es_duplicado: false,
      etapa,
      motivo_descarte: motivo,
      motivo_descarte_detalle: detalle,
      visita_realizada_on: visitaRealizadaOn || twin?.visita_realizada_on || null,
      visita_agendada_on:
        etapa === "cita" || etapa === "visita" || visitaRealizadaOn
          ? visitaRealizadaOn || twin?.visita_agendada_on || createdAt.slice(0, 10)
          : twin?.visita_agendada_on || null,
      activo: true,
      updated_at: revisedAt,
    };

    // No pisar xperience_id de leads ya importados desde Xperience (IDs ~488k).
    if (!twin || twin.xperience_id == null || Number(twin.xperience_id) === prospectiaId) {
      payload.xperience_id = prospectiaId;
    }

    if (!twin) {
      payload.asignado_por = ASIGNADO_POR_TAG;
      payload.created_at = createdAt;
    }

    const playbookSteps = playbookStepsFromRow({
      row,
      etapa,
      telefono,
      createdAt: revisedAt,
    });

    if (dryRun) {
      if (twin) updated += 1;
      else created += 1;
      continue;
    }

    if (twin?.id) {
      const { error } = await supabase.from("prospectos").update(payload).eq("id", twin.id);
      if (error) {
        console.error(`[gavia-prospectia] Update ${prospectiaId} (${matchKind}):`, error.message);
        skipped += 1;
        continue;
      }
      updated += 1;
      await syncPlaybookProgress(supabase, twin.id, asesorId, playbookSteps, dryRun);
      playbookSynced += 1;
      const refreshed = { ...twin, ...payload, id: twin.id };
      if (telefono) existing.byPhone.set(telefono, refreshed);
      if (email) existing.byEmail.set(email, refreshed);
      if (payload.xperience_id != null) existing.byXpId.set(Number(payload.xperience_id), refreshed);
    } else {
      const { data: inserted, error } = await supabase
        .from("prospectos")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        console.error(`[gavia-prospectia] Insert ${prospectiaId}:`, error.message);
        skipped += 1;
        continue;
      }
      created += 1;
      await syncPlaybookProgress(supabase, inserted.id, asesorId, playbookSteps, dryRun);
      playbookSynced += 1;
      const refreshed = { ...payload, id: inserted.id };
      if (telefono) existing.byPhone.set(telefono, refreshed);
      if (email) existing.byEmail.set(email, refreshed);
      if (payload.xperience_id != null) existing.byXpId.set(Number(payload.xperience_id), refreshed);
    }
  }

  console.log("\n[gavia-prospectia] Resultado:");
  console.log({
    created,
    updated,
    skipped,
    matchedByPhone,
    matchedByEmail,
    matchedById,
    playbookSynced,
    internalDupesSkipped: skippedDupes.length,
    dryRun,
    forceExcel,
  });
  console.log("Etapas:", [...etapaCount.entries()].sort((a, b) => b[1] - a[1]));
  console.log("Orígenes:", [...origenCount.entries()].sort((a, b) => b[1] - a[1]));
  if (unmappedAsesores.size) {
    console.log(
      "Asesores sin match:",
      [...unmappedAsesores.entries()].sort((a, b) => b[1] - a[1]),
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
