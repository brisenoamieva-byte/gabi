import { PropuestaComercialAdminPanel } from "@/components/admin/PropuestaComercialAdminPanel";
import { requireAdminModule } from "@/lib/admin/guards";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getPropuestaBySlug, isPropuestaSlug } from "@/lib/propuestas/registry";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminPropuestaEditorPage({ params }: PageProps) {
  const session = await requireAdminModule("catalogo");

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  const { slug } = await params;
  if (!isPropuestaSlug(slug)) {
    notFound();
  }

  const propuesta = getPropuestaBySlug(slug)!;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/propuestas"
        className="inline-flex text-sm font-semibold text-slate-500 hover:text-gabi-forest hover:underline"
      >
        ← Todas las propuestas
      </Link>
      <PropuestaComercialAdminPanel
        slug={slug}
        titulo={`${propuesta.meta.titulo} · ${propuesta.meta.ubicacion}`}
      />
    </div>
  );
}
