import { MetricasAdminPanel } from "@/components/admin/MetricasAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

type MetricasTab = "semanal" | "visitas" | "leads" | "sembrado" | "comisiones";

const METRICAS_TABS = new Set<MetricasTab>([
  "semanal",
  "visitas",
  "leads",
  "sembrado",
  "comisiones",
]);

type AdminMetricasPageProps = {
  searchParams?: {
    tab?: string;
    desarrolloId?: string;
  };
};

export default async function AdminMetricasPage({ searchParams }: AdminMetricasPageProps) {
  const session = await requireAdminModule("metricas");
  const catalog = await getAdminCatalogContext(session.profile);

  const tabParam = searchParams?.tab;
  const initialTab: MetricasTab =
    tabParam && METRICAS_TABS.has(tabParam as MetricasTab)
      ? (tabParam as MetricasTab)
      : "semanal";

  const allowedIds = new Set(catalog.allowedDesarrollos.map((item) => item.id));
  const initialDesarrolloId =
    searchParams?.desarrolloId && allowedIds.has(searchParams.desarrolloId)
      ? searchParams.desarrolloId
      : undefined;

  return (
    <MetricasAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      initialTab={initialTab}
      initialDesarrolloId={initialDesarrolloId}
    />
  );
}
