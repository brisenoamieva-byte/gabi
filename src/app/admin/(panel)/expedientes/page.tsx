import { ExpedientesAdminPanel } from "@/components/admin/ExpedientesAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminExpedientesPage() {
  const session = await requireAdminModule("expedientes");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <ExpedientesAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
