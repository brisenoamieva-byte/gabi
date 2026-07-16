import { PartnersAdminPanel } from "@/components/admin/PartnersAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminPartnersPage() {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <PartnersAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
