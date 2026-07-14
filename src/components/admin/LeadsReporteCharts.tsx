"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  LeadsReporteCampana,
  LeadsReporteDia,
  LeadsReporteMes,
  LeadsReporteRegion,
} from "@/lib/admin/leads-reporte-service";
import { BarValueLabel, PieValueLabel } from "@/components/admin/chart-value-labels";

const FOREST = "#1a4d3e";
const MINT = "#6cc24a";
const SAND = "#c4a574";
const VIOLET = "#7c6ba8";
const SLATE = "#64748b";

const PIE_COLORS = [FOREST, MINT, SAND, VIOLET, "#4a90a4", "#d4845a", "#2d6a5a", SLATE];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-gabi-forest">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

export function LeadsTimeSeriesChart({
  series,
  mode,
}: {
  series: LeadsReporteDia[] | LeadsReporteMes[];
  mode: "dia" | "mes";
}) {
  const data = series.map((item) => ({
    label:
      mode === "mes"
        ? (item as LeadsReporteMes).label
        : (item as LeadsReporteDia).fecha.slice(8),
    validos: item.validos,
    duplicados: item.duplicados,
    total: item.total,
  }));

  if (!data.length || data.every((item) => item.total === 0)) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-500">
        Sin leads en el periodo.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip
          formatter={(value, name) => [
            Number(value ?? 0),
            name === "validos" ? "Válidos" : "Duplicados",
          ]}
        />
        <Legend formatter={(value) => (value === "validos" ? "Válidos" : "Duplicados")} />
        <Bar dataKey="validos" stackId="leads" fill={FOREST} radius={[0, 0, 0, 0]}>
          <LabelList dataKey="validos" content={<BarValueLabel position="center" />} />
        </Bar>
        <Bar dataKey="duplicados" stackId="leads" fill={MINT} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="total" content={<BarValueLabel position="top" />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsCampanaChart({ campanas }: { campanas: LeadsReporteCampana[] }) {
  const data = campanas.slice(0, 12).map((item) => ({
    name: item.campanaNombre.length > 28 ? `${item.campanaNombre.slice(0, 26)}…` : item.campanaNombre,
    fullName: item.campanaNombre,
    total: item.total,
    validos: item.validos,
  }));

  if (!data.length) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-500">
        Sin campañas en el periodo.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value) => [Number(value ?? 0), "Leads"]}
          labelFormatter={(_, payload) =>
            payload?.[0]?.payload?.fullName ? String(payload[0].payload.fullName) : ""
          }
        />
        <Bar dataKey="total" fill={FOREST} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="total" content={<BarValueLabel position="right" />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsCalificacionChart({
  porCalificacion,
}: {
  porCalificacion: Record<string, number>;
}) {
  const data = Object.entries(porCalificacion)
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  if (!data.length) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-500">
        Sin calificaciones en el periodo.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9 }}
          angle={-28}
          textAnchor="end"
          interval={0}
          height={56}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip />
        <Bar dataKey="value" fill={VIOLET} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="value" content={<BarValueLabel position="top" />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsRegionChart({ regiones }: { regiones: LeadsReporteRegion[] }) {
  const top = regiones.slice(0, 10);
  const data = top.map((item) => ({
    name: item.region.length > 22 ? `${item.region.slice(0, 20)}…` : item.region,
    fullName: item.region,
    total: item.total,
  }));

  if (!data.length) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-500">
        Sin datos de región (origen_ciudad).
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9 }}
          angle={-28}
          textAnchor="end"
          interval={0}
          height={56}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip
          labelFormatter={(_, payload) =>
            payload?.[0]?.payload?.fullName ? String(payload[0].payload.fullName) : ""
          }
        />
        <Bar dataKey="total" fill={SAND} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="total" content={<BarValueLabel position="top" />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsScoreDistribucionChart({
  distribucion,
  emptyLabel,
}: {
  distribucion: Record<string, number>;
  emptyLabel: string;
}) {
  const order = ["0-2", "3-4", "5-6", "7-8", "9-10"];
  const data = order
    .map((name) => ({ name, value: distribucion[name] ?? 0 }))
    .filter((item) => item.value > 0);

  if (!data.length) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip formatter={(value) => [Number(value ?? 0), "Respuestas"]} />
        <Bar dataKey="value" fill={VIOLET} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="value" content={<BarValueLabel position="top" />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsInteraccionesDonut({
  items,
}: {
  items: Array<{ name: string; value: number }>;
}) {
  const filtered = items.filter((item) => item.value > 0);

  if (!filtered.length) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-slate-500">
        Sin banderas de interacción en el periodo (import Xperience o captura en CRM).
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={88}
          paddingAngle={2}
          label={PieValueLabel}
          labelLine={false}
        >
          {filtered.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export { ChartCard };
