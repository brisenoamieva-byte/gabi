"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, Loader2, Save } from "lucide-react";
import type { DesarrolloCampoConfig } from "@/lib/catalog/campo-config";
import { getDatosBancarios, type DatosBancarios } from "@/lib/data";
import { genericDriveEnvKey } from "@/lib/integrations/google-drive-env";

type Props = {
  desarrolloId: string;
  canEdit: boolean;
  onSaved?: () => void;
};

const emptyBancarios = (): DatosBancarios => ({
  razonSocial: "",
  rfc: "",
  banco: "",
  sucursal: "",
  cuenta: "",
  clabe: "",
  concepto: "",
  reportarA: "",
});

export function DesarrolloCampoConfigCard({ desarrolloId, canEdit, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [enganchePct, setEnganchePct] = useState("10");
  const [apartado, setApartado] = useState("50000");
  const [descuentoStep, setDescuentoStep] = useState("5000");
  const [bancarios, setBancarios] = useState<DatosBancarios>(emptyBancarios);
  const [driveFolderId, setDriveFolderId] = useState("");
  const [cuotaMantenimiento, setCuotaMantenimiento] = useState("1800");
  const [garantiaEnabled, setGarantiaEnabled] = useState(false);
  const [garantiaWeekly, setGarantiaWeekly] = useState(true);
  const [garantiaPlanLabel, setGarantiaPlanLabel] = useState("");
  const [garantiaEmails, setGarantiaEmails] = useState("");
  const [garantiaPhones, setGarantiaPhones] = useState("");
  const [garantiaNotes, setGarantiaNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/campo-config`,
      );
      const data = (await res.json()) as {
        campoConfig?: DesarrolloCampoConfig;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo cargar la config de campo.");
      }

      const config = data.campoConfig ?? {};
      const fallback = getDatosBancarios(desarrolloId);
      setEnganchePct(String(Math.round((config.cotizador?.enganchePct ?? 0.1) * 100)));
      setApartado(String(config.cotizador?.apartado ?? 50000));
      setDescuentoStep(String(config.cotizador?.descuentoStep ?? 5000));
      setBancarios({
        ...fallback,
        ...config.datosBancarios,
      });
      setDriveFolderId(config.driveFolderId ?? "");
      setCuotaMantenimiento(
        String(config.cuotaMantenimiento ?? (desarrolloId === "mision-la-gavia" ? 1800 : "")),
      );
      setGarantiaEnabled(Boolean(config.garantiaContrato?.enabled));
      setGarantiaWeekly(config.garantiaContrato?.weeklyReportEnabled !== false);
      setGarantiaPlanLabel(config.garantiaContrato?.planLabel ?? "");
      setGarantiaEmails((config.garantiaContrato?.recipientEmails ?? []).join(", "));
      setGarantiaPhones((config.garantiaContrato?.recipientPhones ?? []).join(", "));
      setGarantiaNotes(config.garantiaContrato?.notes ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const enganche = Number(enganchePct) / 100;
      const campoConfig: DesarrolloCampoConfig = {
        cotizador: {
          enganchePct: Number.isFinite(enganche) ? enganche : 0.1,
          apartado: Number(apartado) || 50000,
          descuentoStep: Number(descuentoStep) || 5000,
          esquemas: ["mensualidades", "contado"],
        },
        datosBancarios: bancarios,
        driveFolderId: driveFolderId.trim() || null,
        cuotaMantenimiento: cuotaMantenimiento.trim()
          ? Number(cuotaMantenimiento) || null
          : null,
        garantiaContrato: {
          enabled: garantiaEnabled,
          weeklyReportEnabled: garantiaWeekly,
          planLabel: garantiaPlanLabel.trim() || undefined,
          recipientEmails: garantiaEmails
            .split(/[,;\n]+/)
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
          recipientPhones: garantiaPhones
            .split(/[,;\n]+/)
            .map((item) => item.trim())
            .filter(Boolean),
          notes: garantiaNotes.trim() || undefined,
        },
      };

      const res = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/campo-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campoConfig }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }
      setSuccess("Configuración de campo guardada.");
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const patchBancario = (key: keyof DatosBancarios, value: string) => {
    setBancarios((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Setup en plataforma
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-black text-gabi-forest">
            <Landmark className="h-5 w-5" />
            Cotizador, bancarios y Drive
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Cotizador, bancarios y Drive.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cotizador</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Enganche %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={enganchePct}
                  disabled={!canEdit}
                  onChange={(e) => setEnganchePct(e.target.value)}
                  className="input-cotizador"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Apartado (MXN)</span>
                <input
                  type="number"
                  min={0}
                  value={apartado}
                  disabled={!canEdit}
                  onChange={(e) => setApartado(e.target.value)}
                  className="input-cotizador"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Paso descuento
                </span>
                <input
                  type="number"
                  min={0}
                  value={descuentoStep}
                  disabled={!canEdit}
                  onChange={(e) => setDescuentoStep(e.target.value)}
                  className="input-cotizador"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Datos bancarios
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["razonSocial", "Razón social"],
                  ["rfc", "RFC"],
                  ["banco", "Banco"],
                  ["sucursal", "Sucursal"],
                  ["cuenta", "Cuenta"],
                  ["clabe", "CLABE"],
                  ["concepto", "Concepto"],
                  ["reportarA", "Reportar a (email)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm sm:col-span-1">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
                  <input
                    value={bancarios[key]}
                    disabled={!canEdit}
                    onChange={(e) => patchBancario(key, e.target.value)}
                    className="input-cotizador"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Google Drive (expedientes)
            </p>
            <label className="mt-2 block text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                ID carpeta raíz
              </span>
              <input
                value={driveFolderId}
                disabled={!canEdit}
                onChange={(e) => setDriveFolderId(e.target.value)}
                className="input-cotizador font-mono text-xs"
                placeholder="1AbC…"
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Alternativa en Vercel:{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">
                {genericDriveEnvKey(desarrolloId)}
              </code>
              . En La Gavia, las carpetas de cliente se crean dentro de{" "}
              <span className="font-medium text-slate-500">3. Expediente Clientes</span>.
            </p>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Cuota mantenimiento mensual (Anexo D)
              </span>
              <input
                type="number"
                value={cuotaMantenimiento}
                disabled={!canEdit}
                onChange={(e) => setCuotaMantenimiento(e.target.value)}
                className="input-cotizador"
                placeholder="1800"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Garantía SLA (contrato)
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              SLA = Service Level Agreement: el acuerdo de plazos y calidad de
              seguimiento que se reporta al dueño (sello semanal verde / riesgo / rojo).
            </p>
            <div className="mt-2 space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={garantiaEnabled}
                  disabled={!canEdit}
                  onChange={(e) => setGarantiaEnabled(e.target.checked)}
                />
                Contrato de garantía activo
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={garantiaWeekly}
                  disabled={!canEdit || !garantiaEnabled}
                  onChange={(e) => setGarantiaWeekly(e.target.checked)}
                />
                Reporte semanal automático (lunes)
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Nombre del plan
                </span>
                <input
                  value={garantiaPlanLabel}
                  disabled={!canEdit}
                  onChange={(e) => setGarantiaPlanLabel(e.target.value)}
                  className="input-cotizador"
                  placeholder="Gabi Garantía de seguimiento"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Emails reporte (dueño / gerencia)
                </span>
                <input
                  value={garantiaEmails}
                  disabled={!canEdit}
                  onChange={(e) => setGarantiaEmails(e.target.value)}
                  className="input-cotizador"
                  placeholder="dueño@desarrollo.com, gerente@…"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  WhatsApp reporte (+52…)
                </span>
                <input
                  value={garantiaPhones}
                  disabled={!canEdit}
                  onChange={(e) => setGarantiaPhones(e.target.value)}
                  className="input-cotizador"
                  placeholder="+5255…"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Notas en PDF contractual
                </span>
                <textarea
                  value={garantiaNotes}
                  disabled={!canEdit}
                  onChange={(e) => setGarantiaNotes(e.target.value)}
                  className="input-cotizador min-h-[72px]"
                  placeholder="Excepciones acordadas, alcance del piloto…"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-xs font-semibold text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 text-xs font-semibold text-emerald-800">{success}</p> : null}
    </section>
  );
}
