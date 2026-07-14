import { redirect } from "next/navigation";
import { requireAdminModule } from "@/lib/admin/guards";

type PageProps = {
  searchParams?: { desarrolloId?: string };
};

/** Compliance Coach se unificó en Salud CRM. */
export default async function AdminComplianceCoachPage({ searchParams }: PageProps) {
  await requireAdminModule("compliance-coach");
  const params = new URLSearchParams();
  if (searchParams?.desarrolloId) {
    params.set("desarrolloId", searchParams.desarrolloId);
  }
  const query = params.toString();
  redirect(query ? `/admin/crm-compliance?${query}` : "/admin/crm-compliance");
}
