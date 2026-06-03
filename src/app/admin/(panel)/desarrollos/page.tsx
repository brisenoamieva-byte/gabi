import { Suspense } from "react";
import { DesarrollosHubPanel } from "@/components/admin/DesarrollosHubPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";
import { canAccessModule } from "@/lib/admin/permissions";

export default async function AdminDesarrollosPage() {
  const session = await requireAdminModule("leads");
  const catalog = await getAdminCatalogContext(session.profile);

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
        desarrollos={catalog.allowedDesarrollos}
        scopeLabel={catalog.scopeLabel}
        permissions={permissions}
      />
    </Suspense>
  );
}
