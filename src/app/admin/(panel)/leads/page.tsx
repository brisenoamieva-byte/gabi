import { LeadsAdminPanel } from "@/components/admin/LeadsAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";

type AdminLeadsPageProps = {
  searchParams?: {
    desarrolloId?: string;
    asesorId?: string;
    desde?: string;
    hasta?: string;
  };
};

export default async function AdminLeadsPage({ searchParams }: AdminLeadsPageProps) {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);

  const allowedIds = new Set(catalog.allowedDesarrollos.map((item) => item.id));
  const initialDesarrolloId =
    searchParams?.desarrolloId && allowedIds.has(searchParams.desarrolloId)
      ? searchParams.desarrolloId
      : undefined;

  return (
    <LeadsAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      initialDesarrolloId={initialDesarrolloId}
      initialAsesorId={searchParams?.asesorId}
      initialDesde={searchParams?.desde}
      initialHasta={searchParams?.hasta}
    />
  );
}
