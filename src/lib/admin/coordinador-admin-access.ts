import { ensureAuthUserForAdmin } from "@/lib/admin/admin-auth-user";
import { isLeadershipAsesorRol, normalizeAsesorRol } from "@/lib/asesores/types";
import {
  formatGerenteAdminAccessEmailHint,
  sendGerenteAdminAccessEmail,
} from "@/lib/email/send-gerente-admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CoordinadorAdminSync = {
  adminLinked: boolean;
  adminInviteSent: boolean;
  adminRevoked: boolean;
  adminEmailSent?: boolean;
  adminMessage?: string;
};

const resolveAuthUserId = async (email: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado (service role).");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: linkedProfile } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (linkedProfile?.id) {
    return { userId: linkedProfile.id as string, invited: false };
  }

  const { userId, created } = await ensureAuthUserForAdmin(normalizedEmail);
  return { userId, invited: created };
};

export const syncCoordinadorAdminAccess = async (input: {
  asesorId: string;
  nombre: string;
  email: string;
  desarrollosIds: string[];
  activo: boolean;
}): Promise<CoordinadorAdminSync> => {
  if (!input.activo) {
    return revokeCoordinadorAdminAccess(input.asesorId);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      adminLinked: false,
      adminInviteSent: false,
      adminRevoked: false,
      adminMessage:
        "Acceso portal creado. Configura SUPABASE_SERVICE_ROLE_KEY para vincular admin automáticamente.",
    };
  }

  try {
    const { userId, invited } = await resolveAuthUserId(input.email);

    const { error } = await supabase.from("admin_profiles").upsert(
      {
        id: userId,
        nombre: input.nombre.trim(),
        email: input.email.trim().toLowerCase(),
        rol: "gerente",
        desarrollos_ids: input.desarrollosIds,
        activo: true,
        asesor_id: input.asesorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    const emailResult = await sendGerenteAdminAccessEmail({
      email: input.email,
      nombre: input.nombre,
    });

    const emailHint = formatGerenteAdminAccessEmailHint(emailResult);
    const supabaseHint = invited
      ? "Usuario creado en Supabase."
      : "Usuario ya existía — usa el enlace del correo GABI para definir contraseña.";

    return {
      adminLinked: true,
      adminInviteSent: invited,
      adminRevoked: false,
      adminEmailSent: emailResult.sent,
      adminMessage: `${emailHint} ${supabaseHint} Solo abrir el correo GABI (español), no Supabase Auth (inglés). Entra en /admin/login.`,
    };
  } catch (syncError) {
    return {
      adminLinked: false,
      adminInviteSent: false,
      adminRevoked: false,
      adminMessage:
        syncError instanceof Error
          ? `Portal listo, pero admin no se vinculó: ${syncError.message}`
          : "Portal listo, pero admin no se vinculó.",
    };
  }
};

export const revokeCoordinadorAdminAccess = async (
  asesorId: string,
): Promise<CoordinadorAdminSync> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      adminLinked: false,
      adminInviteSent: false,
      adminRevoked: false,
    };
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .update({
      activo: false,
      updated_at: new Date().toISOString(),
    })
    .eq("asesor_id", asesorId)
    .select("id");

  if (error) {
    return {
      adminLinked: false,
      adminInviteSent: false,
      adminRevoked: false,
      adminMessage: error.message,
    };
  }

  return {
    adminLinked: false,
    adminInviteSent: false,
    adminRevoked: (data ?? []).length > 0,
    adminMessage:
      (data ?? []).length > 0 ? "Acceso admin desactivado para este perfil comercial." : undefined,
  };
};

export const applyCoordinadorAdminPolicy = async (
  previous: { id: string; rol: string; activo: boolean; nombre: string; email: string; desarrollosIds: string[] },
  current: { id: string; rol: string; activo: boolean; nombre: string; email: string; desarrollosIds: string[] },
): Promise<CoordinadorAdminSync | undefined> => {
  const currentRol = normalizeAsesorRol(current.rol);
  const previousRol = normalizeAsesorRol(previous.rol);
  const isLeadership = isLeadershipAsesorRol(currentRol) && current.activo;

  if (isLeadership) {
    return syncCoordinadorAdminAccess({
      asesorId: current.id,
      nombre: current.nombre,
      email: current.email,
      desarrollosIds: current.desarrollosIds,
      activo: true,
    });
  }

  if (isLeadershipAsesorRol(previousRol)) {
    return revokeCoordinadorAdminAccess(previous.id);
  }

  return undefined;
};
