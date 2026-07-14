import { redirect } from "next/navigation";
import { requireAdminModule } from "@/lib/admin/guards";

type PageProps = {
  searchParams?: { desarrolloId?: string };
};

/** Playbook CRM vive ahora como pestaña «Configurar pasos» en Salud CRM. */
export default async function AdminCrmPlaybookPage({ searchParams }: PageProps) {
  await requireAdminModule("leads");
  const params = new URLSearchParams({ tab: "config" });
  if (searchParams?.desarrolloId) {
    params.set("desarrolloId", searchParams.desarrolloId);
  }
  redirect(`/admin/crm-compliance?${params.toString()}`);
}
