import {
  createProspecto,
  findProspectoByContact,
  findProspectoByTelefonoInDesarrollo,
  getProspectoById,
  getProspectosResumen,
  listProspectos,
  upsertProspectoFromVisita,
  type ProspectoDetail,
  type ProspectosResumen,
  type ProspectoListRow,
} from "@/lib/admin/prospectos-service";
import { listPartners } from "@/lib/admin/partners-service";
import {
  isProspectoEtapa,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import {
  buildProspectoTelefonoDuplicadoMessage,
  normalizeProspectoTelefono,
  validateProspectoTelefono,
} from "@/lib/comercial/prospecto-telefono";
import {
  bootstrapCadenciaForProspecto,
  pauseCadenciaForProspecto,
} from "@/lib/comercial/cadencia-service";
import {
  PARTNER_OTRO,
  resolveMedioPublicitarioFromProspecto,
} from "@/lib/comercial/apartado-form-options";
import { validatePlaybookEtapaChange } from "@/lib/comercial/crm-playbook-service";
import {
  calificacionFromMotivoDescarte,
  validateMotivoDescarteForPerdido,
} from "@/lib/comercial/motivo-descarte";
import { normalizeProximoContactoOn } from "@/lib/comercial/proximo-contacto";
import { appendProspectoNota } from "@/lib/comercial/prospecto-notas-historial";
import { ETAPAS_ASESOR } from "@/lib/asesores/prospectos-client";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  isLeadershipAsesorId,
  loadAsesorSessionOrThrow,
  resolveGerenteAsesorIdForDesarrollo,
  resolveProspectoAsesorFilter,
} from "@/lib/asesores/leadership-access";
import { isLeadershipAsesorRol } from "@/lib/asesores/types";
import { validateAsesorForVisita } from "@/lib/visitas/service";

const MEDIO_ALIANZA = "inmobiliaria-externo";

export const assertAsesorDesarrollo = async (asesorId: string, desarrolloId: string) => {
  const validation = await validateAsesorForVisita(asesorId, desarrolloId);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }
};

const assertProspectoAccess = async (prospecto: ProspectoDetail, asesorId: string) => {
  if (prospecto.desarrollo_id) {
    await assertAsesorDesarrollo(asesorId, prospecto.desarrollo_id);
  }

  const isLeadership = await isLeadershipAsesorId(asesorId);
  if (!isLeadership && prospecto.asesor_id !== asesorId) {
    throw new Error("Este prospecto no está asignado a ti.");
  }
};

export const listProspectosForAsesor = async (
  asesorId: string,
  filters: {
    desarrolloId: string;
    etapa?: string;
    search?: string;
    desde?: string;
    hasta?: string;
    /** Solo gerencia: acotar a un asesor del equipo (o `__sin__` sin asignar). */
    filterAsesorId?: string;
  },
): Promise<ProspectoListRow[]> => {
  await assertAsesorDesarrollo(asesorId, filters.desarrolloId);
  const scopeFilter = await resolveProspectoAsesorFilter(asesorId);
  const { filterAsesorId, ...rest } = filters;

  let asesorScope: string | undefined = scopeFilter;
  if (!scopeFilter && filterAsesorId) {
    if (filterAsesorId === "__sin__") {
      return listProspectos(
        { ...rest, fechaEn: "updated", sinAsesor: true },
      );
    }
    if (filterAsesorId === "__inactivos__") {
      return listProspectos(
        { ...rest, fechaEn: "updated", asesorInactivo: true },
      );
    }
    asesorScope = filterAsesorId;
  }

  return listProspectos(
    { ...rest, ...(asesorScope ? { asesorId: asesorScope } : {}), fechaEn: "updated" },
  );
};

export const getProspectosResumenForAsesor = async (
  asesorId: string,
  desarrolloId: string,
  filters?: {
    search?: string;
    desde?: string;
    hasta?: string;
    filterAsesorId?: string;
  },
): Promise<ProspectosResumen> => {
  await assertAsesorDesarrollo(asesorId, desarrolloId);
  const scopeFilter = await resolveProspectoAsesorFilter(asesorId);
  const { filterAsesorId, ...rest } = filters ?? {};

  let asesorScope: string | undefined = scopeFilter;
  if (!scopeFilter && filterAsesorId === "__sin__") {
    return getProspectosResumen(desarrolloId, undefined, {
      ...rest,
      sinAsesor: true,
      fechaEn: "updated",
    });
  }
  if (!scopeFilter && filterAsesorId === "__inactivos__") {
    return getProspectosResumen(desarrolloId, undefined, {
      ...rest,
      asesorInactivo: true,
      fechaEn: "updated",
    });
  }
  if (!scopeFilter && filterAsesorId) {
    asesorScope = filterAsesorId;
  }

  return getProspectosResumen(desarrolloId, undefined, {
    ...(asesorScope ? { asesorId: asesorScope } : {}),
    ...rest,
    fechaEn: "updated",
  });
};

