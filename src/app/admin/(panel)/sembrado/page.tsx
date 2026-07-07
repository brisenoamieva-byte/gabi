import { SembradoAdminPanel } from "@/components/admin/SembradoAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminSembradoPage() {
  const session = await requireAdminModule("sembrado");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <SembradoAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      clusters={catalog.clusters}
      prototipos={catalog.prototipos}
    />
  );
}
