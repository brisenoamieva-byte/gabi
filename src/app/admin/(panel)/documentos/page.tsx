import { DocumentosAdminPanel } from "@/components/admin/DocumentosAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { filterDesarrollosForAdmin, getAdminScopeLabel } from "@/lib/admin/permissions";
import { clusters, desarrollos, disponibilidades, prototipos } from "@/lib/data";

export default async function AdminDocumentosPage() {
  const session = await requireAdminModule("documentos");

  const activos = desarrollos.filter((item) => item.estado === "activo");
  const allowedDesarrollos = filterDesarrollosForAdmin(activos, session.profile);
  const desarrolloNames = Object.fromEntries(activos.map((item) => [item.id, item.nombre]));
  const canUseCatalog = allowedDesarrollos.length > 0;

  return (
    <DocumentosAdminPanel
      desarrollos={allowedDesarrollos}
      scopeLabel={getAdminScopeLabel(session.profile, desarrolloNames)}
      clusters={canUseCatalog ? clusters.filter((item) => item.activo) : []}
      disponibilidades={canUseCatalog ? disponibilidades : []}
      prototipos={canUseCatalog ? prototipos.filter((item) => item.activo) : []}
    />
  );
}
