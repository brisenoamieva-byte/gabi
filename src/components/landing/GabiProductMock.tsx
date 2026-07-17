"use client";

/**
 * Mock del producto real: recorrido (chrome) + simulador Misión La Gavia.
 * Estructura alineada a MisionLaGaviaSimuladorPanel / recorrido tablet.
 */
export function GabiProductMock({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full ${className}`.trim()} aria-hidden>
      {/* Chrome de recorrido — showroom tablet */}
      <div className="overflow-hidden border border-white/[0.08] border-b-0 bg-[#F2F0E9] md:rounded-tl-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6CC24A]">
              Recorrido guiado
            </p>
            <p className="truncate text-[12px] font-semibold text-[#201044]">
              Misión La Gavia · etapa Producto
            </p>
          </div>
          <p className="shrink-0 text-[10px] font-medium text-[#201044]/45">
            <span className="text-gabi-teal">g</span>
            <span className="text-[#13315C]">abi</span>
          </p>
        </div>
        <div className="h-1 w-full bg-[#201044]/10">
          <div className="h-full w-[72%] bg-[#6CC24A]" />
        </div>
      </div>

      {/* Simulador — misma jerarquía que el panel real */}
      <div className="overflow-hidden border border-white/[0.09] bg-[#0C243F] md:rounded-bl-xl md:border-r-0">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3 md:px-5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gabi-teal/70">
              Simulador oficial
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-white">Misión La Gavia</p>
          </div>
          <span className="rounded-md bg-gabi-teal/15 px-2 py-1 text-[11px] font-semibold text-gabi-teal">
            Disponible
          </span>
        </div>

        <div className="space-y-4 px-4 py-4 md:px-5 md:py-5">
          <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-[12px] text-white/50">
            Prospecto en recorrido:{" "}
            <span className="font-semibold text-white/85">Ana Martínez</span>
          </p>

          <div className="rounded-lg bg-white/[0.04] px-3 py-2.5 ring-1 ring-inset ring-white/[0.06]">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
              Unidad seleccionada
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">N-201 · Tipología 3R</p>
            <p className="mt-0.5 text-[12px] text-white/45">
              Torre N · Interior · 112.4 m²
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
              Esquema de pago
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "contado", label: "Contado", active: false },
                { id: "msi", label: "MSI", active: true },
                { id: "3070", label: "30-70", active: false },
                { id: "libre", label: "Libre", active: false },
              ].map((item) => (
                <span
                  key={item.id}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                    item.active
                      ? "bg-gabi-teal text-gabi-navy-dark"
                      : "bg-white/[0.04] text-white/40 ring-1 ring-inset ring-white/10"
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">
                Precio lista
              </p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-white">
                $3,420,000
              </p>
            </div>
            <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">
                Descuento vs lista
              </p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-gabi-teal">
                −8.0%
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-gabi-teal px-4 py-3.5 text-gabi-navy-dark">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gabi-navy-dark/55">
              Total MSI
            </p>
            <p className="mt-1 font-gabi-display text-[1.75rem] font-semibold tabular-nums tracking-[-0.03em] md:text-[1.95rem]">
              $3,146,400
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                Enganche 30%
              </p>
              <p className="mt-1 text-[13px] font-semibold tabular-nums text-white/90">
                $943,920
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                11 pagos
              </p>
              <p className="mt-1 text-[13px] font-semibold tabular-nums text-white/90">
                $140,160
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                Finiquito
              </p>
              <p className="mt-1 text-[13px] font-semibold tabular-nums text-white/90">
                $660,720
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-white/[0.08]">
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
              <p className="text-[10px] font-medium text-white/45">Plan de pagos — MSI</p>
              <p className="text-[10px] text-white/30">fin de mes</p>
            </div>
            <table className="w-full text-left text-[11px]">
              <tbody className="divide-y divide-white/[0.05] text-white/70">
                <tr>
                  <td className="px-3 py-1.5 tabular-nums text-white/35">1</td>
                  <td className="py-1.5">Enganche</td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums text-white/85">
                    $943,920
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 tabular-nums text-white/35">2</td>
                  <td className="py-1.5">Mensualidad</td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums text-white/85">
                    $140,160
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 tabular-nums text-white/35">…</td>
                  <td className="py-1.5">Finiquito · dic 2027</td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums text-white/85">
                    $660,720
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <p className="text-[11px] text-white/40">Inventario al momento</p>
            <p className="text-[11px] font-medium text-white/65">PDF listo · en recorrido</p>
          </div>
        </div>
      </div>
    </div>
  );
}
