"use client";

import Link from "next/link";
import { requireOperatorMessage } from "@/lib/gabi/operator";

export function GabiAuthLoading({ message = "Cargando…" }: { message?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <p className="text-sm text-slate-500">{message}</p>
    </main>
  );
}

export function GabiAuthRedirecting({ loginHref }: { loginHref: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-6">
      <p className="text-sm text-slate-500">Redirigiendo al acceso de operador…</p>
      <Link href={loginHref} className="text-sm font-semibold text-[#201044] underline">
        Entrar en /operador
      </Link>
    </main>
  );
}

export function GabiOperatorDenied({
  loginHref,
  backHref = "/dashboard",
  backLabel = "Volver",
}: {
  loginHref: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <p className="max-w-sm text-center text-sm text-slate-600">{requireOperatorMessage()}</p>
      <Link href={loginHref} className="text-sm font-semibold underline">
        Entrar como operador
      </Link>
      <Link href={backHref} className="text-sm text-slate-500 underline">
        {backLabel}
      </Link>
    </main>
  );
}
