"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GabiLogo } from "@/components/brand/GabiLogo";

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
      <GabiLogo variant="header" href="/" />
      <h1 className="mt-4 text-2xl font-bold text-gabi-navy">Algo salió mal</h1>
      <p className="mt-2 max-w-md text-sm text-gabi-muted">
        Hubo un error al cargar esta vista. Puedes reintentar o volver al inicio.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-gabi-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-gabi-navy-light"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-gabi-line px-4 py-2.5 text-sm font-semibold text-gabi-ink hover:bg-gabi-surface"
        >
          Ir al inicio
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-4 text-[11px] text-gabi-muted">Ref: {error.digest}</p>
      ) : null}
    </div>
  );
}
