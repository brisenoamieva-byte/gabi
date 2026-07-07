import { listAsesores } from "@/lib/admin/asesores-service";
import type { AdminProfile } from "@/lib/admin/types";
import { getAsesorSessionById } from "@/lib/asesores/auth";
import {
  isAssignableAsesorRol,
  isLeadershipAsesorRol,
  type AsesorRecord,
  type AsesorRol,
  type AsesorSession,
} from "@/lib/asesores/types";

export const canAsesorManageAllProspectos = (rol: AsesorRol) => isLeadershipAsesorRol(rol);

export const canAsesorReassignProspectos = (rol: AsesorRol) => isLeadershipAsesorRol(rol);

export const loadAsesorSessionOrThrow = async (asesorId: string): Promise<AsesorSession> => {
  const session = await getAsesorSessionById(asesorId);
  if (!session) {
    throw new Error("Asesor no encontrado o inactivo.");
  }
  return session;
};

export const isLeadershipAsesorId = async (asesorId: string): Promise<boolean> => {
  const session = await getAsesorSessionById(asesorId);
  return session ? isLeadershipAsesorRol(session.rol) : false;
};

/** Asesores ven solo sus leads; gerencia ve todo el desarrollo. */
export const resolveProspectoAsesorFilter = async (
  asesorId: string,
): Promise<string | undefined> => {
  const isLeadership = await isLeadershipAsesorId(asesorId);
  return isLeadership ? undefined : asesorId;
};

const buildLeadershipAdminProfile = (session: AsesorSession): AdminProfile => ({
  id: session.id,
  nombre: session.nombre,
  email: session.email,
  rol: "gerente",
  activo: true,
  desarrollosIds: session.desarrollosIds,
});

export const listEquipoComercialForLeadership = async (
  asesorId: string,
  desarrolloId: string,
): Promise<AsesorRecord[]> => {
  const session = await loadAsesorSessionOrThrow(asesorId);
  if (!canAsesorManageAllProspectos(session.rol)) {
    throw new Error("Sin permiso para ver el equipo comercial.");
  }
  if (!session.desarrollosIds.includes(desarrolloId)) {
    throw new Error("Desarrollo fuera de tu alcance.");
  }

  const asesores = await listAsesores({ desarrolloId }, buildLeadershipAdminProfile(session));
  return asesores.filter((row) => row.activo && isAssignableAsesorRol(row.rol));
};
