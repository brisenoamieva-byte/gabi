import { MetricasAdminPanel } from "@/components/admin/MetricasAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminMetricasPage() {
  const session = await requireAdminModule("metricas");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <MetricasAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
    />
  );
}
