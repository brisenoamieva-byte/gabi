import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { DmbAdminBackLink } from "@/components/dmb/DmbAdminBackLink";
import { CORREDOR_DESARROLLOS } from "@/lib/corredor/zona-sur-seed";

export default function AdminCorredorPage() {
  const sorted = [...CORREDOR_DESARROLLOS].sort(
    (a, b) => (a.kmCorredor ?? 99) - (b.kmCorredor ?? 99),
  );

  return (
    <div className="space-y-6">
      <div>
        <DmbAdminBackLink />
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-dmb-muted">
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
            href={`/admin/corredor/${desarrollo.id}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gabi-forest/6">
                <MapPin className="h-5 w-5 text-gabi-forest" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-gabi-forest">{desarrollo.nombre}</h3>
                <p className="text-sm text-slate-500">
                  {desarrollo.desarrollador} · {desarrollo.kmLabel}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  ${desarrollo.precioMinM2.toLocaleString("es-MX")}–$
                  {desarrollo.precioMaxM2.toLocaleString("es-MX")}/m² · desde $
                  {desarrollo.ticketDesde.toLocaleString("es-MX")}
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
