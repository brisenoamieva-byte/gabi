import { redirect } from "next/navigation";
import { canAccessModule, canAccessSaludCrm } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminModule } from "@/lib/admin/types";

export const requireAdminModule = async (module: AdminModule) => {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (!canAccessModule(session.profile, module)) {
    redirect("/admin/documentos");
  }

  return session;
};

/** Acceso al hub Salud CRM (gerente u operaciones). */
export const requireSaludCrmAccess = async () => {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (!canAccessSaludCrm(session.profile)) {
    redirect("/admin/documentos");
  }

  return session;
};
