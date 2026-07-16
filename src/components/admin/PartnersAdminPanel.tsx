"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import type { DesarrolloRecord } from "@/lib/catalog/types";
import {
  partnerTipoLabel,
  type PartnerRecord,
  type PartnerTipo,
} from "@/lib/admin/partners-types";

type PartnersAdminPanelProps = {
  desarrollos: DesarrolloRecord[];
  scopeLabel?: string;
};

type ComercializadoraOption = {
  id: string;
  nombre: string;
  desarrolloNombres: string[];
};

function buildComercializadoraOptions(
  desarrollos: DesarrolloRecord[],
): ComercializadoraOption[] {
  const map = new Map<string, ComercializadoraOption>();

  for (const desarrollo of desarrollos) {
    const id = desarrollo.comercializadoraId?.trim() || desarrollo.comercializador?.trim();
    if (!id) {
      continue;
    }

    const existing = map.get(id);
    if (existing) {
      if (!existing.desarrolloNombres.includes(desarrollo.nombre)) {
        existing.desarrolloNombres.push(desarrollo.nombre);
      }
      continue;
    }

    const nombreLegible =
      desarrollo.comercializador && !desarrollo.comercializador.includes("-")
        ? desarrollo.comercializador
        : id === "bbr"
          ? "BBR Habitarea"
          : id;

    map.set(id, {
      id,
      nombre: nombreLegible,
      desarrolloNombres: [desarrollo.nombre],
    });
  }

  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function PartnersAdminPanel({ desarrollos, scopeLabel }: PartnersAdminPanelProps) {
  const comercializadoras = useMemo(
    () => buildComercializadoraOptions(desarrollos),
    [desarrollos],
  );
  const [comercializadoraId, setComercializadoraId] = useState(
    () => comercializadoras[0]?.id ?? "",
  );
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const convenioInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [form, setForm] = useState({
    nombre: "",
    tipo: "inmobiliaria" as PartnerTipo,
    contactoNombre: "",
    telefono: "",
    email: "",
    notas: "",
  });
  const [createConvenioFile, setCreateConvenioFile] = useState<File | null>(null);

  useEffect(() => {
    if (!comercializadoras.length) {
      setComercializadoraId("");
      return;
    }
    if (!comercializadoras.some((item) => item.id === comercializadoraId)) {
      setComercializadoraId(comercializadoras[0].id);
    }
  }, [comercializadoras, comercializadoraId]);

  const comercializadoraActiva = comercializadoras.find(
    (item) => item.id === comercializadoraId,
  );

  const loadPartners = useCallback(async () => {
    if (!comercializadoraId) {
      setPartners([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        comercializadoraId,
        activoOnly: "0",
      });
      const response = await fetch(`/api/admin/partners?${params.toString()}`);
      const data = (await response.json()) as { partners?: PartnerRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los aliados.");
      }

      setPartners(data.partners ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [comercializadoraId]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const toggleActivo = async (partner: PartnerRecord) => {
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !partner.activo }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }
      await loadPartners();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar.");
    }
  };

  const uploadConvenio = async (partnerId: string, file: File) => {
    setUploadingId(partnerId);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/admin/partners/${partnerId}/convenio`, {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { partner?: PartnerRecord; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo subir el convenio.");
      }
      if (data.partner) {
        setPartners((prev) =>
          prev.map((row) => (row.id === partnerId ? data.partner! : row)),
        );
      } else {
        await loadPartners();
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error al subir convenio.");
    } finally {
      setUploadingId(null);
    }
  };

  const removeConvenio = async (partner: PartnerRecord) => {
    if (
      !window.confirm(
        `¿Quitar el convenio de «${partner.nombre}»? El archivo se eliminará del almacenamiento.`,
      )
    ) {
      return;
    }
    setRemovingId(partner.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}/convenio`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { partner?: PartnerRecord; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo quitar el convenio.");
      }
      if (data.partner) {
        setPartners((prev) =>
          prev.map((row) => (row.id === partner.id ? data.partner! : row)),
        );
      } else {
        await loadPartners();
      }
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Error al quitar convenio.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comercializadoraId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comercializadoraId,
          nombre: form.nombre,
          tipo: form.tipo,
          contactoNombre: form.contactoNombre,
          telefono: form.telefono,
          email: form.email,
          notas: form.notas,
        }),
      });
      const data = (await response.json()) as { partner?: PartnerRecord; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el aliado.");
      }

      if (data.partner?.id && createConvenioFile) {
        await uploadConvenio(data.partner.id, createConvenioFile);
      }

      setForm({
        nombre: "",
        tipo: "inmobiliaria",
        contactoNombre: "",
        telefono: "",
        email: "",
        notas: "",
      });
      setCreateConvenioFile(null);
      setShowNew(false);
      await loadPartners();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
            Alianzas
          </p>
          <h1 className="text-2xl font-bold text-gabi-forest">Inmobiliarias y asesores externos</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Catálogo único por comercializadora
            {comercializadoraActiva ? ` (${comercializadoraActiva.nombre})` : ""}            . Un aliado
            puede referir leads en cualquiera de sus desarrollos
            {comercializadoraActiva?.desarrolloNombres.length
              ? ` (${comercializadoraActiva.desarrolloNombres.join(", ")})`
              : ""}
            . Guarda el convenio firmado (PDF) con cada casa alianza.
            {scopeLabel ? ` · ${scopeLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {comercializadoras.length > 1 ? (
            <label className="text-xs font-semibold text-slate-500">
              Comercializadora
              <select
                value={comercializadoraId}
                onChange={(event) => setComercializadoraId(event.target.value)}
                className="mt-1 block min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gabi-forest"
              >
                {comercializadoras.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => void loadPartners()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setShowNew((value) => !value)}
            disabled={!comercializadoraId}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gabi-forest px-3 text-sm font-semibold text-white hover:bg-gabi-forest/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Nuevo aliado
          </button>
        </div>
      </div>

      {showNew ? (
        <form
          onSubmit={(event) => void handleCreate(event)}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="mb-3 text-xs text-slate-500">
            Se registra para toda la comercializadora
            {comercializadoraActiva ? ` · ${comercializadoraActiva.nombre}` : ""}. No hace falta
            repetirlo por desarrollo.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
              Nombre *
              <input
                required
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Inmobiliaria o asesor externo"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Tipo
              <select
                value={form.tipo}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tipo: event.target.value as PartnerTipo }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {(Object.keys(partnerTipoLabel) as PartnerTipo[]).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {partnerTipoLabel[tipo]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Contacto
              <input
                value={form.contactoNombre}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contactoNombre: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre de contacto"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Teléfono
              <input
                value={form.telefono}
                onChange={(event) => setForm((prev) => ({ ...prev, telefono: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
              Notas
              <textarea
                value={form.notas}
                onChange={(event) => setForm((prev) => ({ ...prev, notas: event.target.value }))}
                className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Acuerdo, condiciones, vigencia…"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
              Convenio con casa alianza (PDF)
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setCreateConvenioFile(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gabi-forest/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gabi-forest"
              />
              <span className="mt-1 block text-[11px] font-normal text-slate-400">
                Opcional al crear; también se puede subir después desde la tabla.
                {createConvenioFile ? ` · ${createConvenioFile.name}` : ""}
              </span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar aliado
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNew(false);
                setCreateConvenioFile(null);
              }}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando aliados…
        </div>
      ) : partners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Aún no hay inmobiliarias ni asesores externos registrados para esta comercializadora.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Aliado</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Convenio</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.map((partner) => (
                <tr key={partner.id} className={!partner.activo ? "opacity-60" : undefined}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gabi-forest">{partner.nombre}</p>
                    {partner.notas ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{partner.notas}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{partnerTipoLabel[partner.tipo]}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{partner.contacto_nombre ?? "—"}</p>
                    <p className="text-xs text-slate-400">
                      {[partner.telefono, partner.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      ref={(el) => {
                        convenioInputRefs.current[partner.id] = el;
                      }}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) {
                          void uploadConvenio(partner.id, file);
                        }
                      }}
                    />
                    {partner.convenio_public_url ? (
                      <div className="flex flex-col gap-1">
                        <a
                          href={partner.convenio_public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gabi-forest hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {partner.convenio_nombre_archivo ?? "Ver PDF"}
                        </a>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={uploadingId === partner.id}
                            onClick={() => convenioInputRefs.current[partner.id]?.click()}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-gabi-forest disabled:opacity-50"
                          >
                            {uploadingId === partner.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                            Reemplazar
                          </button>
                          <button
                            type="button"
                            disabled={removingId === partner.id}
                            onClick={() => void removeConvenio(partner)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            {removingId === partner.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Quitar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={uploadingId === partner.id}
                        onClick={() => convenioInputRefs.current[partner.id]?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-gabi-forest hover:bg-slate-50 disabled:opacity-50"
                      >
                        {uploadingId === partner.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Subir PDF
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        partner.activo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {partner.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void toggleActivo(partner)}
                      className="text-xs font-semibold text-gabi-forest underline-offset-2 hover:underline"
                    >
                      {partner.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
