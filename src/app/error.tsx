"use client";

import { useEffect } from "react";
import Link from "next/link";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("[gabi]", error);
    void import("@/lib/observability/report-error").then(({ reportError }) => {
      reportError(error, { digest: error.digest, source: "app/error" });
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">gabi</p>
      <h1 className="mt-2 text-2xl font-bold text-[#13315C]">Algo salió mal</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Hubo un error al cargar esta vista. Puedes reintentar o volver al inicio.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#13315C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a4278]"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ir al inicio
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-4 text-[11px] text-slate-400">Ref: {error.digest}</p>
      ) : null}
    </div>
  );
}
