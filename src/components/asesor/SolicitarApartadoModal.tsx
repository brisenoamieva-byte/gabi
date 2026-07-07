"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import type { ApartadoContextFromProspecto } from "@/lib/admin/operaciones-service";
import type { CotizacionRecord } from "@/lib/comercial/sembrado-status";
import type { SolicitudApartadoRow } from "@/lib/comercial/solicitud-apartado-service";

type SolicitarApartadoModalProps = {
  asesorId: string;
  desarrolloNombre: string;
  prospectoId: string;
  onClose: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#201044]/30 focus:outline-none focus:ring-2 focus:ring-[#201044]/10";

export function SolicitarApartadoModal({
  asesorId,
  desarrolloNombre,
  prospectoId,
  onClose,
  onSuccess,
}: SolicitarApartadoModalProps) {
  const [context, setContext] = useState<ApartadoContextFromProspecto | null>(null);
  const [cotizaciones, setCotizaciones] = useState<CotizacionRecord[]>([]);
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudApartadoRow | null>(null);
  const [unidadId, setUnidadId] = useState("");
  const [cotizacionId, setCotizacionId] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [contextRes, solicitudRes, prospectoRes] = await Promise.all([
        fetch(
          `/api/asesores/prospectos/${prospectoId}/apartado?asesorId=${encodeURIComponent(asesorId)}`,
        ),
        fetch(
          `/api/asesores/prospectos/${prospectoId}/solicitud-apartado?asesorId=${encodeURIComponent(asesorId)}`,
        ),
        fetch(
          `/api/asesores/prospectos/${prospectoId}?asesorId=${encodeURIComponent(asesorId)}`,
        ),
      ]);

      const contextData = (await contextRes.json()) as ApartadoContextFromProspecto & {
        error?: string;
      };

      if (!contextRes.ok) {
        throw new Error(contextData.error ?? "No se pudo cargar datos del prospecto.");
      }

      const solicitudData = (await solicitudRes.json()) as {
        solicitud?: SolicitudApartadoRow | null;
        error?: string;
      };

      if (!solicitudRes.ok) {
        throw new Error(solicitudData.error ?? "No se pudo consultar solicitudes.");
      }

      const prospectoData = (await prospectoRes.json()) as {
        prospecto?: { cotizaciones?: CotizacionRecord[] };
        error?: string;
      };

      const prospectoCotizaciones = prospectoData.prospecto?.cotizaciones ?? [];

      setContext(contextData);
      setCotizaciones(prospectoCotizaciones);
      setSolicitudPendiente(solicitudData.solicitud ?? null);

      const prefill = contextData.prefill;
      const primeraCotizacion = prospectoCotizaciones[0];
      setUnidadId(prefill?.unidadId ?? primeraCotizacion?.unidad_id ?? "");
      setCotizacionId(prefill?.cotizacionId ?? primeraCotizacion?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [asesorId, prospectoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/asesores/prospectos/${prospectoId}/solicitud-apartado`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asesorId,
            desarrolloNombre,
            unidadId: unidadId || undefined,
            cotizacionId: cotizacionId || undefined,
            notas: notas.trim() || undefined,
          }),
        },
      );

      const data = (await response.json()) as {
        solicitud?: SolicitudApartadoRow;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo enviar la solicitud.");
      }

      setSuccess(true);
      setSolicitudPendiente(data.solicitud ?? null);
      onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">
              Solicitud a gerencia
            </p>
            <h3 className="text-lg font-black text-[#201044]">Solicitar apartado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Solo gerencia puede registrar apartados en sembrado. Se notificará al gerente del
              desarrollo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-semibold">Solicitud enviada</p>
              <p className="mt-1">
                El gerente recibirá un correo y podrá registrar el apartado desde Admin → Leads.
              </p>
            </div>
          ) : null}

          {solicitudPendiente && !success ? (
            <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <Bell className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Ya hay una solicitud pendiente</p>
                <p className="mt-1">
                  Gerencia fue notificada
                  {solicitudPendiente.unidadNumero
                    ? ` (unidad sugerida: ${solicitudPendiente.unidadNumero})`
                    : ""}
                  . Espera a que registren el apartado en sembrado.
                </p>
              </div>
            </div>
          ) : null}

          {!loading && !solicitudPendiente && !success ? (
            <form id="solicitar-apartado-form" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-4">
                {cotizaciones.length ? (
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">
                      Cotización de referencia
                    </span>
                    <select
                      value={cotizacionId}
                      onChange={(event) => {
                        const id = event.target.value;
                        setCotizacionId(id);
                        const cot = cotizaciones.find((item) => item.id === id);
                        if (cot?.unidad_id) {
                          setUnidadId(cot.unidad_id);
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="">Sin cotización específica</option>
                      {cotizaciones.map((cot) => (
                        <option key={cot.id} value={cot.id}>
                          {cot.unidad_numero ? `Unidad ${cot.unidad_numero}` : "Cotización"} —{" "}
                          {cot.esquema_pago ?? "—"}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {context?.unidades.length ? (
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">
                      Unidad sugerida (opcional)
                    </span>
                    <select
                      value={unidadId}
                      onChange={(event) => setUnidadId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">A definir por gerencia</option>
                      {context.unidades.map((unidad) => (
                        <option key={unidad.unidadId} value={unidad.unidadId}>
                          {unidad.unidad} — {unidad.estatusInventario}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-600">
                    Notas para gerencia (opcional)
                  </span>
                  <textarea
                    value={notas}
                    onChange={(event) => setNotas(event.target.value)}
                    rows={3}
                    className={`${inputClass} min-h-[80px]`}
                    placeholder="Ej. cliente listo para apartar con $50k, prefiere torre B…"
                  />
                </label>
              </div>
            </form>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
          >
            {success || solicitudPendiente ? "Cerrar" : "Cancelar"}
          </button>
          {!loading && !solicitudPendiente && !success ? (
            <button
              type="submit"
              form="solicitar-apartado-form"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Enviar solicitud
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