export const getProspectoForAsesor = async (
  asesorId: string,
  prospectoId: string,
): Promise<ProspectoDetail> => {
  const prospecto = await getProspectoById(prospectoId);
  if (!prospecto) {
    throw new Error("Prospecto no encontrado.");
  }

  await assertProspectoAccess(prospecto, asesorId);
  return prospecto;
};

export type AsesorCreateProspectoInput = {
  desarrolloId: string;
  nombre: string;
  email?: string;
  telefono?: string;
  medioContacto?: string;
  partnerId?: string;
  /** Nombre libre cuando el aliado no está en el catálogo (partnerId = PARTNER_OTRO). */
  partnerNombre?: string;
  notas?: string;
};

export type AsesorUpdateProspectoInput = {
  etapa?: string;
  notas?: string;
  assignedAsesorId?: string | null;
  motivoDescarte?: string | null;
  motivoDescarteDetalle?: string | null;
  /** Fecha AAAA-MM-DD o null para quitar el recordatorio. */
  proximoContactoOn?: string | null;
  proximoContactoNota?: string | null;
  /** Nombre completo del contacto (incluye apellidos). */
  nombre?: string;
  email?: string | null;
  telefono?: string;
};

export const checkProspectoTelefonoForAsesor = async (
  asesorId: string,
  desarrolloId: string,
  telefono: string,
) => {
  await assertAsesorDesarrollo(asesorId, desarrolloId);

  const validation = validateProspectoTelefono(telefono);
  if (!validation.ok) {
    return { valid: false as const, error: validation.error };
  }

  const duplicate = await findProspectoByTelefonoInDesarrollo(desarrolloId, validation.telefono);
  if (!duplicate) {
    return { valid: true as const, telefono: validation.telefono };
  }

  const mismoAsesor = duplicate.prospecto.asesor_id === asesorId;
  return {
    valid: false as const,
    duplicate: true as const,
    telefono: validation.telefono,
    prospectoId: duplicate.prospecto.id,
    prospectoNombre: duplicate.prospecto.nombre,
    asesorNombre: duplicate.asesorNombre,
    error: buildProspectoTelefonoDuplicadoMessage({
      prospectoNombre: duplicate.prospecto.nombre,
      asesorNombre: duplicate.asesorNombre,
      mismoAsesor,
    }),
  };
};

