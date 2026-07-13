"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ReporteSemanalAbsorcionMes,
  ReporteSemanalAbsorcionModelo,
  ReporteSemanalAvanceVentas,
  ReporteSemanalFunnelSegmento,
  ReporteSemanalMatrizCelda,
  ReporteSemanalMedio,
  ReporteSemanalObjetivoIngresos,
  ReporteSemanalSeguimiento,
} from "@/lib/admin/reporte-semanal/types";

const FOREST = "#1a4d3e";
const SAND = "#c4a574";
const MINT = "#6cc24a";
const SLATE = "#64748b";
const DEPTOS = "#1a4d3e";
const OFICINAS = "#3d7a6a";
const LINE_AFLU = "#c4a574";
const LINE_CITAS = "#6cc24a";

const PIE_COLORS = [
  FOREST,
  "#2d6a5a",
  MINT,
  SAND,
  "#8b7355",
  "#4a90a4",
  "#7c6ba8",
  "#d4845a",
  SLATE,
];

function formatMoneyShort(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gabi-forest/10 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 px-5 py-3">
        <h4 className="font-bold text-gabi-forest">{title}</h4>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function MediosDonutChart({ medios }: { medios: ReporteSemanalMedio[] }) {
  const top = medios.filter((m) => m.semana > 0).slice(0, 8);
  if (!top.length) return null;

  const data = top.map((m) => ({ name: m.medio, value: m.semana }));

  return (
    <ChartCard title="Medición de medios" subtitle="Distribución semanal (% prospectos)">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="h-56 w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v ?? 0, "Prospectos"]} />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-1 pr-3">Medio</th>
                <th className="py-1 pr-3">Sem.</th>
                <th className="py-1 pr-3">Mes</th>
                <th className="py-1 pr-3">Acum.</th>
                <th className="py-1">% sem.</th>
              </tr>
            </thead>
            <tbody>
              {medios.slice(0, 12).map((m) => (
                <tr key={m.medio} className="border-t border-slate-50">
                  <td className="py-1.5 pr-3 font-medium text-gabi-forest">{m.medio}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{m.semana}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{m.mes}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{m.acumulado}</td>
                  <td className="py-1.5 tabular-nums">{m.pctSemana}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ChartCard>
  );
}

export function FunnelPorMedioChart({ funnel }: { funnel: ReporteSemanalFunnelSegmento }) {
  const data = funnel.porMedio.slice(0, 8).map((m) => ({
    medio: m.medio.length > 18 ? `${m.medio.slice(0, 16)}…` : m.medio,
    Afluencia: m.afluencia,
    Cotizaciones: m.cotizaciones,
    Citas: m.citas,
    Apartados: m.apartados,
    Ventas: m.ventas,
    Asignaciones: m.asignaciones,
  }));

  if (!data.length) return null;

  return (
    <ChartCard
      title={`Funnel comercial — ${funnel.label}`}
      subtitle="Afluencia → cotizaciones → citas → apartados (periodo) → ventas (periodo) por medio"
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {(
          [
            ["Afluencia", funnel.etapas.afluencia],
            ["Cotizaciones", funnel.etapas.cotizaciones],
            ["Citas", funnel.etapas.citas],
            ["Apart. periodo", funnel.etapas.apartadosPeriodo],
            ["Apart. vigentes", funnel.etapas.apartadosVigentes],
            ["Ventas periodo", funnel.etapas.ventasPeriodo],
            ["Asignaciones", funnel.etapas.asignacionesPeriodo],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
            <p className="text-lg font-black tabular-nums text-gabi-forest">{value}</p>
          </div>
        ))}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="medio" tick={{ fontSize: 10 }} angle={-28} textAnchor="end" height={56} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Afluencia" fill={FOREST} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Cotizaciones" fill="#94a3b8" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Apartados" fill={SAND} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Ventas" fill={MINT} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function AbsorcionMensualChart({ series }: { series: ReporteSemanalAbsorcionMes[] }) {
  if (!series.length) return null;

  const desdeLabel = series[0]?.mes ?? "";
  const hastaLabel = series[series.length - 1]?.mes ?? "";

  return (
    <ChartCard
      title="Absorción mensual histórica"
      subtitle={`Apartados por segmento, afluencia y citas/visitas (${desdeLabel} → ${hastaLabel})`}
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="apartadosDeptos" name="Apart. deptos" fill={DEPTOS} radius={[2, 2, 0, 0]} />
            <Bar yAxisId="left" dataKey="apartadosOficinas" name="Apart. oficinas" fill={OFICINAS} radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="afluencia" name="Afluencia" stroke={LINE_AFLU} strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="citasVisitas" name="Citas/visitas" stroke={LINE_CITAS} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function SeguimientoChart({ items }: { items: ReporteSemanalSeguimiento[] }) {
  if (!items.length) return null;

  const data = items.map((i) => ({
    estatus: i.estatus.length > 22 ? `${i.estatus.slice(0, 20)}…` : i.estatus,
    semana: i.semana,
    mes: i.mes,
    pctMes: i.pctMes,
  }));

  return (
    <ChartCard title="Resumen de seguimiento" subtitle="Estatus de prospectos — semana vs mes">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="estatus" width={140} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="semana" name="Semana" fill={FOREST} radius={[0, 3, 3, 0]} />
            <Bar dataKey="mes" name="Mes" fill={SAND} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function BulletRow({
  label,
  real,
  objetivo,
  format = (v: number) => String(v),
}: {
  label: string;
  real: number;
  objetivo: number;
  format?: (v: number) => string;
}) {
  const pct = objetivo > 0 ? Math.min((real / objetivo) * 100, 100) : 0;
  const diff = real - objetivo;

  return (
    <div>
      <div className="mb-1 flex items-end justify-between gap-2 text-sm">
        <span className="font-semibold text-gabi-forest">{label}</span>
        <span className="tabular-nums text-slate-600">
          {format(real)} / {format(objetivo)}{" "}
          <span className={diff >= 0 ? "text-emerald-600" : "text-amber-600"}>
            ({diff >= 0 ? "+" : ""}
            {format(diff)})
          </span>
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gabi-forest/20"
          style={{ width: "100%" }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gabi-forest transition-all"
          style={{ width: `${Math.max(pct, real ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export function AvanceObjetivosChart({ avance }: { avance: ReporteSemanalAvanceVentas }) {
  return (
    <ChartCard title="Avance de ventas" subtitle="Real vs objetivo anual">
      <div className="space-y-4">
        <BulletRow label="Ventas (unidades)" real={avance.ventas} objetivo={avance.ventasObjetivo} />
        <BulletRow
          label="Apartados + ventas vigentes"
          real={avance.apartadosVentasVigentes}
          objetivo={avance.apartadosObjetivo}
        />
        <div className="grid grid-cols-3 gap-2 pt-2 text-center text-sm">
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-[10px] uppercase text-slate-400">Cancelaciones</p>
            <p className="font-bold tabular-nums">{avance.cancelaciones}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-[10px] uppercase text-slate-400">Asignados</p>
            <p className="font-bold tabular-nums">{avance.asignados}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-[10px] uppercase text-slate-400">Absorción</p>
            <p className="font-bold tabular-nums">
              {avance.absorcionPct != null ? `${avance.absorcionPct}%` : "—"}
            </p>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export function PrecioM2Chart({
  real,
  objetivo,
  inventario,
}: {
  real: number | null;
  objetivo: number | null;
  inventario: number | null;
}) {
  const data = [
    { name: "Real", value: real ?? 0, fill: FOREST },
    { name: "Objetivo", value: objetivo ?? 0, fill: SAND },
    { name: "Inventario", value: inventario ?? 0, fill: SLATE },
  ].filter((d) => d.value > 0);

  if (!data.length) return null;

  return (
    <ChartCard title="Precio por m²" subtitle="Promedio real, objetivo e inventario disponible">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoneyShort(v)} />
            <Tooltip formatter={(v) => [formatMoneyShort(Number(v ?? 0)), ""]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ObjetivoIngresosChart({ obj }: { obj: ReporteSemanalObjetivoIngresos }) {
  const rows = [
    { label: "Caja (semana)", pct: obj.pctCaja, monto: obj.cajaReal },
    { label: "Comprometidos", pct: obj.pctComprometidos, monto: obj.comprometidos },
    { label: "Acumulado vs meta anual", pct: obj.pctTotal, monto: obj.pctTotal },
  ];

  return (
    <ChartCard
      title="Objetivo de ingresos"
      subtitle={`Meta anual ${formatMoneyShort(obj.totalObjetivo)}`}
    >
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold text-gabi-forest">{row.label}</span>
              <span className="tabular-nums text-slate-600">
                {row.label.includes("Acumulado") ? `${row.pct}%` : formatMoneyShort(row.monto)} · {row.pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gabi-forest to-[#2d6a5a]"
                style={{ width: `${Math.min(row.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export function AbsorcionModeloChart({ items }: { items: ReporteSemanalAbsorcionModelo[] }) {
  const data = items.slice(0, 10).map((i) => ({
    modelo: i.modelo,
    Ventas: i.ventas,
    Apartados: i.apartados,
    Asignados: i.asignados,
  }));

  if (!data.length) return null;

  return (
    <ChartCard title="Absorción por modelo" subtitle="Ventas, apartados y asignados por tipología">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="modelo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Ventas" fill={FOREST} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Apartados" fill={SAND} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Asignados" fill={MINT} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function InventarioHeatmap({ celdas }: { celdas: ReporteSemanalMatrizCelda[] }) {
  if (!celdas.length) return null;

  const listas = Array.from(new Set(celdas.map((c) => c.lista))).sort();
  const modelos = Array.from(new Set(celdas.map((c) => c.modelo))).sort();
  const lookup = new Map(celdas.map((c) => [`${c.lista}::${c.modelo}`, c.disponibles]));
  const max = Math.max(...celdas.map((c) => c.disponibles), 1);

  function cellColor(n: number) {
    if (n === 0) return "bg-slate-50 text-slate-300";
    const intensity = n / max;
    if (intensity > 0.66) return "bg-emerald-600 text-white";
    if (intensity > 0.33) return "bg-emerald-400 text-white";
    return "bg-emerald-100 text-emerald-900";
  }

  return (
    <ChartCard title="Matriz de inventario" subtitle="Unidades disponibles — lista × modelo">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-1 text-left font-bold text-gabi-forest">
                Lista \ Modelo
              </th>
              {modelos.map((m) => (
                <th key={m} className="px-2 py-1 text-center font-semibold text-slate-500">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listas.map((lista) => (
              <tr key={lista}>
                <td className="sticky left-0 bg-white px-2 py-1 font-semibold text-gabi-forest">
                  {lista}
                </td>
                {modelos.map((modelo) => {
                  const n = lookup.get(`${lista}::${modelo}`) ?? 0;
                  return (
                    <td key={modelo} className="p-0.5">
                      <div
                        className={`flex h-8 min-w-[2rem] items-center justify-center rounded font-bold tabular-nums ${cellColor(n)}`}
                      >
                        {n || "·"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

export function IngresosColumnasTable({
  cols,
}: {
  cols: {
    anterior: number;
    mesActual: number;
    acumulado: number;
    mesSiguienteObjetivo: number;
    diferenciaAcumulado: number;
  };
}) {
  const format = (v: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

  return (
    <ChartCard title="Ingresos por periodo" subtitle="Comparativo mensual y acumulado vs objetivo">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["Mes anterior", cols.anterior],
            ["Mes actual", cols.mesActual],
            ["Acumulado YTD", cols.acumulado],
            ["Obj. mes sig.", cols.mesSiguienteObjetivo],
            ["Dif. acumulado", cols.diferenciaAcumulado],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p
              className={`mt-1 text-lg font-black tabular-nums ${
                label === "Dif. acumulado" && value < 0 ? "text-amber-700" : "text-gabi-forest"
              }`}
            >
              {format(value)}
            </p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
