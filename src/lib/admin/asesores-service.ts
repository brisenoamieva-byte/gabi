import {
  assertDesarrollosSubset,
  canAccessDesarrollo,
  isSuperAdmin,
} from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  getDesarrolloIdsForComercializador,
  resolveComercializadorFromDesarrollos,
} from "@/lib/asesores/comercializadora";
import { generatePin } from "@/lib/asesores/pin-utils";
import { hashPin, verifyPin } from "@/lib/asesores/pin-server";
import type { AsesorInput, AsesorRecord, AsesorRol, AsesorUpdateInput } from "@/lib/asesores/types";
import { isGerenteCreatableAsesorRol } from "@/lib/asesores/types";
import {
  applyCoordinadorAdminPolicy,
  syncCoordinadorAdminAccess,
  type CoordinadorAdminSync,
} from "@/lib/admin/coordinador-admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type AsesorRow = {
  id: string;
  nombre: string;
  email: string;
  pin_hash: string;
  rol: AsesorRol;
  activo: boolean;
  desarrollos_ids: string[];
  created_at: string;
  updated_at: string;
};

const toRecord = (row: AsesorRow): AsesorRecord => ({
  id: row.id,
  nombre: row.nombre,
  email: row.email,
  rol: row.rol,
  activo: row.activo,
  desarrollosIds: row.desarrollos_ids ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const assertCanManageAsesor = (profile: AdminProfile, desarrollosIds: string[]) => {
  if (isSuperAdmin(profile)) {
    return;
  }

  if (!desarrollosIds.length) {
    throw new Error("Selecciona el desarrollo para este acceso.");
  }

  assertDesarrollosSubset(profile, desarrollosIds);
};

const assertGerenteCanAssignRol = (profile: AdminProfile, rol: AsesorRol) => {
  if (isSuperAdmin(profile)) {
    return;
  }

  if (profile.rol === "gerente" && !isGerenteCreatableAsesorRol(rol)) {
    throw new Error(
      "Como gerente comercial solo puedes crear asesores o coordinadores del desarrollo.",
    );
  }
};

const normalizeCreateInput = (profile: AdminProfile, input: AsesorInput): AsesorInput => {
  if (isSuperAdmin(profile)) {
    return input;
  }

  if (profile.rol === "gerente") {
    if (input.desarrollosIds.length !== 1) {
      throw new Error("Selecciona un solo desarrollo para el nuevo acceso.");
    }

    if (!isGerenteCreatableAsesorRol(input.rol)) {
      throw new Error(
        "Como gerente comercial solo puedes crear asesores o coordinadores del desarrollo.",
      );
    }

    return input;
  }

  return input;
};

const fetchPinHashesForComercializadora = async (
  comercializador: string,
  excludeAsesorId?: string,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [] as Array<{ id: string; pin_hash: string; desarrollos_ids: string[] }>;
  }

  const desarrolloIds = getDesarrolloIdsForComercializador(comercializador);
  if (!desarrolloIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("asesores")
    .select("id, pin_hash, desarrollos_ids")
    .eq("activo", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((row) => {
    if (excludeAsesorId && row.id === excludeAsesorId) {
      return false;
    }

    const ids = (row.desarrollos_ids ?? []) as string[];
    return ids.some((id) => desarrolloIds.includes(id));
  }) as Array<{ id: string; pin_hash: string; desarrollos_ids: string[] }>;
};

const pinIsUsedInComercializadora = async (
  comercializador: string,
  pin: string,
  excludeAsesorId?: string,
) => {
  const rows = await fetchPinHashesForComercializadora(comercializador, excludeAsesorId);
  return rows.some((row) => verifyPin(pin, row.pin_hash));
};

export const generateUniquePinForComercializadora = async (
  comercializador: string,
  excludeAsesorId?: string,
) => {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const pin = generatePin();
    if (!(await pinIsUsedInComercializadora(comercializador, pin, excludeAsesorId))) {
      return pin;
    }
  }

  throw new Error(
    `No hay PINs disponibles para ${comercializador}. Desactiva accesos viejos o contacta a gabi.`,
  );
};

const resolvePinForDesarrollos = async (
  desarrollosIds: string[],
  excludeAsesorId?: string,
) => {
  const comercializador = resolveComercializadorFromDesarrollos(desarrollosIds);
  if (!comercializador) {
    throw new Error("No se pudo determinar la comercializadora del desarrollo.");
  }

  return generateUniquePinForComercializadora(comercializador, excludeAsesorId);
};

const suggestId = (email: string) =>
  email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "asesor";

export const listAsesores = async (
  filters: { desarrolloId?: string; includeInactive?: boolean },
  profile?: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (profile && filters.desarrolloId && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  let query = supabase
    .from("asesores")
    .select("id, nombre, email, rol, activo, desarrollos_ids, created_at, updated_at")
    .order("nombre", { ascending: true });

  if (!filters.includeInactive) {
    query = query.eq("activo", true);
  }

  if (filters.desarrolloId) {
    query = query.contains("desarrollos_ids", [filters.desarrolloId]);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []) as Omit<AsesorRow, "pin_hash">[];

  if (profile && !isSuperAdmin(profile)) {
    rows = rows.filter((row) =>
      row.desarrollos_ids.every((id) => profile.desarrollosIds.includes(id)),
    );
  }

  return rows.map((row) => toRecord({ ...row, pin_hash: "" }));
};

export const getAsesorById = async (id: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("asesores")
    .select("id, nombre, email, rol, activo, desarrollos_ids, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return toRecord({ ...(data as Omit<AsesorRow, "pin_hash">), pin_hash: "" });
};

export const createAsesor = async (profile: AdminProfile, input: AsesorInput) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const normalized = normalizeCreateInput(profile, input);
  assertCanManageAsesor(profile, normalized.desarrollosIds);
  assertGerenteCanAssignRol(profile, normalized.rol);

  const pin = await resolvePinForDesarrollos(normalized.desarrollosIds);

  const baseId = input.id?.trim() || suggestId(input.email);
  let id = baseId;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: existing } = await supabase.from("asesores").select("id").eq("id", id).maybeSingle();
    if (!existing) {
      break;
    }
    id = `${baseId}-${attempt + 2}`;
  }

  const row = {
    id,
    nombre: input.nombre.trim(),
    email: input.email.trim().toLowerCase(),
    pin_hash: hashPin(pin),
    rol: normalized.rol,
    activo: normalized.activo ?? true,
    desarrollos_ids: normalized.desarrollosIds,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("asesores").insert(row).select().single();
  if (error) {
    throw new Error(error.message);
  }

  const asesor = toRecord(data as AsesorRow);
  let adminSync: CoordinadorAdminSync | undefined;

  if (asesor.rol === "coordinador" && asesor.activo) {
    adminSync = await syncCoordinadorAdminAccess({
      asesorId: asesor.id,
      nombre: asesor.nombre,
      email: asesor.email,
      desarrollosIds: asesor.desarrollosIds,
      activo: true,
    });
  }

  return { asesor, pin, adminSync };
};

export const updateAsesor = async (
  profile: AdminProfile,
  id: string,
  input: AsesorUpdateInput,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await getAsesorById(id);
  if (!existing) {
    throw new Error("Asesor no encontrado.");
  }

  if (input.syncAdmin) {
    if (existing.rol !== "coordinador" || !existing.activo) {
      throw new Error("Solo coordinadores activos pueden sincronizar acceso admin.");
    }

    const adminSync = await syncCoordinadorAdminAccess({
      asesorId: existing.id,
      nombre: existing.nombre,
      email: existing.email,
      desarrollosIds: existing.desarrollosIds,
      activo: true,
    });

    return { asesor: existing, adminSync };
  }

  const nextDesarrollos = input.desarrollosIds ?? existing.desarrollosIds;
  assertCanManageAsesor(profile, nextDesarrollos);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.nombre !== undefined) {
    patch.nombre = input.nombre.trim();
  }
  if (input.email !== undefined) {
    patch.email = input.email.trim().toLowerCase();
  }
  if (input.rol !== undefined) {
    assertGerenteCanAssignRol(profile, input.rol);
    patch.rol = input.rol;
  }
  if (input.desarrollosIds !== undefined) {
    if (!isSuperAdmin(profile) && input.desarrollosIds.length !== 1) {
      throw new Error("Selecciona un solo desarrollo para este acceso.");
    }
    patch.desarrollos_ids = input.desarrollosIds;
  }
  if (input.activo !== undefined) {
    patch.activo = input.activo;
  }

  let newPin: string | undefined;
  if (input.regeneratePin) {
    newPin = await resolvePinForDesarrollos(nextDesarrollos, id);
    patch.pin_hash = hashPin(newPin);
  }

  const { data, error } = await supabase
    .from("asesores")
    .update(patch)
    .eq("id", id)
    .select("id, nombre, email, rol, activo, desarrollos_ids, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const asesor = toRecord({ ...(data as Omit<AsesorRow, "pin_hash">), pin_hash: "" });
  const adminSync = await applyCoordinadorAdminPolicy(existing, asesor);

  return { asesor, pin: newPin, adminSync };
};

export const deactivateAsesor = async (profile: AdminProfile, id: string) => {
  return updateAsesor(profile, id, { activo: false });
};

export type DemoSeedResult = {
  created: AsesorRecord[];
  skipped: Array<{ id: string; nombre: string; reason: string }>;
  pins: Array<{ id: string; nombre: string; pin: string }>;
};

export const seedDemoAsesores = async (profile: AdminProfile): Promise<DemoSeedResult> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { asesores: demoAsesores } = await import("@/lib/data");

  const eligible = demoAsesores.filter((item) => {
    if (!item.desarrollosIds.length) {
      return false;
    }

    if (isSuperAdmin(profile)) {
      return true;
    }

    return item.desarrollosIds.every((id) => profile.desarrollosIds.includes(id));
  });

  if (!eligible.length) {
    throw new Error("No hay asesores demo dentro de tu alcance.");
  }

  const created: AsesorRecord[] = [];
  const skipped: DemoSeedResult["skipped"] = [];
  const pins: DemoSeedResult["pins"] = [];

  for (const demo of eligible) {
    assertCanManageAsesor(profile, demo.desarrollosIds);

    const { data: existing } = await supabase
      .from("asesores")
      .select("id, nombre")
      .eq("id", demo.id)
      .maybeSingle();

    if (existing) {
      skipped.push({
        id: demo.id,
        nombre: demo.nombre,
        reason: "Ya existe en Supabase",
      });
      continue;
    }

    const { data: emailConflict } = await supabase
      .from("asesores")
      .select("id")
      .eq("email", demo.email.toLowerCase())
      .maybeSingle();

    if (emailConflict) {
      skipped.push({
        id: demo.id,
        nombre: demo.nombre,
        reason: "Email ya registrado",
      });
      continue;
    }

    const row = {
      id: demo.id,
      nombre: demo.nombre.trim(),
      email: demo.email.trim().toLowerCase(),
      pin_hash: hashPin(demo.pin),
      rol: demo.rol,
      activo: demo.activo,
      desarrollos_ids: demo.desarrollosIds,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("asesores").insert(row).select().single();
    if (error) {
      skipped.push({
        id: demo.id,
        nombre: demo.nombre,
        reason: error.message,
      });
      continue;
    }

    created.push(toRecord(data as AsesorRow));
    pins.push({ id: demo.id, nombre: demo.nombre, pin: demo.pin });
  }

  return { created, skipped, pins };
};
