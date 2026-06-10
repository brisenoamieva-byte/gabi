import { InvesttiSimuladorAdminPanel } from "@/components/admin/InvesttiSimuladorAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { redirect } from "next/navigation";

export default async function AdminInvesttiSimuladorPage() {
  const session = await requireAdminModule("catalogo");

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  return <InvesttiSimuladorAdminPanel />;
}
