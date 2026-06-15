import { getAdminSession } from "@/lib/admin/session";
import { isSuperAdmin } from "@/lib/admin/permissions";

export async function authorizeNuboEditor(request: Request): Promise<{
  adminProfileId: string | null;
  email: string;
} | null> {
  void request;
  const session = await getAdminSession();
  if (!session || !isSuperAdmin(session.profile)) {
    return null;
  }

  return {
    adminProfileId: session.profile.id === "operador-gabi" ? null : session.profile.id,
    email: session.profile.email,
  };
}
