import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { DMB_ADMIN } from "@/lib/dmb/admin-routes";
import { CORREDOR_DESARROLLOS } from "@/lib/corredor/zona-sur-seed";

export default function AdminDmbCorredorPage() {
  const sorted = [...CORREDOR_DESARROLLOS].sort(
    (a, b) => (a.kmCorredor ?? 99) - (b.kmCorredor ?? 99),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-dmb-muted">
          DMB · Corredor sur
        </p>
        <h2 className="text-2xl font-black text-dmb-ink">Desarrollos en el mapa</h2>
        <p className="mt-1 max-w-2xl text-sm text-dmb-muted">
          Edita precios, textos de venta y visibilidad publicados en el corredor. Ubicaciones y
          logos siguen en el catálogo base.
        </p>
      </div>

      <div className="space-y-3">
        {sorted.map((desarrollo) => (
          <Link
            key={desarrollo.id}
            href={DMB_ADMIN.corredorDesarrollo(desarrollo.id)}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-dmb-line bg-white p-5 shadow-sm transition hover:border-dmb-accent/30 hover:shadow-md"
          >
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-dmb-surface">
                <MapPin className="h-5 w-5 text-dmb-accent" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-dmb-ink">{desarrollo.nombre}</h3>
                <p className="text-sm text-dmb-muted">
                  {desarrollo.desarrollador} · {desarrollo.kmLabel}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-dmb-line group-hover:text-dmb-accent" />
          </Link>
        ))}
      </div>
    </div>
  );
}
