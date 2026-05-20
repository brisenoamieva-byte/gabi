import { InventarioAdminPanel } from "@/components/admin/InventarioAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminInventarioPage() {
  const session = await requireAdminModule("inventario");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <InventarioAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      clusters={catalog.clusters}
      prototipos={catalog.prototipos}
    />
  );
}
