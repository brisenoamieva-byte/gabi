import { CrmComplianceAdminPanel } from "@/components/admin/CrmComplianceAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminCrmCompliancePage() {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <CrmComplianceAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
