"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import {
  partnerTipoLabel,
  type PartnerRecord,
  type PartnerTipo,
} from "@/lib/admin/partners-types";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type PartnersAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

export function PartnersAdminPanel({ desarrollos, scopeLabel }: PartnersAdminPanelProps) {
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    tipo: "inmobiliaria" as PartnerTipo,
    contactoNombre: "",
    telefono: "",
    email: "",
    notas: "",
  });

  const loadPartners = useCallback(async () => {
    if (!desarrolloId) {
      setPartners([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId });
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
  }, [desarrolloId]);

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

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!desarrolloId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          nombre: form.nombre,
          tipo: form.tipo,
          contactoNombre: form.contactoNombre,
          telefono: form.telefono,
          email: form.email,
          notas: form.notas,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el aliado.");
      }

      setForm({
        nombre: "",
        tipo: "inmobiliaria",
        contactoNombre: "",
        telefono: "",
        email: "",
        notas: "",
      });
      setShowNew(false);
      await loadPartners();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear.");
    } finally {
      setSaving(false);
    }
  };

  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
            Alianzas
          </p>
          <h1 className="text-2xl font-bold text-gabi-forest">Inmobiliarias y asesores externos</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Catálogo de aliados de la comercializadora
            {desarrollo ? ` (${desarrollo.comercializador ?? "actual"})` : ""}. Los leads de
            Gavia u otros desarrollos se vinculan a estos registros.
            {scopeLabel ? ` · ${scopeLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">
            Desarrollo
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="mt-1 block min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gabi-forest"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
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
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gabi-forest px-3 text-sm font-semibold text-white hover:bg-gabi-forest/90"
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
              onClick={() => setShowNew(false)}
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Aliado</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
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
