import { ExportacionesAdminPanel } from "@/components/admin/ExportacionesAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminExportacionesPage() {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <ExportacionesAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      profile={session.profile}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
