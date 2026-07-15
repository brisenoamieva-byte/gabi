"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AsesorLeadsPanel } from "@/components/asesor/AsesorLeadsPanel";
import { AsesorBackofficeLink } from "@/components/asesor/AsesorBackofficeLink";
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
      <main className="flex min-h-screen items-center justify-center bg-[#F7F6F2] text-slate-500">
        <p className="text-sm font-medium">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#F7F6F2]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 md:px-10">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Inicio</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <AsesorBackofficeLink rol={user.rol} desarrolloId={desarrollo.id} />
            <button
              type="button"
              onClick={() => logoutAsesorSession(router)}
              aria-label="Cerrar sesión"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#201044]"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 md:px-10 md:py-8">
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {desarrollo.logo ? (
            <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F7F6F2] p-1.5">
              <Image
                src={desarrollo.logo}
                alt=""
                width={80}
                height={48}
                className="h-auto max-h-8 w-full object-contain"
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Desarrollo activo
            </p>
            <p className="truncate text-[15px] font-semibold text-[#201044]">{desarrollo.nombre}</p>
            <p className="text-xs text-slate-500">Desde {formatPrice(desarrollo.precioDesde)}</p>
          </div>
        </div>

        <AsesorLeadsPanel
          asesorId={user.id}
          asesorNombre={user.nombre}
          asesorRol={user.rol}
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
        <main className="flex min-h-screen items-center justify-center bg-[#F7F6F2] text-slate-500">
          <p className="text-sm font-medium">Cargando…</p>
        </main>
      }
    >
      <MisLeadsContent />
    </Suspense>
  );
}
