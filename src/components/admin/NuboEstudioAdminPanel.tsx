"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { NuboEstudioContenidoAdminPanel } from "@/components/admin/NuboEstudioContenidoAdminPanel";
import { NuboEstudioMediaAdminPanel } from "@/components/admin/NuboEstudioMediaAdminPanel";
import { NuboPublicidadAdminPanel } from "@/components/admin/NuboPublicidadAdminPanel";

type Tab = "textos" | "imagenes" | "presupuesto";

const tabs: { id: Tab; label: string }[] = [
  { id: "textos", label: "Textos" },
  { id: "imagenes", label: "Imágenes" },
  { id: "presupuesto", label: "Presupuesto" },
];

export function NuboEstudioAdminPanel() {
  const [tab, setTab] = useState<Tab>("textos");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Estudios de mercado
          </p>
          <h2 className="text-2xl font-black text-gabi-forest">NUBO · Editor del estudio</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Edita textos, imágenes y presupuesto de publicidad. Los cambios se reflejan en{" "}
            <code>/estudios/nubo</code> al publicar y recargar.
          </p>
        </div>
        <Link
          href="/estudios/nubo"
          target="_blank"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gabi-forest/15 bg-white px-4 text-sm font-semibold text-gabi-forest hover:bg-gabi-cream"
        >
          <ExternalLink className="h-4 w-4" />
          Ver estudio
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gabi-forest/10 pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.id ?
                "bg-gabi-forest text-white"
              : "text-slate-600 hover:bg-gabi-cream hover:text-gabi-forest"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "textos" ? <NuboEstudioContenidoAdminPanel /> : null}
      {tab === "imagenes" ? <NuboEstudioMediaAdminPanel /> : null}
      {tab === "presupuesto" ? <NuboPublicidadAdminPanel embedded /> : null}
    </div>
  );
}
