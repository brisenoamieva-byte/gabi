"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AsesorLeadsPanel } from "@/components/asesor/AsesorLeadsPanel";
import { formatPrice } from "@/lib/data";
import { logoutAsesorSession } from "@/lib/session/asesor-session-actions";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

function MisLeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProspectoId = searchParams.get("prospecto") ?? undefined;
  const { authReady, user, desarrollo } = useRequireAsesorSession();

  if (!authReady || !user || !desarrollo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] text-slate-500">
        Cargando…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F0E9] text-[#201044]">
      <header className="border-b border-[#201044]/8 bg-white/90 px-5 py-3 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#201044]/12 bg-white px-3 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => logoutAsesorSession(router)}
            aria-label="Cerrar sesión"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-[#201044] text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-8">
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#201044]/8 bg-white px-4 py-3 shadow-sm">
          {desarrollo.logo ? (
            <Image
              src={desarrollo.logo}
              alt=""
              width={80}
              height={48}
              className="h-8 w-auto object-contain"
            />
          ) : null}
          <div>
            <p className="text-sm font-black">{desarrollo.nombre}</p>
            <p className="text-xs text-slate-500">Desde {formatPrice(desarrollo.precioDesde)}</p>
          </div>
        </div>

        <AsesorLeadsPanel
          asesorId={user.id}
          asesorNombre={user.nombre}
          desarrolloId={desarrollo.id}
          desarrolloNombre={desarrollo.nombre}
          initialProspectoId={initialProspectoId}
        />
      </section>
    </main>
  );
}

export default function MisLeadsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] text-slate-500">
          Cargando…
        </main>
      }
    >
      <MisLeadsContent />
    </Suspense>
  );
}
