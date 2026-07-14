"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { formatPrice } from "@/lib/data";
import {
  MKT_PRESUPUESTO_SEGMENTOS,
  type MktGastoEstatus,
  type MktGastoRecord,
  type MktPartidaRecord,
  type MktPresupuestoRecord,
  type MktPresupuestoResumen,
} from "@/lib/comercial/mkt-presupuesto";

type MktPresupuestoAdminPanelProps = {
  desarrolloId: string;
  desarrolloNombre: string;
  canEdit?: boolean;
  embedded?: boolean;
  onClose?: () => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#201044] focus:outline-none focus:ring-2 focus:ring-[#201044]/15";

const formatMoney = (value: number) =>
  formatPrice(value).replace(/\s*MXN\s*/i, "").trim() || `$${value.toLocaleString("es-MX")}`;

const today = () => new Date().toISOString().slice(0, 10);

export function MktPresupuestoAdminPanel({
  desarrolloId,
  desarrolloNombre,
  canEdit = true,
  embedded = false,
  onClose,
}: MktPresupuestoAdminPanelProps) {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resumen, setResumen] = useState<MktPresupuestoResumen | null>(null);
  const [presupuesto, setPresupuesto] = useState<MktPresupuestoRecord | null>(null);
  const [partidas, setPartidas] = useState<MktPartidaRecord[]>([]);
  const [gastos, setGastos] = useState<MktGastoRecord[]>([]);
  const [autorizadoInput, setAutorizadoInput] = useState("0");
  const [notasInput, setNotasInput] = useState("");
  const [tab, setTab] = useState<"gastos" | "partidas">("gastos");

  const [partidaForm, setPartidaForm] = useState({
    segmento: MKT_PRESUPUESTO_SEGMENTOS[0],
    proveedor: "",
    concepto: "",
    tipo: "variable" as "fijo" | "variable",
    montoAutorizado: "",
  });

  const [gastoForm, setGastoForm] = useState({
    fechaRegistro: today(),
    proveedor: "",
    descripcion: "",
    facturaRef: "",
    montoSinIva: "",
    iva: "",
    total: "",
    estatus: "pendiente" as MktGastoEstatus,
    partidaId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        desarrolloId,
        anio: String(anio),
        mode: "bundle",
      });
      const response = await fetch(`/api/admin/mkt-presupuesto?${params.toString()}`);
      const data = (await response.json()) as {
        resumen?: MktPresupuestoResumen;
        presupuesto?: MktPresupuestoRecord | null;
        partidas?: MktPartidaRecord[];
        gastos?: MktGastoRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el presupuesto.");
      }
      setResumen(data.resumen ?? null);
      setPresupuesto(data.presupuesto ?? null);
      setPartidas(data.partidas ?? []);
      setGastos(data.gastos ?? []);
      setAutorizadoInput(String(data.resumen?.autorizado ?? data.presupuesto?.monto_autorizado ?? 0));
      setNotasInput(data.presupuesto?.notas ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [anio, desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ensurePresupuesto = async () => {
    const response = await fetch("/api/admin/mkt-presupuesto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure", desarrolloId, anio }),
    });
    const data = (await response.json()) as { presupuesto?: MktPresupuestoRecord; error?: string };
    if (!response.ok || !data.presupuesto) {
      throw new Error(data.error ?? "No se pudo inicializar el presupuesto.");
    }
    setPresupuesto(data.presupuesto);
    return data.presupuesto;
  };

  const savePresupuesto = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/mkt-presupuesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          desarrolloId,
          anio,
          montoAutorizado: Number(autorizadoInput) || 0,
          notas: notasInput || null,
        }),
      });
      const data = (await response.json()) as { presupuesto?: MktPresupuestoRecord; error?: string };
      if (!response.ok || !data.presupuesto) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }
      setPresupuesto(data.presupuesto);
      setSuccess("Presupuesto autorizado guardado.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const addPartida = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      const current = presupuesto ?? (await ensurePresupuesto());
      const response = await fetch("/api/admin/mkt-presupuesto/partidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presupuestoId: current.id,
          segmento: partidaForm.segmento,
          proveedor: partidaForm.proveedor || null,
          concepto: partidaForm.concepto,
          tipo: partidaForm.tipo,
          montoAutorizado: Number(partidaForm.montoAutorizado) || 0,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear la partida.");
      }
      setPartidaForm({
        segmento: MKT_PRESUPUESTO_SEGMENTOS[0],
        proveedor: "",
        concepto: "",
        tipo: "variable",
        montoAutorizado: "",
      });
      await load();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Error al crear partida.");
    } finally {
      setSaving(false);
    }
  };

  const removePartida = async (partidaId: string) => {
    if (!canEdit) return;
    if (!confirm("¿Eliminar esta partida?")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/mkt-presupuesto/partidas/${partidaId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar.");
      }
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const addGasto = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      const current = presupuesto ?? (await ensurePresupuesto());
      const montoSinIva = Number(gastoForm.montoSinIva) || 0;
      const iva = Number(gastoForm.iva) || 0;
      const total = gastoForm.total.trim()
        ? Number(gastoForm.total)
        : montoSinIva + iva;

      const response = await fetch("/api/admin/mkt-presupuesto/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          presupuestoId: current.id,
          partidaId: gastoForm.partidaId || null,
          fechaRegistro: gastoForm.fechaRegistro,
          proveedor: gastoForm.proveedor,
          descripcion: gastoForm.descripcion,
          facturaRef: gastoForm.facturaRef || null,
          montoSinIva,
          iva,
          total,
          estatus: gastoForm.estatus,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar el gasto.");
      }
      setGastoForm({
        fechaRegistro: today(),
        proveedor: "",
        descripcion: "",
        facturaRef: "",
        montoSinIva: "",
        iva: "",
        total: "",
        estatus: "pendiente",
        partidaId: "",
      });
      await load();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Error al registrar gasto.");
    } finally {
      setSaving(false);
    }
  };

  const setGastoEstatus = async (gastoId: string, estatus: MktGastoEstatus) => {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/mkt-presupuesto/gastos/${gastoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estatus,
          fechaPago: estatus === "pagada" ? today() : null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }
      await load();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Error al actualizar.");
    } finally {
      setSaving(false);
    }
  };

  const removeGasto = async (gastoId: string) => {
    if (!canEdit) return;
    if (!confirm("¿Eliminar este gasto?")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/mkt-presupuesto/gastos/${gastoId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar.");
      }
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const partidasBySegmento = useMemo(() => {
    const map = new Map<string, MktPartidaRecord[]>();
    for (const partida of partidas) {
      const list = map.get(partida.segmento) ?? [];
      list.push(partida);
      map.set(partida.segmento, list);
    }
    return map;
  }, [partidas]);

  return (
    <div className={`space-y-5 ${embedded ? "" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!embedded ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Publicidad / MKT
            </p>
          ) : null}
          <h2 className="text-xl font-black text-gabi-ink">
            Presupuesto {anio} · {desarrolloNombre}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Autorizado vs erogado, partidas y facturas reales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">
            Año
            <select
              value={anio}
              onChange={(event) => setAnio(Number(event.target.value))}
              className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {[anio - 1, anio, anio + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-gabi-ink disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
            >
              Cerrar
            </button>
          ) : null}
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

      {loading && !resumen ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando presupuesto…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Autorizado" value={formatMoney(resumen?.autorizado ?? 0)} />
            <KpiCard label="Erogado" value={formatMoney(resumen?.erogado ?? 0)} tone="warn" />
            <KpiCard label="Remanente" value={formatMoney(resumen?.remanente ?? 0)} tone="good" />
            <KpiCard
              label="% ejercido"
              value={resumen?.pctEjercido != null ? `${resumen.pctEjercido}%` : "—"}
            />
          </div>

          {canEdit ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <h3 className="text-sm font-bold text-gabi-ink">Presupuesto autorizado</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-slate-600">Monto (MXN)</span>
                  <input
                    type="number"
                    min={0}
                    value={autorizadoInput}
                    onChange={(event) => setAutorizadoInput(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-slate-600">Notas</span>
                  <input
                    type="text"
                    value={notasInput}
                    onChange={(event) => setNotasInput(event.target.value)}
                    className={inputClass}
                    placeholder="Ej. Autorizado 2026 Latitud / BBR"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void savePresupuesto()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex gap-2 border-b border-slate-200">
            {(
              [
                { id: "gastos" as const, label: `Gastos (${gastos.length})` },
                { id: "partidas" as const, label: `Partidas (${partidas.length})` },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`border-b-2 px-4 py-2 text-sm font-bold ${
                  tab === item.id
                    ? "border-gabi-forest text-gabi-forest"
                    : "border-transparent text-slate-500"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "gastos" ? (
            <div className="space-y-4">
              {canEdit ? (
                <section className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-bold text-gabi-ink">Registrar gasto</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Fecha</span>
                      <input
                        type="date"
                        value={gastoForm.fechaRegistro}
                        onChange={(event) =>
                          setGastoForm((current) => ({
                            ...current,
                            fechaRegistro: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Proveedor</span>
                      <input
                        value={gastoForm.proveedor}
                        onChange={(event) =>
                          setGastoForm((current) => ({ ...current, proveedor: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Partida (opcional)</span>
                      <select
                        value={gastoForm.partidaId}
                        onChange={(event) =>
                          setGastoForm((current) => ({ ...current, partidaId: event.target.value }))
                        }
                        className={inputClass}
                      >
                        <option value="">Sin partida</option>
                        {partidas.map((partida) => (
                          <option key={partida.id} value={partida.id}>
                            {partida.segmento} · {partida.concepto}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm sm:col-span-2 lg:col-span-3">
                      <span className="mb-1 block font-semibold text-slate-600">Descripción</span>
                      <input
                        value={gastoForm.descripcion}
                        onChange={(event) =>
                          setGastoForm((current) => ({
                            ...current,
                            descripcion: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Factura</span>
                      <input
                        value={gastoForm.facturaRef}
                        onChange={(event) =>
                          setGastoForm((current) => ({ ...current, facturaRef: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Monto s/IVA</span>
                      <input
                        type="number"
                        min={0}
                        value={gastoForm.montoSinIva}
                        onChange={(event) =>
                          setGastoForm((current) => ({
                            ...current,
                            montoSinIva: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">IVA</span>
                      <input
                        type="number"
                        min={0}
                        value={gastoForm.iva}
                        onChange={(event) =>
                          setGastoForm((current) => ({ ...current, iva: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Total</span>
                      <input
                        type="number"
                        min={0}
                        value={gastoForm.total}
                        onChange={(event) =>
                          setGastoForm((current) => ({ ...current, total: event.target.value }))
                        }
                        placeholder="Auto = monto + IVA"
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Estatus</span>
                      <select
                        value={gastoForm.estatus}
                        onChange={(event) =>
                          setGastoForm((current) => ({
                            ...current,
                            estatus: event.target.value as MktGastoEstatus,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="pagada">Pagada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={saving || !gastoForm.proveedor.trim() || !gastoForm.descripcion.trim()}
                    onClick={() => void addGasto()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#201044] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar gasto
                  </button>
                </section>
              ) : null}

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Estatus</th>
                      {canEdit ? <th className="px-4 py-3" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((gasto) => (
                      <tr key={gasto.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 whitespace-nowrap">{gasto.fecha_registro}</td>
                        <td className="px-4 py-3 font-medium">{gasto.proveedor}</td>
                        <td className="px-4 py-3">
                          <p>{gasto.descripcion}</p>
                          {gasto.factura_ref ? (
                            <p className="text-xs text-slate-400">Fact. {gasto.factura_ref}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{formatMoney(gasto.total)}</td>
                        <td className="px-4 py-3">
                          <EstatusBadge estatus={gasto.estatus} />
                        </td>
                        {canEdit ? (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {gasto.estatus !== "pagada" ? (
                                <button
                                  type="button"
                                  onClick={() => void setGastoEstatus(gasto.id, "pagada")}
                                  className="text-xs font-bold text-emerald-700 underline-offset-2 hover:underline"
                                >
                                  Marcar pagada
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void removeGasto(gasto.id)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {gastos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={canEdit ? 6 : 5}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          Aún no hay gastos registrados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {canEdit ? (
                <section className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-bold text-gabi-ink">Nueva partida</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Segmento</span>
                      <select
                        value={partidaForm.segmento}
                        onChange={(event) =>
                          setPartidaForm((current) => ({
                            ...current,
                            segmento: event.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        {MKT_PRESUPUESTO_SEGMENTOS.map((segmento) => (
                          <option key={segmento} value={segmento}>
                            {segmento}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Proveedor</span>
                      <input
                        value={partidaForm.proveedor}
                        onChange={(event) =>
                          setPartidaForm((current) => ({
                            ...current,
                            proveedor: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Concepto</span>
                      <input
                        value={partidaForm.concepto}
                        onChange={(event) =>
                          setPartidaForm((current) => ({
                            ...current,
                            concepto: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">Tipo</span>
                      <select
                        value={partidaForm.tipo}
                        onChange={(event) =>
                          setPartidaForm((current) => ({
                            ...current,
                            tipo: event.target.value as "fijo" | "variable",
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="fijo">Fijo</option>
                        <option value="variable">Variable</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold text-slate-600">
                        Autorizado partida
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={partidaForm.montoAutorizado}
                        onChange={(event) =>
                          setPartidaForm((current) => ({
                            ...current,
                            montoAutorizado: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={saving || !partidaForm.concepto.trim()}
                    onClick={() => void addPartida()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#201044] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar partida
                  </button>
                </section>
              ) : null}

              {[...partidasBySegmento.entries()].map(([segmento, rows]) => (
                <section key={segmento} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-bold text-gabi-ink">{segmento}</h3>
                  <ul className="mt-2 space-y-2">
                    {rows.map((partida) => (
                      <li
                        key={partida.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-gabi-ink">{partida.concepto}</p>
                          <p className="text-xs text-slate-500">
                            {partida.proveedor ?? "Sin proveedor"} · {partida.tipo} ·{" "}
                            {formatMoney(partida.monto_autorizado)}
                          </p>
                        </div>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => void removePartida(partida.id)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {partidas.length === 0 ? (
                <p className="text-sm text-slate-400">Aún no hay partidas. Usa la plantilla de segmentos BBR.</p>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        tone === "good"
          ? "border-emerald-200 bg-emerald-50"
          : tone === "warn"
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-gabi-ink">{value}</p>
    </div>
  );
}

function EstatusBadge({ estatus }: { estatus: MktGastoEstatus }) {
  const className =
    estatus === "pagada"
      ? "bg-emerald-100 text-emerald-800"
      : estatus === "cancelada"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-100 text-amber-900";
  const label =
    estatus === "pagada" ? "Pagada" : estatus === "cancelada" ? "Cancelada" : "Pendiente";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${className}`}>
      {label}
    </span>
  );
}
