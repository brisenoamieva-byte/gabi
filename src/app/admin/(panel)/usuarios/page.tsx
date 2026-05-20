import { UsuariosAdminPanel } from "@/components/admin/UsuariosAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { redirect } from "next/navigation";

export default async function AdminUsuariosPage() {
  const session = await requireAdminModule("usuarios");

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <UsuariosAdminPanel
      desarrollos={catalog.activeDesarrollos}
      currentUserId={session.userId}
    />
  );
}
