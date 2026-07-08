import { isLeadershipAsesorRol, normalizeAsesorRol } from "@/lib/asesores/types";
import {
  formatGerenteAdminAccessEmailHint,
  sendGerenteAdminAccessEmail,
} from "@/lib/email/send-gerente-admin-access";
import { resolveSiteUrl } from "@/lib/site-url";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CoordinadorAdminSync = {
  adminLinked: boolean;
  adminInviteSent: boolean;
  adminRevoked: boolean;
  adminEmailSent?: boolean;
  adminMessage?: string;
};

const getSiteUrl = () => resolveSiteUrl();

const findAuthUserIdByEmail = async (email: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      return match.id;
    }

    if (data.users.length < 200) {
      break;
    }
    page += 1;
  }

  return null;
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

  const existingAuthId = await findAuthUserIdByEmail(normalizedEmail);
  if (existingAuthId) {
    return { userId: existingAuthId, invited: false };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: `${getSiteUrl()}/auth/callback`,
  });

  if (error) {
    const retryId = await findAuthUserIdByEmail(normalizedEmail);
    if (retryId) {
      return { userId: retryId, invited: false };
    }
    throw new Error(error.message);
  }

  if (!data.user?.id) {
    throw new Error("No se pudo crear el usuario de admin.");
  }

  return { userId: data.user.id, invited: true };
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
      ? "Supabase también envió invitación (revisa spam si no llega)."
      : "Si ya tenías usuario, usa el enlace del correo GABI para definir contraseña.";

    return {
      adminLinked: true,
      adminInviteSent: invited,
      adminRevoked: false,
      adminEmailSent: emailResult.sent,
      adminMessage: `${emailHint} ${supabaseHint} Entra en /admin/login.`,
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