export const createProspectoForAsesor = async (
  asesorId: string,
  input: AsesorCreateProspectoInput,
): Promise<ProspectoDetail & { asignadoAGerencia?: boolean }> => {
  await assertAsesorDesarrollo(asesorId, input.desarrolloId);

  const nombre = input.nombre.trim();
  if (!nombre) {
    throw new Error("Nombre requerido.");
  }

  const telefonoValidation = validateProspectoTelefono(input.telefono);
  if (!telefonoValidation.ok) {
    throw new Error(telefonoValidation.error);
  }

  const telefono = telefonoValidation.telefono;
  const email = input.email?.trim();
  const medioContacto = input.medioContacto?.trim();
  const esAlianza = medioContacto === MEDIO_ALIANZA;
  const medioPublicitario = resolveMedioPublicitarioFromProspecto({
    medio_contacto: medioContacto,
  });

  let partnerId: string | undefined;
  let partnerNombre: string | undefined;
  if (esAlianza) {
    const partnerIdRaw = input.partnerId?.trim();
    const partnerNombreRaw = input.partnerNombre?.trim();
    if (!partnerIdRaw && !partnerNombreRaw) {
      throw new Error("Indica qué inmobiliaria o asesor externo trajo el lead.");
    }
    if (partnerIdRaw === PARTNER_OTRO || (!partnerIdRaw && partnerNombreRaw)) {
      if (!partnerNombreRaw) {
        throw new Error("Escribe el nombre de la inmobiliaria o asesor externo.");
      }
      partnerId = undefined;
      partnerNombre = partnerNombreRaw;
    } else {
      if (!partnerIdRaw) {
        throw new Error("Indica qué inmobiliaria o asesor externo trajo el lead.");
      }
      const partners = await listPartners({
        desarrolloId: input.desarrolloId,
        activoOnly: true,
      });
      const partner = partners.find((row) => row.id === partnerIdRaw);
      if (!partner) {
        throw new Error(
          "Aliado no válido o inactivo. Elige uno del catálogo o usa «Otra» para capturar el nombre.",
        );
      }
      partnerId = partner.id;
      partnerNombre = partner.nombre;
    }
  }

  const duplicate = await findProspectoByTelefonoInDesarrollo(input.desarrolloId, telefono);
  if (duplicate) {
    throw new Error(
      buildProspectoTelefonoDuplicadoMessage({
        prospectoNombre: duplicate.prospecto.nombre,
        asesorNombre: duplicate.asesorNombre,
        mismoAsesor: duplicate.prospecto.asesor_id === asesorId,
      }),
    );
  }

  const creatorSession = await loadAsesorSessionOrThrow(asesorId);
  const creatorIsLeadership = isLeadershipAsesorRol(creatorSession.rol);
  let assignedAsesorId = asesorId;
  let asignadoAGerencia = false;
  let asignadoPor: string | undefined;

  // Dirección (y alianzas de asesores de campo) no cargan cartera propia:
  // el seguimiento queda con gerencia del desarrollo.
  const routeToGerencia =
    creatorSession.rol === "director" || (esAlianza && !creatorIsLeadership);

  if (esAlianza) {
    asignadoPor = "alianza-inmobiliaria";
  }

  if (routeToGerencia) {
    const gerenteId = await resolveGerenteAsesorIdForDesarrollo(input.desarrolloId);
    if (gerenteId && gerenteId !== asesorId) {
      assignedAsesorId = gerenteId;
      asignadoAGerencia = true;
      if (creatorSession.rol === "director" && !asignadoPor) {
        asignadoPor = "direccion-bbr";
      }
    }
  }

  let existingByEmail = null;
  if (email) {
    existingByEmail = await findProspectoByContact(input.desarrolloId, email);
    if (
      existingByEmail?.asesor_id &&
      existingByEmail.asesor_id !== asesorId &&
      existingByEmail.asesor_id !== assignedAsesorId
    ) {
      throw new Error("Ya existe un prospecto con ese email asignado a otro asesor.");
    }
  }

  const prospectoInput = {
    desarrolloId: input.desarrolloId,
    nombre,
    email,
    telefono,
    medioContacto,
    medioPublicitario: medioPublicitario || undefined,
    asesorId: assignedAsesorId,
    partnerId,
    promotorNombre: partnerNombre,
    equipoVenta: esAlianza ? "Externo" : undefined,
    asignadoPor,
    etapa: "nuevo" as const,
    notas: input.notas?.trim(),
  };

  const record =
    email && existingByEmail
      ? await upsertProspectoFromVisita(prospectoInput)
      : await createProspecto(prospectoInput);

  if (record.etapa === "nuevo") {
    try {
      await bootstrapCadenciaForProspecto(record.id);
    } catch {
      // no bloquear alta manual
    }
  }

  if (asignadoAGerencia) {
    const detail = await getProspectoById(record.id);
    if (!detail) {
      throw new Error("Prospecto creado pero no se pudo cargar.");
    }
    return { ...detail, asignadoAGerencia: true };
  }

  const detail = await getProspectoForAsesor(asesorId, record.id);
  return { ...detail, asignadoAGerencia: false };
};

