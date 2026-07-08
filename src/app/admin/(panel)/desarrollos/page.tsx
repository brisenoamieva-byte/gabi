import { Suspense } from "react";
import { DesarrollosHubPanel } from "@/components/admin/DesarrollosHubPanel";
import { listComercializadoras, type ComercializadoraAdminRecord } from "@/lib/admin/catalog-service";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";
import { canAccessModule, filterDesarrollosForAdmin, isSuperAdmin } from "@/lib/admin/permissions";
import { listDesarrolloRecords } from "@/lib/catalog/service";
import { comercializadores as fallbackComercializadores } from "@/lib/data";

const fallbackComercializadoras = (): ComercializadoraAdminRecord[] =>
  fallbackComercializadores.map((item) => ({
    id: item.id,
    slug: item.slug,
    nombre: item.nombre,
    logo: item.logo,
    usuario: item.usuario,
    colorPrimary: item.colorPrimary,
    colorAccent: item.colorAccent,
    activo: true,
    portalPath: item.portalPath,
    desarrollosCount: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }));

export default async function AdminDesarrollosPage() {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);
  const hubDesarrollos = filterDesarrollosForAdmin(
    await listDesarrolloRecords({ includeInactive: true }),
    session.profile,
  );

  let comercializadoras: ComercializadoraAdminRecord[] = [];
  try {
    comercializadoras = await listComercializadoras();
  } catch {
    comercializadoras = fallbackComercializadoras();
  }

  const permissions = {
    leads: canAccessModule(session.profile, "leads"),
    sembrado: canAccessModule(session.profile, "sembrado"),
    asesores: canAccessModule(session.profile, "asesores"),
    metricas: canAccessModule(session.profile, "metricas"),
  };

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Cargando desarrollos…
        </div>
      }
    >
      <DesarrollosHubPanel
        desarrollos={hubDesarrollos}
        clusters={catalog.clusters}
        comercializadoras={comercializadoras}
        scopeLabel={catalog.scopeLabel}
        permissions={permissions}
        isSuperAdmin={isSuperAdmin(session.profile)}
      />
    </Suspense>
  );
}
