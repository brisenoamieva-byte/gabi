import { InventarioAdminPanel } from "@/components/admin/InventarioAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { filterDesarrollosForAdmin, getAdminScopeLabel } from "@/lib/admin/permissions";
import { clusters, desarrollos, prototipos } from "@/lib/data";

export default async function AdminInventarioPage() {
  const session = await requireAdminModule("inventario");

  const activos = desarrollos.filter((item) => item.estado === "activo");
  const allowedDesarrollos = filterDesarrollosForAdmin(activos, session.profile);
  const desarrolloNames = Object.fromEntries(activos.map((item) => [item.id, item.nombre]));
  const canUseCatalog = allowedDesarrollos.length > 0;

  return (
    <InventarioAdminPanel
      desarrollos={allowedDesarrollos}
      scopeLabel={getAdminScopeLabel(session.profile, desarrolloNames)}
      clusters={canUseCatalog ? clusters.filter((item) => item.activo) : []}
      prototipos={canUseCatalog ? prototipos.filter((item) => item.activo) : []}
    />
  );
}
