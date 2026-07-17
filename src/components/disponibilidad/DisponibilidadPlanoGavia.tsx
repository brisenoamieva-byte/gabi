"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Calculator,
  ChevronDown,
  X,
} from "lucide-react";
import type { AsesorDisponibilidadRow } from "@/lib/inventario/asesor-disponibilidad";
import { formatPrice } from "@/lib/data";
import {
  GAVIA_LADO_LABEL,
  GAVIA_NIVEL_LABEL,
  MISION_LA_GAVIA_EDIFICIOS,
  buildGaviaUnidadCodigo,
  decodeMisionLaGaviaUnidad,
  getGaviaEdificioLados,
  getGaviaNivelesOrden,
  isGaviaEdificioCotizable,
  isGaviaVistaApilada,
  type GaviaEdificioLayout,
  type GaviaLado,
} from "@/lib/disponibilidad/planos/mision-la-gavia";
import {
  PLANO_TONE_CLASS,
  PLANO_UNIT_TONE_CLASS,
  classifyDisponibilidadStatus,
  indexUnidadesByEdificioLado,
  ladoKey,
  summarizeLadoStatus,
  type PlanoStatusBucket,
} from "@/lib/disponibilidad/planos/status";
import { resolveGaviaPlantaAssets } from "@/lib/disponibilidad/planos/plantas";
import {
  cotizadorHrefForUnidad,
} from "@/lib/disponibilidad/unit-deep-links";

type DisponibilidadPlanoGaviaProps = {
  unidades: AsesorDisponibilidadRow[];
  onSelectUnidad?: (row: AsesorDisponibilidadRow) => void;
};

type SelectedLado = {
  edificio: GaviaEdificioLayout;
  lado: GaviaLado;
};

const edificiosById = Object.fromEntries(
  MISION_LA_GAVIA_EDIFICIOS.map((edificio) => [edificio.id, edificio]),
) as Record<string, GaviaEdificioLayout>;

