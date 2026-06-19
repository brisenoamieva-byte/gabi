"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  Landmark,
  MapPin,
  Route,
  ShoppingBag,
  Sparkles,
  Store,
  Trees,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatPrice, getPrototipoById, type DisponibilidadUnidad, type PuntoInteres } from "@/lib/data";
import type { RecorridoZonaContent } from "@/lib/catalog/recorrido-content";
import { formatSuperficiesLabel } from "@/lib/inventario/productos-recomendados";
import {
  availabilityStatusClass,
  availabilityStatusLabel,
  availabilityTypeLabel,
} from "@/lib/recorrido/filters";
import { formatRecorridoMoney } from "@/lib/recorrido/format";
import type { RecommendedAvailability } from "@/lib/recorrido/types";

export function StepCard({
  eyebrow,
  title,
  tip,
  children,
}: {
  eyebrow: string;
  title: string;
  tip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#6CC24A]">
          {eyebrow}
        </p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="text-3xl font-black text-[#201044] md:text-5xl">{title}</h2>
          <div className="flex max-w-xl items-start gap-3 rounded-2xl bg-[#6CC24A]/15 p-4 text-[#201044]">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#6CC24A]" />
            <p className="font-bold">{tip}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function BudgetCurrencyInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const clamp = (amount: number) => Math.min(max, Math.max(min, amount));

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={editing ? draft : formatRecorridoMoney(value)}
      onFocus={(event) => {
        setEditing(true);
        setDraft(String(value));
        requestAnimationFrame(() => event.target.select());
      }}
      onBlur={() => {
        setEditing(false);
        const parsed = clamp(Number(draft.replace(/\D/g, "")) || min);
        onChange(parsed);
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "");
        setDraft(digits);
        if (digits) {
          onChange(clamp(Number(digits)));
        }
      }}
      className="input-xl tabular-nums tracking-tight"
      aria-label="Presupuesto aproximado en pesos mexicanos"
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-black text-[#201044]">{label}</span>
      {children}
    </label>
  );
}

