import { redirect } from "next/navigation";
import { requireAdminModule } from "@/lib/admin/guards";

export default async function AdminInventarioPage() {
  await requireAdminModule("inventario");
  redirect("/admin/sembrado?seccion=curacion");
}
