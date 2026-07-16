"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Ban, Bell, ChevronDown, Loader2, Save, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/data";
import type { ProspectoDetail } from "@/lib/admin/prospectos-service";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
import type { CampanaRecord } from "@/lib/admin/campanas-service";
import type { PartnerRecord } from "@/lib/admin/partners-types";
import { partnerTipoLabel } from "@/lib/admin/partners-types";
import { RegistrarApartadoModal } from "@/components/admin/RegistrarApartadoModal";
import {
  PROSPECTO_ETAPAS,
  isProspectoEtapa,
  prospectoEtapaDot,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import {
  perfilCalificacionLeadBannerClass,
  perfilCalificacionLeadDescription,
  resolvePerfilCalificacionLead,
} from "@/lib/comercial/perfilamiento-post-visita";
import { PerfilCalificacionLeadBadge } from "@/components/asesor/PerfilCalificacionLeadBadge";
import { MotivoDescarteFields } from "@/components/comercial/MotivoDescarteFields";
import { ProspectoHistorialComercial } from "@/components/comercial/ProspectoHistorialComercial";
import type { SolicitudApartadoRow } from "@/lib/comercial/solicitud-apartado-service";
import { NIVELES_INTERES, nivelInteresLabel, type NivelInteres } from "@/lib/comercial/prospecto-interes";

type LeadDetailDrawerProps = {
  prospectoId: string;
  intentDiscard?: boolean;
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
  canRegisterApartado?: boolean;
};

export function LeadDetailDrawer({
  prospectoId,
  intentDiscard = false,
  onClose,
  onUpdated,
}: LeadDetailDrawerProps) {
  const [detail, setDetail] = useState<ProspectoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rejectingSolicitud, setRejectingSolicitud] = useState(false);
  const [error, setError] = useState("");
  const [etapa, setEtapa] = useState<ProspectoEtapa>("nuevo");
  const [notas, setNotas] = useState("");
  const [motivoDescarte, setMotivoDescarte] = useState("");
  const [motivoDescarteDetalle, setMotivoDescarteDetalle] = useState("");
  const [campanaId, setCampanaId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [nivelInteres, setNivelInteres] = useState<NivelInteres | "">("");
  const [asesorId, setAsesorId] = useState("");
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [adminMe, setAdminMe] = useState<AdminMe>({});
  const [campanas, setCampanas] = useState<CampanaRecord[]>([]);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [apartadoModalOpen, setApartadoModalOpen] = useState(false);
  const [solicitudApartado, setSolicitudApartado] = useState<SolicitudApartadoRow | null>(null);
  const [compliance, setCompliance] = useState<ProspectoComplianceRow | null>(null);
  const [crmFieldsOpen, setCrmFieldsOpen] = useState(false);

  const puedeRegistrarApartado =
    adminMe.canRegisterApartado &&
    detail != null &&
    !["apartado", "vendido", "cancelado", "perdido"].includes(detail.etapa);

  const perfilCalificacion = detail ? resolvePerfilCalificacionLead(detail) : null;

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
        const loadedEtapa = isProspectoEtapa(data.prospecto.etapa)
          ? data.prospecto.etapa
          : "nuevo";
        const cerrada = ["apartado", "vendido", "cancelado", "perdido"].includes(loadedEtapa);
        setEtapa(intentDiscard && !cerrada ? "perdido" : loadedEtapa);
        setNotas(data.prospecto.notas ?? "");
        setMotivoDescarte(data.prospecto.motivo_descarte ?? "");
        setMotivoDescarteDetalle(data.prospecto.motivo_descarte_detalle ?? "");
        setCampanaId(data.prospecto.campana_id ?? "");
        setPartnerId(data.prospecto.partner_id ?? "");
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

        const partnerParams = new URLSearchParams({
          desarrolloId: data.prospecto.desarrollo_id,
          activoOnly: "1",
        });
        const partnerResponse = await fetch(`/api/admin/partners?${partnerParams.toString()}`);
        const partnerData = (await partnerResponse.json()) as { partners?: PartnerRecord[] };
        setPartners(partnerData.partners ?? []);

        const complianceResponse = await fetch(`/api/admin/prospectos/${prospectoId}/compliance`);
        if (complianceResponse.ok) {
          const complianceData = (await complianceResponse.json()) as {
            compliance?: ProspectoComplianceRow | null;
          };
          setCompliance(complianceData.compliance ?? null);
        } else {
          setCompliance(null);
        }

        const solicitudResponse = await fetch(
          `/api/admin/solicitudes-apartado?prospectoId=${encodeURIComponent(prospectoId)}`,
        );
        if (solicitudResponse.ok) {
          const solicitudData = (await solicitudResponse.json()) as {
            solicitud?: SolicitudApartadoRow | null;
          };
          setSolicitudApartado(solicitudData.solicitud ?? null);
        } else {
          setSolicitudApartado(null);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [intentDiscard, prospectoId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    setCrmFieldsOpen(!puedeRegistrarApartado);
  }, [puedeRegistrarApartado]);

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
          motivoDescarte: etapa === "perdido" ? motivoDescarte || null : undefined,
          motivoDescarteDetalle: etapa === "perdido" ? motivoDescarteDetalle || null : undefined,
          campanaId: campanaId || null,
          partnerId: partnerId || null,
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

  const handleRejectSolicitud = async () => {
    if (!solicitudApartado || !adminMe.canRegisterApartado) {
      return;
    }

    const confirmed = window.confirm(
      `¿Rechazar la solicitud de apartado de ${solicitudApartado.asesorNombre ?? "el asesor"}? El prospecto se mantiene en el CRM; el asesor podrá solicitar de nuevo si aplica.`,
    );
    if (!confirmed) {
      return;
    }

    setRejectingSolicitud(true);
    setError("");

    try {
      const response = await fetch("/api/admin/solicitudes-apartado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solicitudId: solicitudApartado.id,
          action: "rechazar",
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo rechazar la solicitud.");
      }

      setSolicitudApartado(null);
      onUpdated();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Error al rechazar solicitud.");
    } finally {
      setRejectingSolicitud(false);
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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-gabi-forest">
                {detail?.nombre ?? "Cargando…"}
              </h3>
              {perfilCalificacion ? (
                <PerfilCalificacionLeadBadge calificacion={perfilCalificacion} size="md" />
              ) : null}
            </div>
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
              {detail.es_spam ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Marcado como <strong>spam</strong>. No cuenta en reportes activos.
                </div>
              ) : null}
              {detail.es_duplicado ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Marcado como <strong>duplicado</strong> (mismo correo o teléfono que otro lead).
                </div>
              ) : null}

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

              {solicitudApartado ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="flex items-center gap-2 font-bold">
                    <Bell className="h-4 w-4 shrink-0" />
                    Solicitud de apartado del asesor
                  </p>
                  <p className="mt-1">
                    {solicitudApartado.asesorNombre ?? "Asesor"} solicitó registrar apartado
                    {solicitudApartado.unidadNumero
                      ? ` (unidad sugerida: ${solicitudApartado.unidadNumero})`
                      : ""}
                    .
                  </p>
                  {solicitudApartado.notas ? (
                    <p className="mt-2 text-xs opacity-90">Notas: {solicitudApartado.notas}</p>
                  ) : null}
                  {puedeRegistrarApartado ? (
                    <button
                      type="button"
                      onClick={() => setApartadoModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gabi-forest px-3 py-2 text-xs font-bold text-white"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Registrar apartado
                    </button>
                  ) : null}
                </div>
              ) : null}

              {perfilCalificacion ? (
                <div
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${perfilCalificacionLeadBannerClass[perfilCalificacion]}`}
                >
                  <PerfilCalificacionLeadBadge calificacion={perfilCalificacion} size="lg" />
                  <div>
                    <p className="text-sm font-bold">Calificación del lead: {perfilCalificacion}</p>
                    <p className="mt-1 text-xs opacity-90">
                      {perfilCalificacionLeadDescription[perfilCalificacion]}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-700">Calificación pendiente</p>
                  <p className="mt-1 text-xs">
                    Se asigna A, B o C al completar el perfilamiento en el playbook (3
                    preguntas: presupuesto, apartado inmediato y decisor de compra).
                  </p>
                </div>
              )}

              {puedeRegistrarApartado ? (
                <div className="rounded-xl border border-gabi-forest/20 bg-gabi-forest/5 px-4 py-4 text-sm text-gabi-forest">
                  <p className="font-bold">Registrar apartado en sembrado</p>
                  <p className="mt-1 text-gabi-forest/80">
                    Captura cliente, contacto, precios, pagos y fechas en el formulario de apartado
                    (misma estructura que el Excel de sembrado). Los campos CRM de seguimiento quedan
                    opcionales abajo.
                  </p>
                  <button
                    type="button"
                    onClick={() => setApartadoModalOpen(true)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gabi-forest px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Registrar apartado
                  </button>
                </div>
              ) : null}

              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Etapa</span>
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span
                      className={`h-2 w-2 rounded-full ${prospectoEtapaDot[isProspectoEtapa(detail.etapa) ? detail.etapa : "nuevo"]}`}
                    />
                    {prospectoEtapaLabel[isProspectoEtapa(detail.etapa) ? detail.etapa : "nuevo"]}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Asesor</span>
                  <span className="font-medium">{detail.asesorNombre ?? "Sin asignar"}</span>
                </div>
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
                  <span className="text-slate-500">Desarrollo</span>
                  <span>{detail.producto_nombre ?? detail.desarrollo_id}</span>
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

              <div className="rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setCrmFieldsOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-gabi-forest"
                >
                  <span>
                    {puedeRegistrarApartado
                      ? "Seguimiento CRM (opcional)"
                      : "Seguimiento CRM"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${crmFieldsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {crmFieldsOpen ? (
                  <div className="space-y-4 border-t border-slate-100 px-4 py-4">
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

              {etapa === "perdido" ? (
                <MotivoDescarteFields
                  value={motivoDescarte}
                  detalle={motivoDescarteDetalle}
                  onChange={setMotivoDescarte}
                  onDetalleChange={setMotivoDescarteDetalle}
                  inputClassName={inputClass}
                />
              ) : null}

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

              <Field label="Aliado (inmobiliaria / asesor externo)">
                <select
                  value={partnerId}
                  onChange={(event) => setPartnerId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin aliado</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.nombre}
                      {partner.tipo ? ` · ${partnerTipoLabel[partner.tipo]}` : ""}
                    </option>
                  ))}
                </select>
                {detail.partnerNombre && !partnerId ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Texto legado: {detail.partnerNombre}
                  </p>
                ) : null}
              </Field>

              <Field label="Notas">
                <textarea
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  className={`${inputClass} min-h-[100px]`}
                  placeholder="Seguimiento, objeciones, próximo paso…"
                />
              </Field>

              {adminMe.canDeleteProspectos && !solicitudApartado ? (
                <div className="border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting || saving}
                    className="text-xs font-semibold text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {deleting ? "Eliminando…" : "Eliminar prospecto del CRM…"}
                  </button>
                  <p className="mt-1 text-[11px] text-slate-400">
                    También puedes eliminar varios leads desde la lista principal.
                  </p>
                </div>
              ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <ProspectoHistorialComercial operaciones={detail.operaciones} />
              </div>

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
              disabled={saving || deleting || rejectingSolicitud}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </button>
            {solicitudApartado && adminMe.canRegisterApartado ? (
              <button
                type="button"
                onClick={() => void handleRejectSolicitud()}
                disabled={rejectingSolicitud || saving || deleting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 disabled:opacity-50"
              >
                {rejectingSolicitud ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Rechazar solicitud de apartado
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {apartadoModalOpen && detail ? (
        <RegistrarApartadoModal
          desarrolloId={detail.desarrollo_id}
          prospectoId={prospectoId}
          initialUnidadId={solicitudApartado?.unidad_id ?? undefined}
          onClose={() => setApartadoModalOpen(false)}
          onSuccess={() => {
            setApartadoModalOpen(false);
            setSolicitudApartado(null);
            void loadDetail();
            onUpdated();
          }}
        />
      ) : null}
    </div>
  );
}