export const updateProspectoForAsesor = async (
  asesorId: string,
  prospectoId: string,
  input: AsesorUpdateProspectoInput,
): Promise<ProspectoDetail> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await getProspectoForAsesor(asesorId, prospectoId);
  const etapaBloqueada = existing.etapa === "apartado" || existing.etapa === "vendido";

  if (input.etapa !== undefined) {
    if (etapaBloqueada) {
      throw new Error("Este cliente ya está en apartado o vendido. Solo puedes actualizar notas.");
    }
    if (!isProspectoEtapa(input.etapa) || !ETAPAS_ASESOR.includes(input.etapa)) {
      throw new Error("Etapa no permitida para asesor.");
    }
    await validatePlaybookEtapaChange(existing, input.etapa);
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.etapa !== undefined) {
    patch.etapa = input.etapa;
  }
  if (input.notas !== undefined) {
    patch.notas = input.notas.trim() || null;
  }
  if (input.proximoContactoOn !== undefined) {
    patch.proximo_contacto_on = normalizeProximoContactoOn(input.proximoContactoOn);
  }
  if (input.proximoContactoNota !== undefined) {
    patch.proximo_contacto_nota = input.proximoContactoNota?.trim() || null;
  }
  if (input.nombre !== undefined) {
    const nombre = input.nombre.trim();
    if (!nombre) {
      throw new Error("El nombre es obligatorio.");
    }
    patch.nombre = nombre;
  }
  if (input.email !== undefined) {
    patch.email = input.email?.trim() || null;
  }
  if (input.telefono !== undefined) {
    const telefonoValidation = validateProspectoTelefono(input.telefono);
    if (!telefonoValidation.ok) {
      throw new Error(telefonoValidation.error);
    }
    const telefono = telefonoValidation.telefono;
    const telefonoActual = normalizeProspectoTelefono(existing.telefono);
    if (telefono !== telefonoActual) {
      const duplicate = await findProspectoByTelefonoInDesarrollo(
        existing.desarrollo_id,
        telefono,
      );
      if (duplicate && duplicate.prospecto.id !== prospectoId) {
        throw new Error(
          buildProspectoTelefonoDuplicadoMessage({
            prospectoNombre: duplicate.prospecto.nombre,
            asesorNombre: duplicate.asesorNombre,
            mismoAsesor: duplicate.prospecto.asesor_id === asesorId,
          }),
        );
      }
    }
    patch.telefono = telefono;
  }

  const nextEtapa = (input.etapa ?? existing.etapa) as string;
  if (nextEtapa === "perdido") {
    const motivoValidation = validateMotivoDescarteForPerdido({
      motivoDescarte:
        input.motivoDescarte !== undefined
          ? input.motivoDescarte
          : existing.motivo_descarte,
      motivoDescarteDetalle:
        input.motivoDescarteDetalle !== undefined
          ? input.motivoDescarteDetalle
          : existing.motivo_descarte_detalle,
    });
    if (!motivoValidation.ok) {
      throw new Error(motivoValidation.error);
    }
    patch.motivo_descarte = motivoValidation.motivoDescarte;
    patch.motivo_descarte_detalle = motivoValidation.motivoDescarteDetalle;
    patch.calificacion = calificacionFromMotivoDescarte(motivoValidation.motivoDescarte);
    patch.es_spam = motivoValidation.motivoDescarte === "datos_falsos";
    // Fuera de la bandeja activa: no debe seguir en recontacto ni cadencia.
    patch.proximo_contacto_on = null;
    patch.proximo_contacto_nota = null;
  } else if (input.etapa !== undefined && existing.etapa === "perdido") {
    const isLeadership = await isLeadershipAsesorId(asesorId);
    if (!isLeadership) {
      throw new Error("Solo gerencia o dirección puede rescatar leads descartados.");
    }
    patch.motivo_descarte = null;
    patch.motivo_descarte_detalle = null;
    const destino = prospectoEtapaLabel[input.etapa as ProspectoEtapa] ?? input.etapa;
    const baseNotas = input.notas !== undefined ? input.notas : existing.notas;
    patch.notas = appendProspectoNota(baseNotas, `Rescatado del descarte → ${destino}`);
  }

  if (input.assignedAsesorId !== undefined) {
    const canReassign = await isLeadershipAsesorId(asesorId);
    if (!canReassign) {
      throw new Error("No tienes permiso para reasignar prospectos.");
    }

    const nextAsesorId = input.assignedAsesorId?.trim() || null;
    if (nextAsesorId) {
      await assertAsesorDesarrollo(nextAsesorId, existing.desarrollo_id);
    }

    patch.asesor_id = nextAsesorId;
    patch.asignado_por = "manual-gerente";
  }

  const { error } = await supabase.from("prospectos").update(patch).eq("id", prospectoId);
  if (error) {
    throw new Error(error.message);
  }

  if (input.etapa !== undefined && input.etapa !== existing.etapa) {
    if (input.etapa === "perdido" || input.etapa === "cancelado") {
      await pauseCadenciaForProspecto(prospectoId, `Etapa cambiada a ${input.etapa}`);
    } else if (existing.etapa === "nuevo" && input.etapa !== "nuevo") {
      await pauseCadenciaForProspecto(prospectoId, `Prospecto avanzó a ${input.etapa}`);
    }
  }

  return getProspectoForAsesor(asesorId, prospectoId);
};

export {
  ETAPAS_ASESOR,
  ETAPA_RESCATE_DEFAULT,
  prospectoAsesorPuedeCotizarOSolicitarApartado,
  prospectoEtapaEditableByAsesor,
} from "@/lib/asesores/prospectos-client";
