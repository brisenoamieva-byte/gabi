import { LeadsAdminPanel } from "@/components/admin/LeadsAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminLeadsPage() {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <LeadsAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
