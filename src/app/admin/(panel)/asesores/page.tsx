import { AsesoresAdminPanel } from "@/components/admin/AsesoresAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";

export default async function AdminAsesoresPage() {
  const session = await requireAdminModule("asesores");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <AsesoresAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      isGerenteComercial={session.profile.rol === "gerente"}
      isSuperAdmin={isSuperAdmin(session.profile)}
    />
  );
}