export function PriceSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  const optionValues = options.includes(value)
    ? options
    : [...options, value].sort((a, b) => a - b);

  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="input-xl appearance-none"
      >
        {optionValues.map((option) => (
          <option key={option} value={option}>
            {formatPrice(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function AvailabilityUnitCard({
  unit,
  recommendation,
  rank,
  selected,
  onSelect,
}: {
  unit: DisponibilidadUnidad;
  recommendation?: RecommendedAvailability;
  rank?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const prototipo = recommendation?.prototipo ?? (unit.prototipoId ? getPrototipoById(unit.prototipoId) : undefined);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.5rem] p-4 text-left shadow-lg transition active:scale-[0.99] ${
        selected ? "bg-[#201044] text-white" : "bg-white text-[#201044]"
      }`}
    >
      <div className="flex items-start gap-3">
        {rank ? (
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black ${
              selected ? "bg-[#6CC24A] text-white" : "bg-[#6CC24A]/15 text-[#6CC24A]"
            }`}
          >
            {rank}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-black">{unit.unidad}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${availabilityStatusClass[unit.estatus]}`}
            >
              {availabilityStatusLabel[unit.estatus]}
            </span>
          </span>
          <span className="mt-1 block text-sm font-semibold opacity-75">
            {prototipo?.nombre ?? availabilityTypeLabel[unit.tipo]}
            {unit.precio ? ` | ${formatRecorridoMoney(unit.precio)}` : ""}
            {formatSuperficiesLabel(unit) ? ` | ${formatSuperficiesLabel(unit)}` : ""}
            {unit.entrega ? ` | Entrega ${unit.entrega}` : ""}
          </span>
          <span className="mt-3 block rounded-2xl bg-white/10 p-3 text-sm font-semibold">
            {recommendation?.reasons[0] ??
              unit.razonesVenta[0] ??
              "Unidad disponible para comparar con el cliente."}
          </span>
        </span>
      </div>
    </button>
  );
}

export function AvailabilityUnitDetail({
  unit,
  recommendation,
  onShow,
  onQuote,
}: {
  unit?: DisponibilidadUnidad;
  recommendation?: RecommendedAvailability;
  onShow: () => void;
  onQuote: () => void;
}) {
  if (!unit) {
    return (
      <div className="rounded-[2rem] bg-white p-5 shadow-lg">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#6CC24A]">
          Unidad seleccionada
        </p>
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 font-semibold text-slate-500">
          No hay unidades disponibles cargadas para este cluster.
        </p>
      </div>
    );
  }

  const reasons = (recommendation?.reasons ?? unit.razonesVenta).slice(0, 3);

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-lg">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#6CC24A]">
        Unidad seleccionada
      </p>
      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-[#201044]">{unit.unidad}</h3>
            <p className="mt-1 font-semibold capitalize text-slate-500">
              {unit.tipo}
              {unit.etapa ? ` | Etapa ${unit.etapa}` : ""}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-2 text-xs font-black ${availabilityStatusClass[unit.estatus]}`}
          >
            {availabilityStatusLabel[unit.estatus]}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Spec label="Precio" value={unit.precio ? formatRecorridoMoney(unit.precio) : "Por confirmar"} />
          <Spec
            label="Superficie"
            value={formatSuperficiesLabel(unit) || "Por confirmar"}
          />
          <Spec label="Entrega" value={unit.entrega ?? "Por confirmar"} />
          <Spec label="Nivel" value={unit.nivel ?? "-"} />
        </div>
        {reasons.length ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">Qué decir</p>
            <div className="mt-3 space-y-2">
              {reasons.map((reason) => (
                <p key={reason} className="flex gap-2 text-sm font-semibold text-[#201044]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
                  {reason}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        {unit.instruccionRecorrido && (
          <p className="rounded-2xl bg-[#6CC24A]/10 p-4 text-sm font-bold text-[#201044]">
            Recorrido: {unit.instruccionRecorrido}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onShow}
            className="rounded-2xl border border-[#201044]/20 bg-white px-4 py-4 text-sm font-black text-[#201044] shadow-sm"
          >
            Mostrar esta unidad
          </button>
          <button
            type="button"
            disabled={!unit.prototipoId}
            onClick={onQuote}
            className="rounded-2xl bg-[#6CC24A] px-4 py-4 text-sm font-black text-white shadow-sm disabled:opacity-40"
          >
            Usar para cotización
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToggleGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-14 rounded-xl px-4 text-base font-black transition ${
            value === option.value ? "bg-[#201044] text-white shadow" : "text-slate-500"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleCard({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-2xl p-5 text-left text-lg font-black shadow-sm transition ${
        checked ? "bg-[#201044] text-white" : "bg-slate-50 text-[#201044]"
      }`}
    >
      <span className="mb-3 block">{label}</span>
      <span className="text-sm opacity-75">{checked ? "Sí" : "No"}</span>
    </button>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-2xl font-black text-[#201044] md:text-3xl">{title}</h2>;
}

export function ProductNarrativeCard({
  step,
  title,
  subtitle,
  icon,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.3 }}
      className="rounded-[2rem] bg-white p-5 shadow-lg md:p-7"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6CC24A]">
            Paso {step}
          </p>
          <h3 className="mt-2 text-2xl font-black text-[#201044] md:text-4xl">
            {title}
          </h3>
          <p className="mt-2 max-w-3xl text-base font-semibold text-slate-500 md:text-lg">
            {subtitle}
          </p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#201044] text-white">
          {icon}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

export function ZoneMap({ zona }: { zona: RecorridoZonaContent }) {
  const destacados = zona.puntosCercanos.filter((punto) => punto.destacado);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg">
      <div className="relative h-[280px] bg-slate-100 md:h-[420px]">
        <iframe
          title={`Mapa de ubicación · ${zona.centro}`}
          src={zona.mapaEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6CC24A]">
            Punto central
          </p>
          <p className="mt-1 text-lg font-black text-[#201044]">{zona.centro}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            {zona.direccion}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <a
          href={zona.mapaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-[#201044] px-4 text-center text-sm font-black text-white transition hover:bg-[#35156D] active:scale-95"
        >
          Abrir ubicación exacta en Google Maps
        </a>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Referencias clave
          </p>
          <div className="flex flex-wrap gap-2">
            {destacados.map((punto) => (
              <span
                key={punto.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#6CC24A]/25 bg-[#6CC24A]/10 px-3 py-1.5 text-xs font-bold text-[#201044]"
              >
                <MapPin className="h-3 w-3 text-[#6CC24A]" />
                {punto.nombre} · {punto.tiempo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const categoriaIconMap: Record<string, LucideIcon> = {
  Comercio: ShoppingBag,
  Supermercados: Store,
  Educación: GraduationCap,
  Salud: HeartPulse,
  Conectividad: Route,
  "Cultura y ocio": Landmark,
  Empleo: Briefcase,
  "Vida diaria": UtensilsCrossed,
  Entorno: Trees,
};

export function NearbyPointCard({ punto }: { punto: PuntoInteres }) {
  const Icon = categoriaIconMap[punto.categoria] ?? MapPin;

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        punto.destacado
          ? "border-[#6CC24A]/35 bg-[#6CC24A]/8"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            punto.destacado ? "bg-[#201044] text-white" : "bg-slate-100 text-[#201044]"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#6CC24A]">
              {punto.categoria}
            </p>
            {punto.destacado ? (
              <span className="rounded-full bg-[#201044] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Clave
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-black leading-snug text-[#201044]">{punto.nombre}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Aprox. {punto.tiempo}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{punto.detalle}</p>
        </div>
      </div>
    </article>
  );
}

export function NearbyPointsPanel({ zona }: { zona: RecorridoZonaContent }) {
  const grouped = useMemo(() => {
    const map = new Map<string, PuntoInteres[]>();

    for (const categoria of zona.categoriasOrden) {
      const items = zona.puntosCercanos.filter((punto) => punto.categoria === categoria);
      if (items.length) {
        map.set(categoria, items);
      }
    }

    return map;
  }, [zona]);

  return (
    <div className="max-h-[520px] space-y-5 overflow-y-auto pr-1">
      {Array.from(grouped.entries()).map(([categoria, puntos]) => (
        <section key={categoria}>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#201044]">
            {categoria}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {puntos.length}
            </span>
          </h4>
          <div className="grid gap-3">
            {puntos.map((punto) => (
              <NearbyPointCard key={punto.id} punto={punto} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-black text-[#201044]">{value}</p>
    </div>
  );
}

export function ListBox({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-lg">
      <h3 className="mb-4 text-lg font-black text-[#201044]">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="flex gap-2 text-sm font-semibold text-slate-600">
            {positive ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22c55e]" />
            ) : (
              <X className="h-5 w-5 shrink-0 text-slate-400" />
            )}
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  size = "default",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/70 p-2 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-h-[94vh] w-full overflow-auto rounded-[2rem] bg-white p-5 shadow-2xl md:p-8 ${
          size === "wide" ? "max-w-[96rem]" : "max-w-5xl"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#201044] md:text-3xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-[#201044]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function SummaryBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <h3 className="mb-3 text-lg font-black text-[#201044]">{title}</h3>
      <div className="space-y-1 font-semibold text-slate-600">{children}</div>
    </div>
  );
}