import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminScopeLabel } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { desarrollos } from "@/lib/data";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login");
  }

  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const desarrolloNames = Object.fromEntries(desarrollos.map((item) => [item.id, item.nombre]));

  return (
    <AdminShell
      profile={session.profile}
      scopeLabel={getAdminScopeLabel(session.profile, desarrolloNames)}
    >
      {children}
    </AdminShell>
  );
}
