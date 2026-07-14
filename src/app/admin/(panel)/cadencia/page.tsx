import { redirect } from "next/navigation";
import { requireAdminModule } from "@/lib/admin/guards";

type AdminCadenciaPageProps = {
  searchParams?: {
    desarrolloId?: string;
  };
};

/** Cadencia vive ahora como pestaña de Salud CRM. */
export default async function AdminCadenciaPage({ searchParams }: AdminCadenciaPageProps) {
  await requireAdminModule("leads");
  const params = new URLSearchParams({ tab: "cadencia" });
  if (searchParams?.desarrolloId) {
    params.set("desarrolloId", searchParams.desarrolloId);
  }
  redirect(`/admin/crm-compliance?${params.toString()}`);
}
