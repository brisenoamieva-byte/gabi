"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Plus, RefreshCw } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { CampanaRecord, CampanaTipo } from "@/lib/admin/campanas-service";
import { buildParseurWebhookUrl } from "@/lib/comercial/parseur-webhook-url";

type CampanasAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  /** Oculta cabecera y selector; usa `initialDesarrolloId` fijo. */
  embedded?: boolean;
  initialDesarrolloId?: string;
};

const tipoLabel: Record<CampanaTipo, string> = {
  online: "Online",
  offline: "Offline",
};

function WebhookCopyButton({ campanaId }: { campanaId: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? buildParseurWebhookUrl(campanaId, window.location.origin)
      : buildParseurWebhookUrl(campanaId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia la URL del webhook:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1 rounded-lg border border-gabi-forest/15 px-2.5 py-1.5 text-xs font-bold text-gabi-forest hover:bg-gabi-forest/5"
      title={url}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar URL"}
    </button>
  );
}

export function CampanasAdminPanel({
  desarrollos,
  scopeLabel,
  embedded = false,
  initialDesarrolloId,
}: CampanasAdminPanelProps) {
  const [desarrolloId, setDesarrolloId] = useState(
    embedded ? (initialDesarrolloId ?? "") : (desarrollos[0]?.id ?? ""),
  );
  const [campanas, setCampanas] = useState<CampanaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    canal: "",
    tipo: "online" as CampanaTipo,
    parseurEmail: "",
  });

  const loadCampanas = useCallback(async () => {
    if (!desarrolloId) {
      setCampanas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId });
      const response = await fetch(`/api/admin/campanas?${params.toString()}`);
      const data = (await response.json()) as { campanas?: CampanaRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las campañas.");
      }

      setCampanas(data.campanas ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setCampanas([]);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    if (embedded && initialDesarrolloId) {
      setDesarrolloId(initialDesarrolloId);
    }
  }, [embedded, initialDesarrolloId]);

  useEffect(() => {
    void loadCampanas();
  }, [loadCampanas]);

  const toggleActivo = async (campana: CampanaRecord) => {
    try {
      const response = await fetch(`/api/admin/campanas/${campana.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !campana.activo }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }

      void loadCampanas();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar.");
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/campanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          nombre: form.nombre,
          canal: form.canal || undefined,
          tipo: form.tipo,
          parseurEmail: form.parseurEmail || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear la campaña.");
      }

      setForm({ nombre: "", canal: "", tipo: "online", parseurEmail: "" });
      setShowNew(false);
      void loadCampanas();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear.");
    } finally {
      setSaving(false);
    }
  };

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados.
      </div>
    );
  }

  const actionButtons = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setShowNew(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
      >
        <Plus className="h-4 w-4" />
        Campaña
      </button>
      <button
        type="button"
        onClick={() => void loadCampanas()}
        className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white"
      >
        <RefreshCw className="h-4 w-4" />
        Actualizar
      </button>
    </div>
  );

  return (
    <div className={embedded ? "space-y-4" : "space-y-6"}>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gabi-forest">Campañas</h3>
            <p className="text-sm text-slate-500">Canales de captación y atribución de leads.</p>
          </div>
          {actionButtons}
        </div>
      ) : (
        <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">CRM</p>
              <h2 className="text-2xl font-black text-gabi-forest">Campañas</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Canales de captación por desarrollo — atribución de leads (Online / Offline).
                {scopeLabel ? ` Alcance: ${scopeLabel}.` : ""}
              </p>
            </div>
            {actionButtons}
          </div>

          <label className="mt-5 block max-w-xs text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {error.includes("campanas") || error.includes("schema") ? (
            <p className="mt-1 text-xs">Aplica la migración 019_campanas.sql en Supabase.</p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando campañas…
          </div>
        ) : !campanas.length ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            No hay campañas para este desarrollo. Crea la primera con el botón Campaña.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Activa</th>
                  <th className="px-4 py-3">Nombre / Canal</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Email Parseur</th>
                  <th className="px-4 py-3">Webhook GABI</th>
                </tr>
              </thead>
              <tbody>
                {campanas.map((campana) => (
                  <tr key={campana.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void toggleActivo(campana)}
                        className={`relative h-6 w-11 rounded-full transition ${
                          campana.activo ? "bg-gabi-forest" : "bg-slate-200"
                        }`}
                        aria-label={campana.activo ? "Desactivar" : "Activar"}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                            campana.activo ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gabi-forest">{campana.nombre}</p>
                      <p className="text-slate-500">{campana.canal ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          campana.tipo === "online"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {tipoLabel[campana.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{campana.parseur_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {campana.activo ? (
                        <WebhookCopyButton campanaId={campana.id} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(event) => void handleCreate(event)}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-black text-gabi-forest">Nueva campaña</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-600">Nombre *</span>
                <input
                  required
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="WA Landing / Whatsapp QR"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-600">Canal</span>
                <input
                  value={form.canal}
                  onChange={(event) => setForm((prev) => ({ ...prev, canal: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Whatsapp, Facebook, Teléfono…"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-600">Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, tipo: event.target.value as CampanaTipo }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-600">Email Parseur</span>
                <input
                  value={form.parseurEmail}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, parseurEmail: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="i.desarrollo@in.parseur.com"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Opcional si usas la URL de webhook por campaña. En Parseur configura POST con header{" "}
                  <code className="rounded bg-slate-100 px-1">Authorization: Bearer</code> y tu{" "}
                  <code className="rounded bg-slate-100 px-1">PARSEUR_WEBHOOK_SECRET</code>.
                </p>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
