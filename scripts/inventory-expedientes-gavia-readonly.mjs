/**
 * Inventario SOLO LECTURA de expedientes Misión La Gavia.
 *
 * - Lee operaciones + expediente_documentos en Supabase
 * - Lista archivos en Google Drive (scope drive.readonly)
 * - NO crea, renombra, mueve, sube ni borra nada
 *
 * Uso:
 *   node scripts/inventory-expedientes-gavia-readonly.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DESARROLLO_ID = "mision-la-gavia";
const EXPEDIENTES_SUBFOLDER = "3. Expediente Clientes";
const EXPEDIENTES_ALIASES = [
  "3. Expediente Clientes",
  "3. Expedientes Clientes",
];

const CHECKLIST = [
  { codigo: "OC", titulo: "Carta oferta de compra (OC)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "ANEXO_A_DATOS", titulo: "Manifestación de datos generales (ANEXO A)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "ANEXO_B_PAGO", titulo: "Modalidad de pago (ANEXO B)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "SIMULADOR", titulo: "Cotización autorizada (PDF)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "ANEXO_C_ESPEC", titulo: "Especificaciones del departamento (ANEXO C)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "ANEXO_D_MANT", titulo: "Aceptación cuotas de mantenimiento (ANEXO D)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "ANEXO_E_PLD", titulo: "Carta prevención de lavado de dinero (ANEXO E)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "ANEXO_F_PRIV", titulo: "Aviso de privacidad (ANEXO F)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "DEPOA", titulo: "Comprobante depósito de apartado (DEPOA)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "ID", titulo: "Identificación oficial (ID)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "CURP", titulo: "CURP", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "RFC", titulo: "RFC (o RFC genérico)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "DOM", titulo: "Comprobante de domicilio — 3 meses (DOM)", requeridoApartado: true, requeridoFormalizacion: false },
  { codigo: "CONTRATO", titulo: "Contrato de compra-venta (CONTRATO)", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "CONTRATO_ANEXO_A", titulo: "Anexo A — Plano de ubicación", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "CONTRATO_ANEXO_B", titulo: "Anexo B — Datos bancarios del vendedor", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "CONTRATO_ANEXO_C", titulo: "Anexo C — Tabla de pagos", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "CONTRATO_ANEXO_D", titulo: "Anexo D — Notarías", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "ESTACIONAMIENTOS", titulo: "Estacionamientos", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "A_NAC", titulo: "Acta de nacimiento (A. NAC)", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "EDO_CTA", titulo: "Estado de cuenta (EDO. CTA)", requeridoApartado: false, requeridoFormalizacion: true },
  { codigo: "DEPOE", titulo: "Comprobante depósito de enganche (DEPOE)", requeridoApartado: false, requeridoFormalizacion: true },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "scripts", "_output");
const OUT_JSON = join(OUT_DIR, "expedientes-gavia-inventory.json");
const OUT_MD = join(OUT_DIR, "expedientes-gavia-inventory.md");

const FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_PARAMS = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
};

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function normalizePrivateKey(raw) {
  let key = raw.trim();
  if (key.startsWith('"')) key = key.slice(1);
  else if (key.startsWith("'")) key = key.slice(1);
  key = key.replace(/\\n/g, "\n");
  key = key.replace(/["'],?\s*$/g, "").trim();
  return key;
}

function normalizeNameKey(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeDriveQueryValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function detectChecklistCodigo(fileName) {
  const upper = fileName.toUpperCase();
  const sorted = [...CHECKLIST].sort((a, b) => b.codigo.length - a.codigo.length);
  for (const item of sorted) {
    const code = item.codigo.toUpperCase();
    if (
      upper.startsWith(`${code}-`) ||
      upper.startsWith(`${code}_`) ||
      upper.startsWith(`${code} `) ||
      upper === code ||
      upper.includes(`_${code}_`) ||
      upper.includes(`-${code}-`)
    ) {
      return item.codigo;
    }
  }
  // Heurísticas suaves por nombre comercial
  if (/\bCURP\b/i.test(fileName)) return "CURP";
  if (/\bRFC\b/i.test(fileName)) return "RFC";
  if (/\b(INE|PASAPORTE|ID)\b/i.test(fileName)) return "ID";
  if (/domicilio|comprobante.*dom/i.test(fileName)) return "DOM";
  if (/oferta|carta.?oferta|\bOC\b/i.test(fileName)) return "OC";
  if (/cotiz|simulador/i.test(fileName)) return "SIMULADOR";
  if (/apartado|depoa/i.test(fileName)) return "DEPOA";
  if (/enganche|depoe/i.test(fileName)) return "DEPOE";
  if (/contrato/i.test(fileName)) return "CONTRATO";
  if (/nacimiento/i.test(fileName)) return "A_NAC";
  if (/matrimonio/i.test(fileName)) return "A_MAT";
  if (/estado.?de.?cuenta|edo.?cta/i.test(fileName)) return "EDO_CTA";
  if (/anexo.?a|datos.?generales/i.test(fileName)) return "ANEXO_A_DATOS";
  if (/anexo.?b|modalidad.?pago/i.test(fileName)) return "ANEXO_B_PAGO";
  if (/anexo.?c|especific/i.test(fileName)) return "ANEXO_C_ESPEC";
  if (/anexo.?d|mantenimiento/i.test(fileName)) return "ANEXO_D_MANT";
  if (/anexo.?e|lavado|pld/i.test(fileName)) return "ANEXO_E_PLD";
  if (/anexo.?f|privacidad/i.test(fileName)) return "ANEXO_F_PRIV";
  return null;
}

function getDriveClientReadonly() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!clientEmail || !privateKeyRaw) {
    throw new Error("Faltan GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.");
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: normalizePrivateKey(privateKeyRaw),
    // Solo lectura — no permite crear/editar/borrar
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

async function listAllChildren(drive, parentId) {
  const files = [];
  let pageToken;
  do {
    const { data } = await drive.files.list({
      q: `'${escapeDriveQueryValue(parentId)}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink)",
      pageSize: 200,
      pageToken,
      spaces: "drive",
      corpora: "allDrives",
      ...DRIVE_PARAMS,
    });
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  return files;
}

async function findChildFolderByNames(drive, parentId, candidates) {
  const wanted = new Set(candidates.map(normalizeNameKey).filter(Boolean));
  const children = await listAllChildren(drive, parentId);
  for (const file of children) {
    if (file.mimeType !== FOLDER_MIME || !file.id || !file.name) continue;
    if (wanted.has(normalizeNameKey(file.name))) {
      return file.id;
    }
  }
  return null;
}

async function listFilesRecursive(drive, folderId, depth = 0, maxDepth = 2) {
  const children = await listAllChildren(drive, folderId);
  const files = [];
  for (const child of children) {
    if (!child.id || !child.name) continue;
    if (child.mimeType === FOLDER_MIME) {
      files.push({
        id: child.id,
        name: child.name,
        mimeType: child.mimeType,
        kind: "folder",
        modifiedTime: child.modifiedTime ?? null,
        webViewLink: child.webViewLink ?? null,
      });
      if (depth < maxDepth) {
        const nested = await listFilesRecursive(drive, child.id, depth + 1, maxDepth);
        for (const n of nested) {
          files.push({ ...n, name: `${child.name}/${n.name}` });
        }
      }
    } else {
      files.push({
        id: child.id,
        name: child.name,
        mimeType: child.mimeType ?? null,
        kind: "file",
        size: child.size ? Number(child.size) : null,
        modifiedTime: child.modifiedTime ?? null,
        webViewLink: child.webViewLink ?? null,
        checklistCodigo: detectChecklistCodigo(child.name),
      });
    }
  }
  return files;
}

function buildCoverage(codigosPresentes) {
  const present = new Set(codigosPresentes);
  const apartadoReq = CHECKLIST.filter((i) => i.requeridoApartado);
  const formalReq = CHECKLIST.filter((i) => i.requeridoFormalizacion);
  const apartadoOk = apartadoReq.filter((i) => present.has(i.codigo));
  const formalOk = formalReq.filter((i) => present.has(i.codigo));
  return {
    apartado: {
      completados: apartadoOk.length,
      requeridos: apartadoReq.length,
      pct: apartadoReq.length ? Math.round((apartadoOk.length / apartadoReq.length) * 100) : 0,
      faltantes: apartadoReq.filter((i) => !present.has(i.codigo)).map((i) => i.codigo),
    },
    formalizacion: {
      completados: formalOk.length,
      requeridos: formalReq.length,
      pct: formalReq.length ? Math.round((formalOk.length / formalReq.length) * 100) : 0,
      faltantes: formalReq.filter((i) => !present.has(i.codigo)).map((i) => i.codigo),
    },
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# Inventario expedientes — Misión La Gavia`);
  lines.push("");
  lines.push(`Generado: ${report.generatedAt}`);
  lines.push(`Modo: **solo lectura** (Drive readonly + Supabase select)`);
  lines.push("");
  lines.push(`## Resumen`);
  lines.push("");
  lines.push(`- Operaciones activas (no canceladas / no Disponibles): **${report.summary.operaciones}**`);
  lines.push(`- Con carpeta Drive vinculada: **${report.summary.conDriveFolder}**`);
  lines.push(`- Sin carpeta Drive vinculada: **${report.summary.sinDriveFolder}**`);
  lines.push(`- Carpetas en Drive sin operación en Gabi: **${report.summary.carpetasHuerfanasDrive}**`);
  lines.push("");
  lines.push(`## Por operación`);
  lines.push("");

  for (const op of report.operaciones) {
    lines.push(`### ${op.unidadLabel} — ${op.clienteNombre}`);
    lines.push("");
    lines.push(`- Estatus: \`${op.estatusSembrado}\`${op.escriturado ? " · escriturado" : ""}`);
    lines.push(`- Operación: \`${op.id}\``);
    if (op.driveFolderUrl) {
      lines.push(`- Drive: ${op.driveFolderUrl}`);
    } else {
      lines.push(`- Drive: _(sin drive_folder_id)_`);
    }
    lines.push(
      `- Docs en Gabi (DB): **${op.gabiDocumentos.length}** · Archivos en Drive: **${op.driveFiles.filter((f) => f.kind === "file").length}**`,
    );
    lines.push(
      `- Apartado checklist: ${op.coverage.apartado.completados}/${op.coverage.apartado.requeridos} (${op.coverage.apartado.pct}%)`,
    );
    if (op.coverage.apartado.faltantes.length) {
      lines.push(`  - Faltan apartado: ${op.coverage.apartado.faltantes.join(", ")}`);
    }
    lines.push(
      `- Formalización checklist: ${op.coverage.formalizacion.completados}/${op.coverage.formalizacion.requeridos} (${op.coverage.formalizacion.pct}%)`,
    );
    if (op.coverage.formalizacion.faltantes.length) {
      lines.push(`  - Faltan formalización: ${op.coverage.formalizacion.faltantes.join(", ")}`);
    }
    if (op.driveFiles.filter((f) => f.kind === "file").length) {
      lines.push(`- Archivos Drive:`);
      for (const f of op.driveFiles.filter((f) => f.kind === "file")) {
        const tag = f.checklistCodigo ? ` \`${f.checklistCodigo}\`` : "";
        lines.push(`  - ${f.name}${tag}`);
      }
    }
    if (op.gabiDocumentos.length) {
      lines.push(`- Registrados en Gabi:`);
      for (const d of op.gabiDocumentos) {
        lines.push(`  - \`${d.checklist_codigo}\` (${d.tipo ?? "—"})`);
      }
    }
    lines.push("");
  }

  if (report.carpetasHuerfanas.length) {
    lines.push(`## Carpetas en Drive sin operación vinculada`);
    lines.push("");
    for (const folder of report.carpetasHuerfanas) {
      lines.push(`- **${folder.name}** (${folder.fileCount} archivos)`);
      for (const f of folder.files.slice(0, 30)) {
        lines.push(`  - ${f.name}${f.checklistCodigo ? ` \`${f.checklistCodigo}\`` : ""}`);
      }
      if (folder.files.length > 30) {
        lines.push(`  - … +${folder.files.length - 30} más`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  console.log("Inventario expedientes Gavia — SOLO LECTURA");
  console.log("No se creará, modificará ni borrará ningún archivo.\n");

  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const rootFolderId = process.env.GOOGLE_DRIVE_MISION_LA_GAVIA_FOLDER_ID?.trim();

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!rootFolderId) {
    throw new Error("Falta GOOGLE_DRIVE_MISION_LA_GAVIA_FOLDER_ID.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const drive = getDriveClientReadonly();

  console.log("1/4 Leyendo operaciones en Supabase…");
  const { data: operaciones, error: opError } = await supabase
    .from("operaciones_comerciales")
    .select(
      "id, desarrollo_id, cliente_nombre, estatus_sembrado, escriturado, unidad_id, updated_at, enganche_cubierto, persona_moral, drive_folder_id, cancelada",
    )
    .eq("desarrollo_id", DESARROLLO_ID)
    .eq("cancelada", false)
    .neq("estatus_sembrado", "Disponibles")
    .order("updated_at", { ascending: false });

  if (opError) throw new Error(opError.message);

  const ops = operaciones ?? [];
  const unidadIds = [...new Set(ops.map((o) => o.unidad_id).filter(Boolean))];
  const { data: unidades, error: uError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad")
    .in("id", unidadIds.length ? unidadIds : ["00000000-0000-0000-0000-000000000000"]);
  if (uError) throw new Error(uError.message);
  const unidadById = new Map((unidades ?? []).map((u) => [u.id, u.unidad]));

  const opIds = ops.map((o) => o.id);
  const { data: documentos, error: dError } = await supabase
    .from("expediente_documentos")
    .select("operacion_id, checklist_codigo, tipo, nombre_archivo, drive_file_id")
    .in("operacion_id", opIds.length ? opIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("activo", true);
  if (dError) throw new Error(dError.message);

  const docsByOp = new Map();
  for (const doc of documentos ?? []) {
    const list = docsByOp.get(doc.operacion_id) ?? [];
    list.push(doc);
    docsByOp.set(doc.operacion_id, list);
  }

  console.log("2/4 Resolviendo carpeta «3. Expediente Clientes» (sin crear)…");
  const { data: rootMeta } = await drive.files.get({
    fileId: rootFolderId,
    fields: "id,name",
    ...DRIVE_PARAMS,
  });
  console.log(`   Raíz Drive: ${rootMeta.name} (${rootMeta.id})`);

  const expedientesFolderId =
    (await findChildFolderByNames(drive, rootFolderId, EXPEDIENTES_ALIASES)) ?? rootFolderId;
  if (expedientesFolderId === rootFolderId) {
    console.warn(
      `   Aviso: no se encontró «${EXPEDIENTES_SUBFOLDER}»; se listará la raíz (solo lectura).`,
    );
  } else {
    console.log(`   Subcarpeta expedientes encontrada.`);
  }

  const driveClientFolders = (await listAllChildren(drive, expedientesFolderId)).filter(
    (f) => f.mimeType === FOLDER_MIME && f.id && f.name,
  );
  console.log(`   Carpetas cliente en Drive: ${driveClientFolders.length}`);

  console.log("3/4 Listando archivos por operación (solo lectura)…");
  const linkedFolderIds = new Set(
    ops.map((o) => o.drive_folder_id).filter(Boolean),
  );

  const operacionesReport = [];
  for (const op of ops) {
    const gabiDocumentos = docsByOp.get(op.id) ?? [];
    let driveFiles = [];
    let driveError = null;
    if (op.drive_folder_id) {
      try {
        driveFiles = await listFilesRecursive(drive, op.drive_folder_id, 0, 2);
      } catch (err) {
        driveError = err instanceof Error ? err.message : String(err);
      }
    }

    const codigos = new Set([
      ...gabiDocumentos.map((d) => d.checklist_codigo).filter(Boolean),
      ...driveFiles
        .filter((f) => f.kind === "file" && f.checklistCodigo)
        .map((f) => f.checklistCodigo),
    ]);

    operacionesReport.push({
      id: op.id,
      clienteNombre: op.cliente_nombre,
      unidadLabel: unidadById.get(op.unidad_id) ?? op.unidad_id ?? "—",
      estatusSembrado: op.estatus_sembrado,
      escriturado: Boolean(op.escriturado),
      engancheCubierto: Boolean(op.enganche_cubierto),
      personaMoral: Boolean(op.persona_moral),
      driveFolderId: op.drive_folder_id,
      driveFolderUrl: op.drive_folder_id
        ? `https://drive.google.com/drive/folders/${op.drive_folder_id}`
        : null,
      driveError,
      gabiDocumentos,
      driveFiles,
      coverage: buildCoverage(codigos),
      updatedAt: op.updated_at,
    });
  }

  console.log("4/4 Detectando carpetas huérfanas en Drive…");
  const carpetasHuerfanas = [];
  for (const folder of driveClientFolders) {
    if (linkedFolderIds.has(folder.id)) continue;
    let files = [];
    try {
      files = (await listFilesRecursive(drive, folder.id, 0, 1)).filter(
        (f) => f.kind === "file",
      );
    } catch {
      files = [];
    }
    carpetasHuerfanas.push({
      id: folder.id,
      name: folder.name,
      url: `https://drive.google.com/drive/folders/${folder.id}`,
      fileCount: files.length,
      files,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "readonly",
    desarrolloId: DESARROLLO_ID,
    driveRoot: { id: rootMeta.id, name: rootMeta.name },
    expedientesFolderId,
    summary: {
      operaciones: operacionesReport.length,
      conDriveFolder: operacionesReport.filter((o) => o.driveFolderId).length,
      sinDriveFolder: operacionesReport.filter((o) => !o.driveFolderId).length,
      carpetasHuerfanasDrive: carpetasHuerfanas.length,
    },
    operaciones: operacionesReport,
    carpetasHuerfanas,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(OUT_MD, toMarkdown(report), "utf8");

  console.log("\nListo (sin cambios en Drive/Supabase).");
  console.log(`JSON: ${OUT_JSON}`);
  console.log(`MD:   ${OUT_MD}`);
  console.log(
    `Ops: ${report.summary.operaciones} · con Drive: ${report.summary.conDriveFolder} · huérfanas: ${report.summary.carpetasHuerfanasDrive}`,
  );
}

main().catch((err) => {
  console.error("\nError:", err instanceof Error ? err.message : err);
  process.exit(1);
});
