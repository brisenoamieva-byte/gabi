import { Suspense } from "react";
import { CrmComplianceAdminPanel } from "@/components/admin/CrmComplianceAdminPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireSaludCrmAccess } from "@/lib/admin/guards";
import { canAccessModule, canConfigureCrmPlaybook } from "@/lib/admin/permissions";

export default async function AdminCrmCompliancePage() {
  const session = await requireSaludCrmAccess();
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <Suspense fallback={<div className="p-4 text-sm text-gabi-sand">Cargando Salud CRM…</div>}>
      <CrmComplianceAdminPanel
        desarrollos={catalog.allowedDesarrollos}
        scopeLabel={catalog.scopeLabel}
        canConfigurePlaybook={canConfigureCrmPlaybook(session.profile)}
        canOpenLeads={canAccessModule(session.profile, "leads")}
      />
    </Suspense>
  );
}
