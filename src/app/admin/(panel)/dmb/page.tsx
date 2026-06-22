import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, MapPin, Presentation } from "lucide-react";
import { DmbLogo, DmbTagline } from "@/components/brand/DmbLogo";
import { getAdminSession } from "@/lib/admin/session";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { dmbHubPath } from "@/lib/dmb/routes";

const ADMIN_MODULES = [
  {
    href: "/admin/propuestas",
    label: "Propuestas comerciales",
    description: "Editar slides y overrides de propuestas B2B.",
    icon: BriefcaseBusiness,
  },
  {
    href: "/admin/estudios-nubo",
    label: "Estudio NUBO",
    description: "Contenido, imágenes y presupuesto de publicidad.",
    icon: Presentation,
  },
  {
    href: "/admin/corredor",
    label: "Corredor sur",
    description: "Precios, textos y visibilidad de desarrollos en el mapa.",
    icon: MapPin,
  },
] as const;

export default async function AdminDmbPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  if (!isSuperAdmin(session.profile)) {
    redirect("/admin/documentos");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={dmbHubPath()}
            className="text-xs font-semibold text-dmb-accent hover:underline"
          >
            ← Centro DMB
          </Link>
          <div className="mt-3">
            <DmbLogo variant="header" />
            <DmbTagline className="mt-1" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-dmb-ink">Admin consultoría</h1>
          <p className="mt-1 max-w-xl text-sm text-dmb-muted">
            Contenidos de propuestas, estudios y corredor. Misma base de datos y sesión admin que
            gabi — sin cuentas adicionales.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_MODULES.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col rounded-2xl border border-dmb-line bg-white p-5 shadow-sm transition hover:border-dmb-accent/40"
            >
              <Icon className="h-6 w-6 text-dmb-accent" />
              <h2 className="mt-3 font-bold text-dmb-ink">{item.label}</h2>
              <p className="mt-1 flex-1 text-sm text-dmb-muted">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-dmb-accent">
                Abrir
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
