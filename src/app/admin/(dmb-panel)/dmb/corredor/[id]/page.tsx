import Link from "next/link";
import { notFound } from "next/navigation";
import { CorredorDesarrolloAdminPanel } from "@/components/admin/CorredorDesarrolloAdminPanel";
import { DMB_ADMIN } from "@/lib/dmb/admin-routes";
import { getCorredorDesarrolloById, isCorredorDesarrolloId } from "@/lib/corredor/zona-sur-seed";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDmbCorredorEditorPage({ params }: PageProps) {
  const { id } = await params;
  if (!isCorredorDesarrolloId(id)) {
    notFound();
  }

  const desarrollo = getCorredorDesarrolloById(id)!;

  return (
    <div className="space-y-4">
      <Link
        href={DMB_ADMIN.corredor}
        className="inline-flex text-sm font-semibold text-dmb-muted hover:text-dmb-accent hover:underline"
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
