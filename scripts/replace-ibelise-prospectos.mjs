/**
 * Reemplazo total del CRM de Ibelise Espinoza (Misión La Gavia)
 * con su base Prospectia del Excel.
 *
 * 1) Desactiva todos sus prospectos activos de La Gavia.
 * 2) Importa el Excel (104): reactiva/actualiza por tel/ID o inserta.
 * 3) Adriana Guadalupe Nogueron → etapa cancelado (override manual).
 *
 * Uso:
 *   node scripts/replace-ibelise-prospectos.mjs --dry-run "C:/ruta/archivo.xlsx"
 *   node scripts/replace-ibelise-prospectos.mjs "C:/ruta/archivo.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { loadEnvLocal } from "./load-env-local.mjs";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "./mision-la-gavia-excel.mjs";

const DEFAULT_XLSX =
  "C:/Users/brise/OneDrive/Obsoletos/archivos/Escritorio9nov19/Escritorio2/Escritorio/Base de Datos Misión La Gavia 22072026 (1).xlsx";

const ASESOR_ID = "iespinoza";
const ASESOR_NOMBRE = "Ibelise Espinoza";
const PRODUCTO = "Misión La Gavia";
const ASIGNADO_POR_TAG = "replace-ibelise-prospectia-20260722";
const DEACTIVATE_NOTE = "[2026-07-22] Desactivado: reemplazo por base Prospectia de Ibelise.";

/** Override manual: mantener cancelado aunque Excel diga Apartado. */
const FORCE_CANCELADO = {
  phones: new Set(["4423369722"]),
  xperienceIds: new Set([198322]),
  nombreNorm: "adriana guadalupe nogueron fernandez",
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
  if (
    value.includes("@xperience.") ||
    value.includes("@adryo.") ||
    value.includes("@prospectia.")
  ) {
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
  if (m.includes("falso") || m.includes("invalido") || m.includes("inválido") || m.includes("numero invalido")) {
    return { motivo: "datos_falsos", detalle: null };
  }
  if (m.includes("duplicado") || m.includes("repetido")) return { motivo: "duplicado", detalle: null };
  if (m.includes("perfil")) return { motivo: "solo_informacion", detalle: String(motivoRaw).trim() };
  if (m.includes("otra inversion") || m.includes("otra inversión") || m.includes("otra razon")) {
    return { motivo: "otro", detalle: String(motivoRaw).trim() };
  }
  return { motivo: "otro", detalle: String(motivoRaw).trim() };
};

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
  if (etapa === "cancelado") return "Cancelado";
  if (descartado || etapa === "perdido") return "Descartado / No le Interesa";
  if (etapa === "apartado" || etapa === "vendido") return "Activo / Visita";
  if (etapa === "visita" || etapa === "cita") return "Activo / Visita";
  const et = normalizeText(etiqueta);
  if (et.includes("seguimiento") || et.includes("llamar")) return "Activo / En Segumiento";
  const st = normalizeText(estatus);
  if (st === "calificado" || st === "contacto" || st === "potencial") return "Activo / Interesado";
  return "Sin Calificar";
};

const shouldForceCancelado = ({ phone, prospectiaId, nombre }) => {
  if (phone && FORCE_CANCELADO.phones.has(phone)) return true;
  if (prospectiaId != null && FORCE_CANCELADO.xperienceIds.has(Number(prospectiaId))) return true;
  return normalizeText(nombre) === FORCE_CANCELADO.nombreNorm;
};

const normalizeExcelRow = (row) => {
  const out = { ...row };
  if (out["ID lead"] == null && out["4"] != null) out["ID lead"] = out["4"];
  return out;
};

