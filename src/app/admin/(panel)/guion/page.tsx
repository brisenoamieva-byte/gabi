import { GuionAdminPanel } from "@/components/admin/GuionAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminGuionPage() {
  const session = await requireAdminModule("guion");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <GuionAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
