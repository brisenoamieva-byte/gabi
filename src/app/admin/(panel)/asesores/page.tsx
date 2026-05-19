import { AsesoresAdminPanel } from "@/components/admin/AsesoresAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { filterDesarrollosForAdmin, getAdminScopeLabel, isSuperAdmin } from "@/lib/admin/permissions";
import { desarrollos } from "@/lib/data";

export default async function AdminAsesoresPage() {
  const session = await requireAdminModule("asesores");

  const activos = desarrollos.filter((item) => item.estado === "activo");
  const allowedDesarrollos = filterDesarrollosForAdmin(activos, session.profile);
  const desarrolloNames = Object.fromEntries(activos.map((item) => [item.id, item.nombre]));

  return (
    <AsesoresAdminPanel
      desarrollos={allowedDesarrollos}
      scopeLabel={getAdminScopeLabel(session.profile, desarrolloNames)}
      isGerenteComercial={!isSuperAdmin(session.profile) && session.profile.rol === "gerente"}
    />
  );
}
