import type { AdminProfile } from "@/lib/admin/types";
import { assertDesarrolloAccess, filterDesarrollosForAdmin } from "@/lib/admin/permissions";
import { syncProspectoFromVisita } from "@/lib/admin/prospectos-service";
import { completeCadenciaForProspecto } from "@/lib/comercial/cadencia-service";
import { isComplianceServerEnforced } from "@/lib/comercial/crm-compliance-config";
import { getRecorridoComplianceGate } from "@/lib/comercial/crm-compliance-service";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { VisitaInput, VisitaRecord, VisitasResumen } from "@/lib/visitas/types";

export type VisitaInsertResult = {
  visita: VisitaRecord;
  prospectoId: string | null;
};

const toRecord = (row: {
  id: string;
  tipo: string;
  desarrollo_id: string;
  asesor_id: string;
  asesor_nombre: string | null;
  cliente_nombre: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  medio_contacto: string | null;
  cluster_id: string | null;
  cluster_nombre: string | null;
  prototipo_id: string | null;
  prototipo_nombre: string | null;
  precio_final: number | null;
  etapa_alcanzada: number | null;
  crm_status: string | null;
  crm_id: string | null;
  occurred_at: string;
}): VisitaRecord => ({
  id: row.id,
  tipo: row.tipo as VisitaRecord["tipo"],
  desarrolloId: row.desarrollo_id,
  asesorId: row.asesor_id,
  asesorNombre: row.asesor_nombre,
  clienteNombre: row.cliente_nombre,
  clienteEmail: row.cliente_email,
  clienteTelefono: row.cliente_telefono,
  medioContacto: row.medio_contacto,
  clusterId: row.cluster_id,
  clusterNombre: row.cluster_nombre,
  prototipoId: row.prototipo_id,
  prototipoNombre: row.prototipo_nombre,
  precioFinal: row.precio_final != null ? Number(row.precio_final) : null,
  etapaAlcanzada: row.etapa_alcanzada,
  crmStatus: row.crm_status,
  crmId: row.crm_id,
  occurredAt: row.occurred_at,
});

export const validateAsesorForVisita = async (
  asesorId: string,
  desarrolloId: string,
): Promise<{ ok: true; nombre: string } | { ok: false; reason: string }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, reason: "Supabase no configurado." };
  }

  const { data, error } = await supabase
    .from("asesores")
    .select("id, nombre, activo, desarrollos_ids")
    .eq("id", asesorId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "Asesor no encontrado." };
  }

  if (!data.activo) {
    return { ok: false, reason: "Asesor inactivo." };
  }

  const desarrollosIds = (data.desarrollos_ids ?? []) as string[];
  if (!desarrollosIds.includes(desarrolloId)) {
    return { ok: false, reason: "Asesor sin acceso al desarrollo." };
  }

  return { ok: true, nombre: data.nombre as string };
};

export const insertVisita = async (input: VisitaInput): Promise<VisitaInsertResult | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const validation = await validateAsesorForVisita(input.asesorId, input.desarrolloId);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  if (
    isComplianceServerEnforced() &&
    (input.tipo === "recorrido_completado" || input.tipo === "lead_registrado")
  ) {
    const gate = await getRecorridoComplianceGate(input.asesorId, input.desarrolloId);
    if (gate.shouldBlock) {
      throw new Error(gate.message);
    }
  }

  const { data, error } = await supabase
    .from("visitas_comerciales")
    .insert({
      tipo: input.tipo,
      desarrollo_id: input.desarrolloId,
      asesor_id: input.asesorId,
      asesor_nombre: input.asesorNombre ?? validation.nombre,
      cliente_nombre: input.clienteNombre ?? null,
      cliente_email: input.clienteEmail ?? null,
      cliente_telefono: input.clienteTelefono ?? null,
      medio_contacto: input.medioContacto ?? null,
      cluster_id: input.clusterId ?? null,
      cluster_nombre: input.clusterNombre ?? null,
      prototipo_id: input.prototipoId ?? null,
      prototipo_nombre: input.prototipoNombre ?? null,
      precio_final: input.precioFinal ?? null,
      etapa_alcanzada: input.etapaAlcanzada ?? null,
      crm_status: input.crmStatus ?? null,
      crm_id: input.crmId ?? null,
      payload: input.payload ?? null,
      occurred_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo registrar la visita.");
  }

  const visita = toRecord(data);

  let prospectoId: string | null = null;
  try {
    const prospecto = await syncProspectoFromVisita({
      visitaId: visita.id,
      tipo: input.tipo,
      desarrolloId: input.desarrolloId,
      asesorId: input.asesorId,
      clienteNombre: input.clienteNombre,
      clienteEmail: input.clienteEmail,
      clienteTelefono: input.clienteTelefono,
      medioContacto: input.medioContacto,
    });
    prospectoId = prospecto?.id ?? null;
    if (prospectoId && input.tipo === "recorrido_completado") {
      try {
        await completeCadenciaForProspecto(prospectoId, "Recorrido completado en GABI");
      } catch {
        // no bloquear registro de visita
      }
      try {
        await supabase.from("prospecto_playbook_progress").upsert(
          {
            prospecto_id: prospectoId,
            step_id: "recorrido",
            completed_at: new Date().toISOString(),
            completed_by: input.asesorId,
          },
          { onConflict: "prospecto_id,step_id" },
        );
      } catch {
        // no bloquear registro de visita
      }
    }
  } catch (syncError) {
    console.error("No se pudo sincronizar prospecto desde visita:", syncError);
  }

  return { visita, prospectoId };
};

export const getVisitasResumen = async (
  profile: AdminProfile,
  params: { desarrolloId: string; days?: number },
): Promise<VisitasResumen> => {
  assertDesarrolloAccess(profile, params.desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const days = params.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("visitas_comerciales")
    .select("*")
    .eq("desarrollo_id", params.desarrolloId)
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map(toRecord);
  const leads = rows.filter((row) => row.tipo === "lead_registrado").length;
  const recorridosCompletados = rows.filter(
    (row) => row.tipo === "recorrido_completado",
  ).length;
  const crmSincronizados = rows.filter((row) => row.crmStatus === "synced").length;

  const asesorCounts = new Map<string, { nombre: string; count: number }>();
  rows.forEach((row) => {
    const current = asesorCounts.get(row.asesorId) ?? {
      nombre: row.asesorNombre ?? row.asesorId,
      count: 0,
    };
    current.count += 1;
    asesorCounts.set(row.asesorId, current);
  });

  const porAsesor = Array.from(asesorCounts.entries())
    .map(([asesorId, item]) => ({
      asesorId,
      asesorNombre: item.nombre,
      count: item.count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    leads,
    recorridosCompletados,
    total: rows.length,
    crmSincronizados,
    porAsesor,
    recientes: rows.slice(0, 25),
  };
};

export const filterDesarrolloIdsForVisitas = (
  desarrolloIds: string[],
  profile: AdminProfile,
) => {
  const items = desarrolloIds.map((id) => ({ id }));
  return filterDesarrollosForAdmin(items, profile).map((item) => item.id);
};
