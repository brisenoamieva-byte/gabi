import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { PROPUESTAS_REGISTRY } from "@/lib/propuestas/registry";

export default function AdminPropuestasPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/dmb" className="text-xs font-semibold text-dmb-accent hover:underline">
          ← Admin DMB
        </Link>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-dmb-muted">
          DMB · Consultoría
        </p>
        <h2 className="text-2xl font-black text-dmb-ink">Propuestas comerciales</h2>
        <p className="mt-1 max-w-2xl text-sm text-dmb-muted">
          Edita textos y condiciones publicados en propuestas. Los datos financieros (lotes,
          escenarios) se actualizan vía script de importación.
        </p>
      </div>

      <div className="space-y-3">
        {PROPUESTAS_REGISTRY.map((propuesta) => (
          <Link
            key={propuesta.slug}
            href={`/admin/propuestas/${propuesta.slug}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gabi-forest/6">
                <FileText className="h-5 w-5 text-gabi-forest" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-gabi-forest">{propuesta.titulo}</h3>
                <p className="text-sm text-slate-500">{propuesta.ubicacion}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {propuesta.desarrollador} · {propuesta.fecha} · {propuesta.estado}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-gabi-forest" />
          </Link>
        ))}
      </div>
    </div>
  );
}
