import { DocumentosAdminPanel } from "@/components/admin/DocumentosAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminDocumentosPage() {
  const session = await requireAdminModule("documentos");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <DocumentosAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      clusters={catalog.clusters}
      disponibilidades={catalog.disponibilidades}
      prototipos={catalog.prototipos}
    />
  );
}
