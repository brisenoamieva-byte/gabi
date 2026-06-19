import { redirect } from "next/navigation";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";

export default async function AdminUsuariosPage() {
  const session = await requireAdminModule("usuarios");

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  redirect("/admin/asesores?tab=admin");
}
