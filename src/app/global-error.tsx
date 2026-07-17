"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[gabi:global]", error);
    void import("@/lib/observability/report-error").then(({ reportError }) => {
      reportError(error, { digest: error.digest, source: "app/global-error" });
    });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#F8FAFC",
          color: "#13315C",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div>
            <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.04em", margin: 0, lineHeight: 1 }}>
              <span style={{ color: "#2DD4BF" }}>g</span>
              <span style={{ color: "#13315C" }}>abi</span>
            </p>
            <h1 style={{ fontSize: 24, margin: "12px 0 8px" }}>Error de la aplicación</h1>
            <p style={{ color: "#475569", maxWidth: 420, margin: "0 auto" }}>
              No pudimos recuperar la interfaz. Reintenta; si el problema continúa, avisa a soporte.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                background: "#13315C",
                color: "white",
                border: 0,
                borderRadius: 12,
                padding: "10px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            {error.digest ? (
              <p style={{ marginTop: 16, fontSize: 11, color: "#94A3B8" }}>Ref: {error.digest}</p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
