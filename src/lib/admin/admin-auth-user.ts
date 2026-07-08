import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const findAuthUserIdByEmail = async (email: string): Promise<string | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
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

/** Crea o reutiliza usuario Auth sin enviar correo de Supabase (el correo lo manda GABI/Resend). */
export const ensureAuthUserForAdmin = async (
  email: string,
): Promise<{ userId: string; created: boolean }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado (service role).");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingId = await findAuthUserIdByEmail(normalizedEmail);
  if (existingId) {
    return { userId: existingId, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
  });

  if (error) {
    const retryId = await findAuthUserIdByEmail(normalizedEmail);
    if (retryId) {
      return { userId: retryId, created: false };
    }
    throw new Error(error.message);
  }

  if (!data.user?.id) {
    throw new Error("No se pudo crear el usuario de admin.");
  }

  return { userId: data.user.id, created: true };
};
