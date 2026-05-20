import { MetricasAdminPanel } from "@/components/admin/MetricasAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { filterDesarrollosForAdmin, getAdminScopeLabel } from "@/lib/admin/permissions";
import { desarrollos } from "@/lib/data";

export default async function AdminMetricasPage() {
  const session = await requireAdminModule("metricas");

  const activos = desarrollos.filter((item) => item.estado === "activo");
  const allowedDesarrollos = filterDesarrollosForAdmin(activos, session.profile);
  const desarrolloNames = Object.fromEntries(activos.map((item) => [item.id, item.nombre]));

  return (
    <MetricasAdminPanel
      desarrollos={allowedDesarrollos}
      scopeLabel={getAdminScopeLabel(session.profile, desarrolloNames)}
    />
  );
}
