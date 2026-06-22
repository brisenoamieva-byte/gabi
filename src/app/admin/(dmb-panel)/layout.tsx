import { redirect } from "next/navigation";
import { DmbAdminShell } from "@/components/dmb/DmbAdminShell";
import { getAdminSession } from "@/lib/admin/session";
import { isSuperAdmin } from "@/lib/admin/permissions";

export default async function DmbAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  return <DmbAdminShell profile={session.profile}>{children}</DmbAdminShell>;
}
