import { CatalogoAdminPanel } from "@/components/admin/CatalogoAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { redirect } from "next/navigation";

export default async function AdminCatalogoPage() {
  const session = await requireAdminModule("catalogo");

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  return <CatalogoAdminPanel />;
}
