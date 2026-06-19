import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CorredorDesarrolloAdminPanel } from "@/components/admin/CorredorDesarrolloAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getCorredorDesarrolloById, isCorredorDesarrolloId } from "@/lib/corredor/zona-sur-seed";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCorredorEditorPage({ params }: PageProps) {
  const session = await requireAdminModule("catalogo");

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  const { id } = await params;
  if (!isCorredorDesarrolloId(id)) {
    notFound();
  }

  const desarrollo = getCorredorDesarrolloById(id)!;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/corredor"
        className="inline-flex text-sm font-semibold text-slate-500 hover:text-gabi-forest hover:underline"
      >
        ← Todos los desarrollos
      </Link>
      <CorredorDesarrolloAdminPanel
        desarrolloId={id}
        titulo={`${desarrollo.nombre} · ${desarrollo.kmLabel}`}
      />
    </div>
  );
}
