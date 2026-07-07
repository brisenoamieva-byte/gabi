"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/data";
import type { ProspectoDetail } from "@/lib/admin/prospectos-service";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
import type { CampanaRecord } from "@/lib/admin/campanas-service";
import { RegistrarApartadoModal } from "@/components/admin/RegistrarApartadoModal";
import {
  PROSPECTO_ETAPAS,
  isProspectoEtapa,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import { formatXperienceLeadId } from "@/lib/comercial/xperience-catalog-ids";
import { XPERIENCE_CALIFICACIONES } from "@/lib/comercial/xperience-leads";
import { NIVELES_INTERES, nivelInteresLabel, type NivelInteres } from "@/lib/comercial/prospecto-interes";

type LeadDetailDrawerProps = {
  prospectoId: string;
  onClose: () => void;
  onUpdated: () => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

type AsesorOption = {
  id: string;
  nombre: string;
};

type AdminMe = {
  canDeleteProspectos?: boolean;
  canReassignProspectos?: boolean;
};

export function LeadDetailDrawer({ prospectoId, onClose, onUpdated }: LeadDetailDrawerProps) {
  const [detail, setDetail] = useState<ProspectoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [etapa, setEtapa] = useState<ProspectoEtapa>("nuevo");
  const [notas, setNotas] = useState("");
  const [campanaId, setCampanaId] = useState("");
  const [calificacion, setCalificacion] = useState("Sin Calificar");
  const [nivelInteres, setNivelInteres] = useState<NivelInteres | "">("");
  const [asesorId, setAsesorId] = useState("");
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [adminMe, setAdminMe] = useState<AdminMe>({});
  const [campanas, setCampanas] = useState<CampanaRecord[]>([]);
  const [apartadoModalOpen, setApartadoModalOpen] = useState(false);
  const [compliance, setCompliance] = useState<ProspectoComplianceRow | null>(null);

  const puedeRegistrarApartado =
    detail != null && !["apartado", "vendido", "perdido"].includes(detail.etapa);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const meResponse = await fetch("/api/admin/me");
      if (meResponse.ok) {
        const meData = (await meResponse.json()) as AdminMe;
        setAdminMe(meData);
      }

      const response = await fetch(`/api/admin/prospectos/${prospectoId}`);
      const data = (await response.json()) as { prospecto?: ProspectoDetail; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el lead.");
      }

      if (data.prospecto) {
        setDetail(data.prospecto);
        setEtapa(isProspectoEtapa(data.prospecto.etapa) ? data.prospecto.etapa : "nuevo");
        setNotas(data.prospecto.notas ?? "");
        setCampanaId(data.prospecto.campana_id ?? "");
        setCalificacion(data.prospecto.calificacion ?? "Sin Calificar");
        setNivelInteres(
          data.prospecto.nivel_interes === "sin_interes" ||
            data.prospecto.nivel_interes === "bajo" ||
            data.prospecto.nivel_interes === "alto"
            ? data.prospecto.nivel_interes
            : "",
        );
        setAsesorId(data.prospecto.asesor_id ?? "");

        const asesorParams = new URLSearchParams({
          desarrolloId: data.prospecto.desarrollo_id,
        });
        const asesorResponse = await fetch(`/api/admin/asesores?${asesorParams.toString()}`);
        const asesorData = (await asesorResponse.json()) as { asesores?: AsesorOption[] };
        setAsesores(asesorData.asesores ?? []);

        const campParams = new URLSearchParams({
          desarrolloId: data.prospecto.desarrollo_id,
          activoOnly: "1",
        });
        const campResponse = await fetch(`/api/admin/campanas?${campParams.toString()}`);
        const campData = (await campResponse.json()) as { campanas?: CampanaRecord[] };
        setCampanas(campData.campanas ?? []);

        const complianceResponse = await fetch(`/api/admin/prospectos/${prospectoId}/compliance`);
        if (complianceResponse.ok) {
          const complianceData = (await complianceResponse.json()) as {
            compliance?: ProspectoComplianceRow | null;
          };
          setCompliance(complianceData.compliance ?? null);
        } else {
          setCompliance(null);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [prospectoId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/prospectos/${prospectoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapa,
          notas,
          campanaId: campanaId || null,
          calificacion,
          nivelInteres: nivelInteres || null,
          ...(adminMe.canReassignProspectos ? { asesorId: asesorId || null } : {}),
        }),
      });

      const data = (await response.json()) as { prospecto?: ProspectoDetail; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      if (data.prospecto) {
        setDetail(data.prospecto);
      }
      onUpdated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!adminMe.canDeleteProspectos || !detail) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el prospecto "${detail.nombre}"? Se archivará del listado y no aparecerá en reportes activos.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/prospectos/${prospectoId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el prospecto.");
      }

      onUpdated();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">Lead</p>
            <h3 className="text-xl font-black text-gabi-forest">
              {detail?.nombre ?? "Cargando…"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando detalle…
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-5">
              {compliance && compliance.issues.length > 0 ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    compliance.overdueCount > 0
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <p className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Playbook {compliance.overdueCount > 0 ? "vencido" : "pendiente"}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {compliance.issues.map((issue) => (
                      <li key={issue.stepId}>
                        {issue.status === "overdue" ? "Vencido" : "Pendiente"}: {issue.stepLabel}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs opacity-80">
                    Confianza del registro: {compliance.confidencePct}%
                  </p>
                  <Link
                    href={`/admin/crm-compliance?desarrolloId=${encodeURIComponent(detail.desarrollo_id)}`}
                    className="mt-2 inline-block text-xs font-semibold underline"
                  >
                    Ver Salud CRM del desarrollo
                  </Link>
                </div>
              ) : compliance ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Playbook al día · confianza {compliance.confidencePct}%
                </div>
              ) : null}

              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium text-gabi-forest">{detail.email ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Teléfono</span>
                  <span className="font-medium">{detail.telefono ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Origen</span>
                  <span>{detail.origen_ciudad ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Medio</span>
                  <span>{detail.medio_publicitario ?? detail.medio_contacto ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Flags</span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {detail.es_spam ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                        Spam
                      </span>
                    ) : null}
                    {detail.es_duplicado ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        Duplicado
                      </span>
                    ) : null}
                    {!detail.es_spam && !detail.es_duplicado ? (
                      <span className="text-slate-600">—</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">ID Xperience</span>
                  <span className="font-semibold tabular-nums text-gabi-forest">
                    {formatXperienceLeadId(detail.xperience_id) ?? "—"}
                  </span>
                </div>
                {!detail.xperience_id ? (
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="text-slate-400">ID GABI</span>
                    <span className="font-mono text-slate-500">{detail.id.slice(0, 8)}…</span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Producto</span>
                  <span>{detail.producto_nombre ?? detail.desarrollo_id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">iScore / seller</span>
                  <span>
                    {detail.iscore ?? "—"} / {detail.seller_score ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Asignado por</span>
                  <span>{detail.asignado_por ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Actualizado</span>
                  <span>
                    {new Date(detail.updated_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {adminMe.canReassignProspectos ? (
                <Field label="Asesor asignado">
                  <select
                    value={asesorId}
                    onChange={(event) => setAsesorId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sin asesor</option>
                    {asesores.map((asesor) => (
                      <option key={asesor.id} value={asesor.id}>
                        {asesor.nombre}
                      </option>
                    ))}
                    {asesorId &&
                    !asesores.some((asesor) => asesor.id === asesorId) &&
                    detail.asesorNombre ? (
                      <option value={asesorId}>{detail.asesorNombre}</option>
                    ) : null}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Gerencia y administradores pueden reasignar el lead a otro asesor del desarrollo.
                  </p>
                </Field>
              ) : (
                <div className="flex justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-slate-500">Asesor</span>
                  <span className="font-medium">{detail.asesorNombre ?? "—"}</span>
                </div>
              )}

              <Field label="Calificación (Xperience)">
                <select
                  value={calificacion}
                  onChange={(event) => setCalificacion(event.target.value)}
                  className={inputClass}
                >
                  {XPERIENCE_CALIFICACIONES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Nivel de interés">
                <select
                  value={nivelInteres}
                  onChange={(event) =>
                    setNivelInteres(event.target.value as NivelInteres | "")
                  }
                  className={inputClass}
                >
                  <option value="">Sin definir</option>
                  {NIVELES_INTERES.map((item) => (
                    <option key={item} value={item}>
                      {nivelInteresLabel[item]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Etapa">
                <select
                  value={etapa}
                  onChange={(event) => setEtapa(event.target.value as ProspectoEtapa)}
                  className={inputClass}
                >
                  {PROSPECTO_ETAPAS.map((item) => (
                    <option key={item} value={item}>
                      {prospectoEtapaLabel[item]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Campaña">
                <select
                  value={campanaId}
                  onChange={(event) => setCampanaId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin campaña</option>
                  {campanas.map((campana) => (
                    <option key={campana.id} value={campana.id}>
                      {campana.nombre}
                      {campana.canal ? ` · ${campana.canal}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Notas">
                <textarea
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  className={`${inputClass} min-h-[100px]`}
                  placeholder="Seguimiento, objeciones, próximo paso…"
                />
              </Field>

              <div>
                <h4 className="mb-3 text-sm font-bold text-gabi-forest">
                  Cotizaciones ({detail.cotizaciones.length})
                </h4>
                {detail.cotizaciones.length ? (
                  <div className="space-y-2">
                    {detail.cotizaciones.map((cotizacion) => (
                      <div
                        key={cotizacion.id}
                        className="rounded-xl border border-slate-100 px-4 py-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-gabi-forest">
                              {cotizacion.unidad_numero
                                ? `Unidad ${cotizacion.unidad_numero}`
                                : "Cotización"}
                            </p>
                            <p className="text-slate-500">{cotizacion.esquema_pago ?? "—"}</p>
                          </div>
                          <p className="font-bold tabular-nums">
                            {cotizacion.precio_total
                              ? formatPrice(Number(cotizacion.precio_total))
                              : "—"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(cotizacion.created_at).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin cotizaciones registradas aún.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {detail ? (
          <div className="space-y-3 border-t border-slate-100 p-5">
            {puedeRegistrarApartado ? (
              <button
                type="button"
                onClick={() => setApartadoModalOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gabi-forest/20 bg-gabi-forest/5 px-4 py-3 text-sm font-bold text-gabi-forest"
              >
                <ShoppingBag className="h-4 w-4" />
                Registrar apartado
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || deleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </button>
            {adminMe.canDeleteProspectos ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting || saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar prospecto
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {apartadoModalOpen && detail ? (
        <RegistrarApartadoModal
          desarrolloId={detail.desarrollo_id}
          prospectoId={prospectoId}
          onClose={() => setApartadoModalOpen(false)}
          onSuccess={() => {
            setApartadoModalOpen(false);
            void loadDetail();
            onUpdated();
          }}
        />
      ) : null}
    </div>
  );
}
