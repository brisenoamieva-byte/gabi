"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DisponibilidadPanel } from "@/components/disponibilidad/DisponibilidadPanel";

function DisponibilidadPageContent() {
  const searchParams = useSearchParams();
  const fromAdmin = searchParams.get("from") === "admin";
  const desarrolloIdParam = searchParams.get("desarrolloId");

  return (
    <DisponibilidadPanel fromAdmin={fromAdmin} desarrolloIdParam={desarrolloIdParam} />
  );
}

export default function DisponibilidadPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9]">
          <p className="text-sm text-slate-500">Cargando…</p>
        </main>
      }
    >
      <DisponibilidadPageContent />
    </Suspense>
  );
}
