"use client";

/**
 * Mock de producto para el hero — atmósfera showroom, no captura real.
 * Tres paneles: recorrido, cotizador, sembrado.
 */
export function GabiProductMock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-lg ${className}`.trim()}
      aria-hidden
    >
      {/* Glow */}
      <div className="pointer-events-none absolute -inset-8 rounded-full bg-gabi-teal/20 blur-3xl" />

      {/* Tablet frame */}
      <div className="relative overflow-hidden rounded-[1.25rem] border border-white/15 bg-gabi-navy-dark/80 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
          <span className="ml-2 text-[10px] font-medium tracking-wide text-white/40">
            showroom · gabi
          </span>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-[1.1fr_0.9fr] sm:p-4">
          {/* Recorrido */}
          <div className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gabi-teal">
              Recorrido
            </p>
            <p className="mt-2 text-sm font-semibold text-white">Etapa 2 · Amenities</p>
            <div className="mt-3 space-y-2">
              {["Lobby y acceso", "Amenidades", "Unidad modelo"].map((step, i) => (
                <div
                  key={step}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      i === 0
                        ? "bg-gabi-teal text-gabi-navy-dark"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs text-white/80">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cotizador + sembrado */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gabi-teal">
                Cotizador
              </p>
              <p className="mt-2 text-xs text-white/50">Unidad N-201</p>
              <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-white">
                $3,420,000
              </p>
              <div className="mt-2 flex gap-1.5">
                {["Contado", "MSI", "30-70"].map((esquema, i) => (
                  <span
                    key={esquema}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                      i === 0
                        ? "bg-gabi-teal/20 text-gabi-teal"
                        : "bg-white/5 text-white/45"
                    }`}
                  >
                    {esquema}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gabi-teal">
                Sembrado
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[
                  "disponible",
                  "disponible",
                  "apartado",
                  "vendido",
                  "disponible",
                  "disponible",
                  "vendido",
                  "disponible",
                ].map((status, i) => (
                  <span
                    key={`${status}-${i}`}
                    className={`aspect-square rounded-md ${
                      status === "disponible"
                        ? "bg-gabi-teal/50"
                        : status === "apartado"
                          ? "bg-gabi-amber/60"
                          : "bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-white/40">Inventario en vivo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
