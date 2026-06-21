import { ComplianceCoachPanel } from "@/components/admin/ComplianceCoachPanel";
import { getAdminCatalogContext } from "@/lib/admin/catalog-context";
import { requireAdminModule } from "@/lib/admin/guards";
import { canAccessModule } from "@/lib/admin/permissions";

export default async function AdminComplianceCoachPage() {
  const session = await requireAdminModule("compliance-coach");
  const catalog = await getAdminCatalogContext(session.profile);

  return (
    <ComplianceCoachPanel
      desarrollos={catalog.allowedDesarrollos}
      scopeLabel={catalog.scopeLabel}
      canOpenLeads={canAccessModule(session.profile, "leads")}
    />
  );
}
