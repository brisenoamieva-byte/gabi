import { PropuestaComercialAdminPanel } from "@/components/admin/PropuestaComercialAdminPanel";
import { DMB_ADMIN } from "@/lib/dmb/admin-routes";
import { getPropuestaBySlug, isPropuestaSlug } from "@/lib/propuestas/registry";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminDmbPropuestaEditorPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isPropuestaSlug(slug)) {
    notFound();
  }

  const propuesta = getPropuestaBySlug(slug)!;

  return (
    <div className="space-y-4">
      <Link
        href={DMB_ADMIN.propuestas}
        className="inline-flex text-sm font-semibold text-dmb-muted hover:text-dmb-accent hover:underline"
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