export function DisponibilidadPlanoGavia({
  unidades,
  onSelectUnidad,
}: DisponibilidadPlanoGaviaProps) {
  const [selected, setSelected] = useState<SelectedLado | null>(null);
  const [openPlanos, setOpenPlanos] = useState<Record<string, boolean>>({});

  const byLado = useMemo(() => indexUnidadesByEdificioLado(unidades), [unidades]);

  const selectedRows = useMemo(() => {
    if (!selected) {
      return [];
    }
    return byLado.get(ladoKey(selected.edificio.id, selected.lado)) ?? [];
  }, [byLado, selected]);

  const selectedSummary = useMemo(() => summarizeLadoStatus(selectedRows), [selectedRows]);

  const togglePlano = (unidadId: string) => {
    setOpenPlanos((current) => ({
      ...current,
      [unidadId]: !current[unidadId],
    }));
  };

  const closeSheet = () => {
    setSelected(null);
    setOpenPlanos({});
  };

  const renderEdificio = (id: string) => {
    const edificio = edificiosById[id];
    if (!edificio) {
      return null;
    }
    return (
      <EdificioCell
        key={id}
        edificio={edificio}
        lados={getGaviaEdificioLados(edificio)}
        byLado={byLado}
        selected={selected}
        onSelect={(lado) => {
          setOpenPlanos({});
          setSelected({ edificio, lado });
        }}
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
            Plano del desarrollo
          </p>
          <p className="text-sm font-semibold text-[#201044]">Misión La Gavia · edificios A–R</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Cotizables ahora: A · N · P · Q · R. El resto se muestra opaco.
          </p>
        </div>

        <div className="overflow-x-auto overscroll-x-contain bg-white p-3 [-webkit-overflow-scrolling:touch] sm:p-4">
            <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:hidden">
              Desliza el plano →
            </p>
            <div className="mx-auto min-w-[68rem] max-w-6xl space-y-0">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <GaviaNorthCompass />
                <p className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:block">
                  Por lado: PB colinda con la calle
                </p>
              </div>

            {/* Calle norte del conjunto */}
            <StreetHorizontal dir="left" label="Calle" />

            <div className="grid grid-cols-[4.25rem_10.5rem_1.75rem_minmax(32rem,1fr)_1.75rem_10.5rem] gap-0">
              {/* Plaza */}
              <div className="row-span-3 flex items-center justify-center border border-[#c5cfc0] bg-[#d8e0c8] px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[#4d5c42]">
                Plaza
                <br />
                comercial
              </div>

              {/* Columna O–R */}
              <div className="relative space-y-1 border border-dashed border-[#6cc24a]/70 bg-[#f7fff2]/40 p-1">
                <span className="absolute -top-2 left-1 rounded bg-[#fff8d6] px-1 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                  Etapa 1
                </span>
                {renderEdificio("O")}
                {renderEdificio("P")}
                {renderEdificio("Q")}
                {renderEdificio("R")}
              </div>

              {/* Calle vertical izquierda (↓) */}
              <StreetVertical dir="down" />

              {/* Manzana central — centrada en altura frente a O–R / J–G */}
              <div className="flex h-full min-w-0 flex-col justify-center gap-1 bg-white p-1">
                <div className="grid grid-cols-4 gap-1">
                  {renderEdificio("N")}
                  {renderEdificio("M")}
                  {renderEdificio("L")}
                  {renderEdificio("K")}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {renderEdificio("A")}
                  {renderEdificio("B")}
                  {renderEdificio("C")}
                  {renderEdificio("D")}
                </div>
              </div>

              {/* Calle vertical derecha (↑) */}
              <StreetVertical dir="up" />

              {/* Columna J–G */}
              <div className="space-y-1 p-1">
                {renderEdificio("J")}
                {renderEdificio("I")}
                {renderEdificio("H")}
                {renderEdificio("G")}
              </div>
            </div>

            {/* Calle sur horizontal (→) sobre amenidades */}
            <StreetHorizontal dir="right" label="Calle / circulación" />

            {/* Acceso + Amenidades + E F */}
            <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_9.5rem] gap-0">
              <div className="flex flex-col items-center justify-center gap-1 border border-slate-300 bg-white px-2 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  Acceso
                </p>
                <span className="inline-flex items-center gap-0.5 text-slate-500">
                  <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </div>
              <div className="flex items-center justify-center border border-[#d4c6e8] bg-[#e8ddf5] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-[#5b4578]">
                Amenidades
              </div>
              <div className="grid grid-cols-2 gap-1 border border-slate-200 bg-white p-1">
                {renderEdificio("E")}
                {renderEdificio("F")}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <LegendSwatch className="bg-[#e8dcc8] ring-1 ring-[#c4b49a]/80" label="Triplex 3 recámaras" />
            <LegendSwatch className="bg-[#d7e8f2] ring-1 ring-[#9bb8cb]/80" label="Triplex 2 recámaras" />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            <LegendDot className="bg-emerald-400" label="Disponible" />
            <LegendDot className="bg-amber-400" label="Apartado" />
            <LegendDot className="bg-slate-400" label="Vendido" />
            <LegendDot className="bg-slate-300" label="Bloqueado" />
            <span className="text-slate-400">
              · Fondo gris = calle · flechas = sentido de circulación
            </span>
          </div>
        </div>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={closeSheet}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeSheet();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edificio ${selected.edificio.id} ${GAVIA_LADO_LABEL[selected.lado]}`}
            className="max-h-[min(90dvh,90vh)] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_20px_50px_rgba(15,23,42,0.2)] sm:max-w-lg sm:rounded-2xl sm:pb-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  Edificio {selected.edificio.id} · {GAVIA_LADO_LABEL[selected.lado]}
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-[#201044]">
                  {selected.edificio.tipologia === "3R"
                    ? "Triplex 3 recámaras"
                    : "Triplex 2 recámaras"}{" "}
                  · 3 niveles
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">{selectedSummary.tip}</p>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <ul className="divide-y divide-slate-100 px-2 py-2">
              {selectedRows.length ? (
                selectedRows.map((row) => {
                  const decoded = decodeMisionLaGaviaUnidad(row.unidad);
                  const tone = classifyDisponibilidadStatus(row.estatusSembrado);
                  const plantas =
                    decoded != null
                      ? resolveGaviaPlantaAssets(
                          selected.edificio.tipologia,
                          decoded.lado,
                          decoded.nivel,
                        )
                      : null;
                  const isOpen = Boolean(openPlanos[row.unidadId]);

                  return (
                    <li key={row.unidadId}>
                      <div
                        className={`m-2 rounded-xl border p-3 ${PLANO_UNIT_TONE_CLASS[tone]}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#201044]">
                            Depto {row.unidad}
                          </p>
                          <p className="text-xs text-slate-500">
                            {decoded ? GAVIA_NIVEL_LABEL[decoded.nivel] : "Nivel"}
                            {row.tipo ? ` · ${row.tipo}` : ""}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-600">
                            {row.precio ? formatPrice(row.precio) : "Sin precio"}
                            {row.listaPrecios ? ` · ${row.listaPrecios}` : ""}
                          </p>
                          <span className="mt-2 inline-flex rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
                            {row.estatusLabel}
                          </span>
                        </div>

                        {plantas ? (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => togglePlano(row.unidadId)}
                              className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#201044] transition hover:bg-slate-50"
                              aria-expanded={isOpen}
                            >
                              <span>{isOpen ? "Ocultar planta" : "Ver planta arquitectónica"}</span>
                              <ChevronDown
                                className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
                                strokeWidth={2}
                              />
                            </button>
                            {isOpen ? (
                              <div className="mt-2 space-y-3">
                                <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                  <figcaption className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                    Planta
                                  </figcaption>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={plantas.plantaSrc}
                                    alt={`Planta arquitectónica ${row.unidad}`}
                                    className="h-auto w-full object-contain"
                                    loading="lazy"
                                  />
                                </figure>
                                {plantas.roofSrc ? (
                                  <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <figcaption className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                      Roof garden
                                    </figcaption>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={plantas.roofSrc}
                                      alt={`Roof garden ${row.unidad}`}
                                      className="h-auto w-full object-contain"
                                      loading="lazy"
                                    />
                                  </figure>
                                ) : (
                                  <p className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-center text-[11px] text-slate-400">
                                    Roof garden: N/A en este nivel
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {onSelectUnidad ? (
                            <button
                              type="button"
                              onClick={() => onSelectUnidad(row)}
                              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#201044] transition hover:bg-slate-50"
                            >
                              Ver en lista
                            </button>
                          ) : null}
                          <Link
                            href={cotizadorHrefForUnidad(row)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#201044] px-3 text-xs font-semibold text-white transition hover:bg-[#2a1760]"
                          >
                            <Calculator className="h-3.5 w-3.5" strokeWidth={2} />
                            Cotizar
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="px-4 py-10 text-center text-sm text-slate-500">
                  No hay unidades cargadas en este lado.
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StreetVertical({ dir }: { dir: "up" | "down" }) {
  const Icon = dir === "up" ? ArrowUp : ArrowDown;
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 border border-slate-200/80 bg-white"
      title="Calle · sentido de circulación"
      aria-label="Calle · sentido de circulación"
    >
      <Icon className="h-4 w-4 text-slate-700" strokeWidth={2.75} />
      <span className="rotate-180 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 [writing-mode:vertical-rl]">
        Calle
      </span>
      <Icon className="h-4 w-4 text-slate-700" strokeWidth={2.75} />
    </div>
  );
}

function StreetHorizontal({
  dir,
  label,
}: {
  dir: "left" | "right";
  label: string;
}) {
  return (
    <div
      className="flex h-7 items-center justify-center gap-2 border border-slate-200/80 bg-white"
      title={`${label} · sentido de circulación`}
      aria-label={`${label} · sentido de circulación`}
    >
      {dir === "left" ? (
        <>
          <ArrowRight className="h-3.5 w-3.5 rotate-180 text-slate-700" strokeWidth={2.75} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </span>
          <ArrowRight className="h-3.5 w-3.5 rotate-180 text-slate-700" strokeWidth={2.75} />
        </>
      ) : (
        <>
          <ArrowRight className="h-3.5 w-3.5 text-slate-700" strokeWidth={2.75} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-700" strokeWidth={2.75} />
        </>
      )}
    </div>
  );
}

function EdificioCell({
  edificio,
  lados,
  byLado,
  selected,
  onSelect,
}: {
  edificio: GaviaEdificioLayout;
  lados: GaviaLado[];
  byLado: Map<string, AsesorDisponibilidadRow[]>;
  selected: SelectedLado | null;
  onSelect: (lado: GaviaLado) => void;
}) {
  const tipologiaBg =
    edificio.tipologia === "2R" ? "bg-[#d7e8f2]/90" : "bg-[#e8dcc8]/90";

  /** PB siempre hacia la calle de acceso del edificio. */
  const nivelesOrden = getGaviaNivelesOrden(edificio);
  const apilado = isGaviaVistaApilada(edificio);
  const cotizable = isGaviaEdificioCotizable(edificio);

  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-lg p-1 transition ${tipologiaBg} ${
        cotizable ? "" : "pointer-events-none opacity-55"
      }`}
      aria-disabled={!cotizable}
      title={
        cotizable
          ? `Edificio ${edificio.id} · ${edificio.tipologia === "3R" ? "3 recámaras" : "2 recámaras"}`
          : `Edificio ${edificio.id} · aún no cotizable`
      }
    >
      <span className="pointer-events-none absolute right-1 top-1 z-[1] rounded bg-white/80 px-1 text-[8px] font-bold uppercase tracking-wide text-slate-600">
        {edificio.tipologia === "3R" ? "3 rec" : "2 rec"}
      </span>
      <div
        className={`grid min-w-0 gap-1 ${
          apilado || lados.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {lados.map((lado) => {
          const rows = byLado.get(ladoKey(edificio.id, lado)) ?? [];
          const byNivel = new Map<1 | 2 | 3, AsesorDisponibilidadRow>();
          for (const row of rows) {
            const decoded = decodeMisionLaGaviaUnidad(row.unidad);
            if (decoded) {
              byNivel.set(decoded.nivel, row);
            }
          }
          const isActive =
            cotizable &&
            selected?.edificio.id === edificio.id &&
            selected.lado === lado;

          return (
            <div
              key={lado}
              className={`min-w-0 overflow-hidden rounded-md border border-black/5 bg-white/70 p-0.5 ${
                isActive ? "ring-2 ring-[#201044]/40" : ""
              }`}
            >
              <p className="mb-0.5 truncate px-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-[#201044]">
                {edificio.id} {lado}
              </p>
              <div
                className={`grid gap-0.5 ${
                  apilado ? "grid-cols-3" : "grid-cols-1"
                }`}
              >
                {nivelesOrden.map((nivel) => {
                  const codigo = buildGaviaUnidadCodigo(edificio.id, lado, nivel);
                  const row = byNivel.get(nivel);
                  const tone: PlanoStatusBucket = row
                    ? classifyDisponibilidadStatus(row.estatusSembrado)
                    : "otro";
                  const nivelShort = nivel === 1 ? "PB" : String(nivel);
                  const unidadShort = row
                    ? row.unidad.replace(`${edificio.id}-`, "")
                    : "—";

                  return (
                    <button
                      key={codigo}
                      type="button"
                      disabled={!cotizable}
                      tabIndex={cotizable ? 0 : -1}
                      title={
                        !cotizable
                          ? `Edificio ${edificio.id} · aún no cotizable`
                          : row
                            ? `${codigo} · ${GAVIA_NIVEL_LABEL[nivel]} · ${row.estatusLabel}`
                            : `${codigo} · ${GAVIA_NIVEL_LABEL[nivel]} · sin inventario`
                      }
                      onClick={() => {
                        if (cotizable) {
                          onSelect(lado);
                        }
                      }}
                      className={`flex min-h-10 min-w-0 touch-manipulation flex-col items-center justify-center gap-0 overflow-hidden rounded-md border px-0.5 py-1 text-center transition ${
                        PLANO_TONE_CLASS[tone]
                      } ${
                        cotizable
                          ? `active:scale-[0.98] ${row ? "hover:brightness-[0.97]" : "opacity-50"}`
                          : "cursor-not-allowed"
                      }`}
                    >
                      <span className="text-[9px] font-bold leading-none tracking-wide">
                        {nivelShort}
                      </span>
                      <span className="max-w-full truncate text-[10px] font-semibold leading-tight tabular-nums tracking-tight">
                        {unidadShort}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
      <span className={`h-3 w-4 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

/**
 * Rosa de los vientos alineada al plano comercial Gavia:
 * con la misma disposición (plaza a la izquierda, acceso abajo),
 * el norte apunta ~135° hacia la esquina inferior izquierda.
 */
function GaviaNorthCompass() {
  return (
    <div
      className="inline-flex items-center gap-2"
      title="Norte según plano comercial del desarrollo"
      aria-label="Orientación: norte hacia la esquina inferior izquierda del plano"
    >
      <div className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white shadow-sm">
        <div
          className="absolute inset-0 flex items-start justify-center pt-1"
          style={{ transform: "rotate(-135deg)" }}
        >
          <span className="flex flex-col items-center leading-none">
            <span className="text-[11px] font-black text-[#201044]">N</span>
            <span
              className="mt-0.5 h-0 w-0 border-x-[4px] border-b-[9px] border-x-transparent border-b-[#201044]"
              aria-hidden
            />
          </span>
        </div>
        <span className="pointer-events-none absolute inset-[3px] rounded-full border border-dashed border-slate-200" />
      </div>
      <span className="hidden text-[10px] font-medium leading-tight text-slate-500 sm:inline">
        Norte
        <br />
        (plano comercial)
      </span>
    </div>
  );
}
