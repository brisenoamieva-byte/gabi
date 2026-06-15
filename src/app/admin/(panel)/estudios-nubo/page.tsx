import { NuboEstudioAdminPanel } from "@/components/admin/NuboEstudioAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { redirect } from "next/navigation";

export default async function AdminEstudiosNuboPage() {
  const session = await requireAdminModule("catalogo");

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  return <NuboEstudioAdminPanel />;
}
