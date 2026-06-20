import { EquipoAdminPanel } from "@/components/admin/EquipoAdminPanel";
import type { EquipoTab } from "@/lib/admin/equipo-types";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";

type PageProps = {
  searchParams?: { tab?: string; desarrollo?: string; desarrolloId?: string };
};

export default async function AdminAsesoresPage({ searchParams }: PageProps) {
  const session = await requireAdminModule("asesores");
  const catalog = await getAdminCatalogContext(session.profile);
  const initialTab: EquipoTab =
    isSuperAdmin(session.profile) && searchParams?.tab === "admin" ? "admin" : "comercial";
  const urlDesarrollo = searchParams?.desarrolloId ?? searchParams?.desarrollo;
  const initialDesarrolloId =
    urlDesarrollo &&
    catalog.allowedDesarrollos.some((item) => item.id === urlDesarrollo)
      ? urlDesarrollo
      : undefined;

  return (
    <EquipoAdminPanel
      desarrollos={catalog.allowedDesarrollos}
      adminDesarrollos={catalog.activeDesarrollos}
      scopeLabel={catalog.scopeLabel}
      isGerenteComercial={session.profile.rol === "gerente"}
      isSuperAdmin={isSuperAdmin(session.profile)}
      currentUserId={session.userId}
      initialTab={initialTab}
      initialDesarrolloId={initialDesarrolloId}
    />
  );
}