const dedupeRows = (rows) => {
  const bestByKey = new Map();
  const skippedDupes = [];

  for (const raw of rows) {
    const row = normalizeExcelRow(raw);
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
  if (etapa === "cita" || etapa === "visita" || etapa === "apartado" || etapa === "vendido" || etapa === "cancelado") {
    steps.push({ step_id: "visita-agendada", completed_at: at });
  }
  if (etapa === "visita" || etapa === "apartado" || etapa === "vendido" || etapa === "cancelado") {
    steps.push({ step_id: "recorrido", completed_at: at });
  }
  const seen = new Set();
  return steps.filter((s) => {
    if (seen.has(s.step_id)) return false;
    seen.add(s.step_id);
    return true;
  });
};

const syncPlaybookProgress = async (supabase, prospectoId, steps, dryRun) => {
  if (dryRun || !prospectoId || !steps.length) return;
  await supabase.from("prospecto_playbook_progress").delete().eq("prospecto_id", prospectoId);
  const rows = steps.map((step) => ({
    prospecto_id: prospectoId,
    step_id: step.step_id,
    completed_at: step.completed_at,
    completed_by: ASESOR_ID,
  }));
  await supabase.from("prospecto_playbook_progress").upsert(rows, {
    onConflict: "prospecto_id,step_id",
  });
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

const fetchIbeliseProspectos = async (supabase) => {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("prospectos")
      .select("id, xperience_id, telefono, email, etapa, activo, notas, visita_realizada_on, visita_agendada_on, updated_at")
      .eq("asesor_id", ASESOR_ID)
      .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID)
      .range(from, from + 999);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data?.length || data.length < 1000) break;
    from += 1000;
  }
  return all;
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

  const wb = XLSX.readFile(xlsxPath);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: null,
    raw: true,
  });
  const { rows, skippedDupes } = dedupeRows(rawRows);

  console.log(
    `[replace-ibelise] Excel: ${rawRows.length} filas · dedupe: ${rows.length} · dupes: ${skippedDupes.length}${dryRun ? " · DRY-RUN" : ""}`,
  );

  const existing = await fetchIbeliseProspectos(supabase);
  const activosAntes = existing.filter((p) => p.activo !== false);
  console.log(
    `[replace-ibelise] Prospectos Ibelise La Gavia: ${existing.length} (${activosAntes.length} activos)`,
  );

  // 1) Desactivar todos los activos
  if (!dryRun && activosAntes.length) {
    const now = new Date().toISOString();
    for (let i = 0; i < activosAntes.length; i += 50) {
      const chunk = activosAntes.slice(i, i + 50);
      for (const p of chunk) {
        const notas = String(p.notas ?? "").trim();
        const nextNotas = notas.includes(DEACTIVATE_NOTE)
          ? notas
          : `${notas ? `${notas}\n` : ""}${DEACTIVATE_NOTE}`.slice(0, 4000);
        const { error } = await supabase
          .from("prospectos")
          .update({ activo: false, notas: nextNotas, updated_at: now })
          .eq("id", p.id);
        if (error) {
          console.error(`[replace-ibelise] Deactivate ${p.id}:`, error.message);
        }
      }
    }
  }
  console.log(`[replace-ibelise] Desactivados: ${activosAntes.length}`);

  // Índices post-desactivación (todos los de Ibelise, para reactivar/actualizar)
  const refreshed = dryRun ? existing : await fetchIbeliseProspectos(supabase);
  const byPhone = new Map();
  const byEmail = new Map();
  const byXpId = new Map();
  for (const p of refreshed) {
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

  const campanaCache = new Map();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let forcedCancelado = 0;
  const etapaCount = new Map();
  const touchedIds = new Set();

  for (const row of rows) {
    const prospectiaId = Number(row["ID lead"]);
    if (!Number.isFinite(prospectiaId) || prospectiaId <= 0) {
      skipped += 1;
      continue;
    }

    const descartado = isTruthy(row.Descartado);
    const etiqueta = String(row["Etiqueta de seguimiento"] ?? "").trim() || null;
    const estatus = String(row.Estatus ?? "").trim() || null;
    const telefono = normalizePhone(row["Teléfono"]);
    const email = normalizeEmail(row["Correo"]);
    const nombre = normalizeNombre(row.Nombre);
    const createdAt = parseIso(row["Fecha de creación"]) || new Date().toISOString();
    const revisedAt = parseIso(row["Fecha de revisión"]) || createdAt;
    const visitaRealizadaOn = parseVisitDate(row["Visitó desarrollo"]);
    const origenRaw = String(row.Origen ?? "").trim() || "Sin origen";
    const medioPublicitario = mapMedioPublicitario(origenRaw);
    const medioContacto = mapMedioContacto(row["Tipo de contacto"], row["Quiere ser contactado"]);
    const tipoContacto = String(row["Tipo de contacto"] ?? "").trim();

    let etapa = mapEtapa(row);
    if (shouldForceCancelado({ phone: telefono, prospectiaId, nombre })) {
      etapa = "cancelado";
      forcedCancelado += 1;
    }
    etapaCount.set(etapa, (etapaCount.get(etapa) || 0) + 1);

    let twin = null;
    if (telefono && byPhone.has(telefono)) twin = byPhone.get(telefono);
    else if (email && byEmail.has(email)) twin = byEmail.get(email);
    else if (byXpId.has(prospectiaId)) twin = byXpId.get(prospectiaId);

    const { motivo, detalle } =
      etapa === "perdido"
        ? mapMotivoDescarte(row["Motivo de descarte"])
        : etapa === "cancelado"
          ? {
              motivo: "otro",
              detalle: "Cancelado (override manual; Excel marcaba Apartado)",
            }
          : { motivo: null, detalle: null };

    const calificacion = mapCalificacion({ descartado, etiqueta, estatus, etapa });
    const notas = appendProspectiaNote(twin?.notas, prospectiaId, etiqueta, row["Motivo de descarte"]);

    let campanaId;
    try {
      campanaId = await upsertCampana(
        supabase,
        { nombre: origenRaw, canal: medioPublicitario || origenRaw },
        dryRun,
        campanaCache,
      );
    } catch (error) {
      console.error(`[replace-ibelise] Campaña:`, error instanceof Error ? error.message : error);
      skipped += 1;
      continue;
    }

    const payload = {
      desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
      producto_nombre: PRODUCTO,
      nombre,
      email,
      telefono,
      origen_ciudad: String(row.Ciudad ?? "").trim() || null,
      medio_contacto: medioContacto,
      medio_publicitario: medioPublicitario,
      notas,
      asesor_id: ASESOR_ID,
      promotor_nombre: ASESOR_NOMBRE,
      campana_id: dryRun ? null : campanaId,
      calificacion,
      nivel_interes:
        etapa === "visita" || etapa === "cita" || etapa === "apartado" || etapa === "cancelado"
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
        etapa === "cita" || etapa === "visita" || etapa === "cancelado" || visitaRealizadaOn
          ? visitaRealizadaOn || twin?.visita_agendada_on || createdAt.slice(0, 10)
          : twin?.visita_agendada_on || null,
      xperience_id: prospectiaId,
      activo: true,
      asignado_por: ASIGNADO_POR_TAG,
      updated_at: revisedAt,
    };

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
        console.error(`[replace-ibelise] Update ${prospectiaId}:`, error.message);
        skipped += 1;
        continue;
      }
      updated += 1;
      touchedIds.add(twin.id);
      await syncPlaybookProgress(supabase, twin.id, playbookSteps, dryRun);
      const refreshedRow = { ...twin, ...payload, id: twin.id };
      if (telefono) byPhone.set(telefono, refreshedRow);
      if (email) byEmail.set(email, refreshedRow);
      byXpId.set(prospectiaId, refreshedRow);
    } else {
      const { data: inserted, error } = await supabase
        .from("prospectos")
        .insert({ ...payload, created_at: createdAt })
        .select("id")
        .single();
      if (error) {
        console.error(`[replace-ibelise] Insert ${prospectiaId}:`, error.message);
        skipped += 1;
        continue;
      }
      created += 1;
      touchedIds.add(inserted.id);
      await syncPlaybookProgress(supabase, inserted.id, playbookSteps, dryRun);
      const refreshedRow = { ...payload, id: inserted.id };
      if (telefono) byPhone.set(telefono, refreshedRow);
      if (email) byEmail.set(email, refreshedRow);
      byXpId.set(prospectiaId, refreshedRow);
    }
  }

  // Asegurar que nada activo de Ibelise quedó fuera del Excel
  let leftovers = 0;
  if (!dryRun) {
    const after = await fetchIbeliseProspectos(supabase);
    const stray = after.filter((p) => p.activo !== false && !touchedIds.has(p.id));
    leftovers = stray.length;
    const now = new Date().toISOString();
    for (const p of stray) {
      await supabase
        .from("prospectos")
        .update({
          activo: false,
          notas: `${String(p.notas ?? "").trim()}\n${DEACTIVATE_NOTE} (sobrante)`.slice(0, 4000),
          updated_at: now,
        })
        .eq("id", p.id);
    }
  }

  const verify = dryRun
    ? null
    : await fetchIbeliseProspectos(supabase).then((list) => {
        const activos = list.filter((p) => p.activo !== false);
        const byEtapa = {};
        for (const p of activos) {
          byEtapa[p.etapa] = (byEtapa[p.etapa] || 0) + 1;
        }
        return { activos: activos.length, byEtapa };
      });

  console.log("\n[replace-ibelise] Resultado:");
  console.log({
    dryRun,
    deactivated: activosAntes.length,
    created,
    updated,
    skipped,
    forcedCancelado,
    leftoversDeactivated: leftovers,
    internalDupesSkipped: skippedDupes.length,
    verify,
  });
  console.log("Etapas importadas:", [...etapaCount.entries()].sort((a, b) => b[1] - a[1]));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
