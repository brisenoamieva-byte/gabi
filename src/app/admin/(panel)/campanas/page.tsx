import { CampanasAdminPanel } from "@/components/admin/CampanasAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminCampanasPage() {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <CampanasAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
