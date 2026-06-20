import { GuardiasAdminPanel } from "@/components/admin/GuardiasAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";
import { GUARDIAS_PILOT_DESARROLLO_ID } from "@/lib/comercial/guardias";

type AdminGuardiasPageProps = {
  searchParams?: {
    desarrolloId?: string;
    weekStart?: string;
  };
};

export default async function AdminGuardiasPage({ searchParams }: AdminGuardiasPageProps) {
  const session = await requireAdminModule("guardias");
  const catalog = await getAdminCatalogContext(session.profile);

  const allowedIds = new Set(catalog.allowedDesarrollos.map((item) => item.id));
  const initialDesarrolloId =
    searchParams?.desarrolloId && allowedIds.has(searchParams.desarrolloId)
      ? searchParams.desarrolloId
      : allowedIds.has(GUARDIAS_PILOT_DESARROLLO_ID)
        ? GUARDIAS_PILOT_DESARROLLO_ID
        : catalog.allowedDesarrollos[0]?.id;

  return (
    <GuardiasAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      initialDesarrolloId={initialDesarrolloId}
    />
  );
}
