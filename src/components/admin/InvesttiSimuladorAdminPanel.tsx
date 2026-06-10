"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RefreshCw, Upload } from "lucide-react";
import { investtiCatalogDesarrollos } from "@/lib/catalog/investti-desarrollos";
import type { InvesttiDesarrolloReglas } from "@/lib/corredor/investti-simulador-data-types";
import { formatPrice } from "@/lib/format/money";

type Meta = {
  source: string;
  generatedAt: string;
  updatedAt: string;
  origin: "supabase" | "static";
  stats: { lotes: number; byDev: Record<string, number> };
};

const desarrolloNombre = (id: string) =>
  investtiCatalogDesarrollos.find((d) => d.id === id)?.nombre ?? id;

export function InvesttiSimuladorAdminPanel() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [reglas, setReglas] = useState<Record<string, InvesttiDesarrolloReglas>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const desarrolloIds = useMemo(() => Object.keys(reglas).sort(), [reglas]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/investti-simulador");
      const data = (await res.json()) as {
        meta?: Meta;
        reglas?: Record<string, InvesttiDesarrolloReglas>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar");
      setMeta(data.meta ?? null);
      setReglas(data.reglas ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchRegla = (
    desarrolloId: string,
    field: keyof InvesttiDesarrolloReglas,
    value: number,
  ) => {
    setReglas((prev) => ({
      ...prev,
      [desarrolloId]: { ...prev[desarrolloId], [field]: value },
    }));
  };

  const handleSaveReglas = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/investti-simulador/reglas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reglas }),
      });
      const data = (await res.json()) as { meta?: Meta; error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      if (data.meta) setMeta(data.meta);
      setSuccess("Reglas publicadas. El cotizador las tomará al refrescar.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/investti-simulador/import", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        meta?: Meta;
        reglas?: Record<string, InvesttiDesarrolloReglas>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Importación fallida");
      if (data.meta) setMeta(data.meta);
      if (data.reglas) setReglas(data.reglas);
      setSuccess(`Lista publicada desde ${file.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando simulador Investti…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6cc24a]">
            Control Gerencia
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#201044]">Simulador Investti</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Publica lista de precios y reglas sin redeploy. Los asesores cargan datos desde la API
            al abrir el cotizador.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <Link
            href="/cotizador"
            target="_blank"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#6cc24a]/30 bg-[#6cc24a]/10 px-4 text-sm font-semibold text-[#201044]"
          >
            <ExternalLink className="h-4 w-4" />
            Vista cotizador
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#201044]">Publicación vigente</h2>
        {meta ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Origen</dt>
              <dd className="font-medium capitalize text-slate-800">{meta.origin}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Archivo fuente</dt>
              <dd className="font-medium text-slate-800">{meta.source}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Lotes totales</dt>
              <dd className="font-medium text-slate-800">{meta.stats.lotes}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Última actualización</dt>
              <dd className="font-medium text-slate-800">
                {new Date(meta.updatedAt).toLocaleString("es-MX")}
              </dd>
            </div>
          </dl>
        ) : null}
        {meta?.stats.byDev ? (
          <ul className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
            {Object.entries(meta.stats.byDev).map(([dev, count]) => (
              <li
                key={dev}
                className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1"
              >
                {dev}: <strong>{count}</strong> lotes
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
        <h2 className="text-sm font-bold text-[#201044]">Importar Excel maestro</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sube <strong>Simulador Master Investti (.xlsm)</strong>. Se extraen precios, entregas y
          reglas de la hoja Manzanas.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsm,application/vnd.ms-excel.sheet.macroEnabled.12"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#201044] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importando…" : "Subir y publicar Excel"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#201044]">Reglas por desarrollo</h2>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveReglas()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#6cc24a] px-4 text-sm font-semibold text-[#201044] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar reglas
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Desarrollo</th>
                <th className="py-2 pr-4">Enganche mín. %</th>
                <th className="py-2 pr-4">Plazo máx. (meses)</th>
                <th className="py-2 pr-4">Mens. mínima</th>
                <th className="py-2">Apartado</th>
              </tr>
            </thead>
            <tbody>
              {desarrolloIds.map((id) => {
                const r = reglas[id];
                if (!r) return null;
                return (
                  <tr key={id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-800">{desarrolloNombre(id)}</td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        step={1}
                        value={Math.round(r.engancheMinPct * 100)}
                        onChange={(e) =>
                          patchRegla(id, "engancheMinPct", Number(e.target.value) / 100)
                        }
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={r.plazoMaxMeses}
                        onChange={(e) =>
                          patchRegla(id, "plazoMaxMeses", Number(e.target.value))
                        }
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={r.mensualidadMinima}
                        onChange={(e) =>
                          patchRegla(id, "mensualidadMinima", Number(e.target.value))
                        }
                        className="w-28 rounded-lg border border-slate-200 px-2 py-1"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={r.apartado}
                        onChange={(e) => patchRegla(id, "apartado", Number(e.target.value))}
                        className="w-28 rounded-lg border border-slate-200 px-2 py-1"
                      />
                      <span className="ml-2 text-xs text-slate-400">
                        {formatPrice(r.apartado)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Sin Supabase publicado, el cotizador usa el JSON estático del repositorio como respaldo.
        </p>
      </section>
    </div>
  );
}
