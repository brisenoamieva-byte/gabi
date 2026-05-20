"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, KeyRound, Loader2, Pencil, Plus, Shield, Trash2, UserCheck, UserX, X } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import {
  ALL_ASESOR_ROLES,
  asesorRolLabel,
  getEditableAsesorRoles,
  isLeadershipAsesorRol,
  type AsesorRecord,
  type AsesorRol,
} from "@/lib/asesores/types";

type AsesoresAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  isGerenteComercial?: boolean;
};

const emptyForm = {
  nombre: "",
  email: "",
  rol: "asesor" as AsesorRol,
  formDesarrolloId: "",
  formDesarrollosIds: [] as string[],
};

type AdminSyncPayload = {
  adminMessage?: string;
  adminInviteSent?: boolean;
  adminLinked?: boolean;
};

const withAdminSyncMessage = (base: string, adminSync?: AdminSyncPayload) =>
  adminSync?.adminMessage ? `${base} ${adminSync.adminMessage}` : base;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function AsesoresAdminPanel({
  desarrollos,
  scopeLabel,
  isGerenteComercial = false,
}: AsesoresAdminPanelProps) {
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [asesores, setAsesores] = useState<AsesorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editForm, setEditForm] = useState<{
    id: string;
    nombre: string;
    email: string;
    rol: AsesorRol;
    desarrollosIds: string[];
  } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Array<{ nombre: string; pin: string }>>([]);

  const desarrolloNames = useMemo(
    () => Object.fromEntries(desarrollos.map((item) => [item.id, item.nombre])),
    [desarrollos],
  );

  const selectedDesarrollo = useMemo(
    () => desarrollos.find((item) => item.id === desarrolloId),
    [desarrolloId, desarrollos],
  );

  const formDesarrollo = useMemo(
    () => desarrollos.find((item) => item.id === form.formDesarrolloId),
    [desarrollos, form.formDesarrolloId],
  );

  useEffect(() => {
    if (!editForm) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setEditForm(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editForm, saving]);

  const loadAsesores = useCallback(async () => {
    if (!desarrolloId) {
      setAsesores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        desarrolloId,
        includeInactive: "1",
      });
      const response = await fetch(`/api/admin/asesores?${params}`);
      const data = (await response.json()) as {
        asesores?: AsesorRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la lista.");
      }

      setAsesores(data.asesores ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadAsesores();
  }, [loadAsesores]);

  useEffect(() => {
    if (!desarrolloId && desarrollos[0]?.id) {
      setDesarrolloId(desarrollos[0].id);
    }
  }, [desarrolloId, desarrollos]);

  const openCreateForm = () => {
    const defaultDesarrolloId = desarrolloId || desarrollos[0]?.id || "";
    setEditForm(null);
    setForm({
      ...emptyForm,
      formDesarrolloId: defaultDesarrolloId,
      formDesarrollosIds: defaultDesarrolloId ? [defaultDesarrolloId] : [],
    });
    setRevealedPin(null);
    setRevealedPins([]);
    setShowForm(true);
    setSuccess("");
    setError("");
  };

  const handleImportDemo = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    setRevealedPin(null);
    setRevealedPins([]);

    try {
      const response = await fetch("/api/admin/asesores/seed-demo", { method: "POST" });
      const data = (await response.json()) as {
        created?: AsesorRecord[];
        skipped?: Array<{ id: string; nombre: string; reason: string }>;
        pins?: Array<{ id: string; nombre: string; pin: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo importar la demo.");
      }

      const createdCount = data.created?.length ?? 0;
      const skippedCount = data.skipped?.length ?? 0;

      if (createdCount) {
        setRevealedPins(
          (data.pins ?? []).map((item) => ({ nombre: item.nombre, pin: item.pin })),
        );
        setSuccess(
          `Importados ${createdCount} asesor(es) demo.` +
            (skippedCount ? ` ${skippedCount} ya existían y se omitieron.` : ""),
        );
      } else if (skippedCount) {
        setSuccess("Los asesores demo ya estaban en Supabase. No se duplicaron.");
      } else {
        setSuccess("No había asesores demo para importar en tu alcance.");
      }

      await loadAsesores();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Error al importar demo");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("El email debe tener formato válido (ej. nombre@empresa.com).");
      return;
    }

    const desarrollosIds = isGerenteComercial
      ? form.formDesarrolloId
        ? [form.formDesarrolloId]
        : []
      : form.formDesarrollosIds;

    if (!desarrollosIds.length) {
      setError("Selecciona el desarrollo para este acceso.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/asesores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          rol: isGerenteComercial
            ? ALL_ASESOR_ROLES.includes(form.rol)
              ? form.rol
              : "asesor"
            : form.rol,
          desarrollosIds,
        }),
      });
      const data = (await response.json()) as {
        asesor?: AsesorRecord;
        pin?: string;
        adminSync?: AdminSyncPayload;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el asesor.");
      }

      setRevealedPin(data.pin ?? null);
      setRevealedPins([]);
      setSuccess(
        withAdminSyncMessage(
          `Acceso creado en ${desarrolloNames[desarrollosIds[0]] ?? "el desarrollo"}. Comparte el PIN con ${form.nombre.trim()}.`,
          data.adminSync,
        ),
      );
      setShowForm(false);
      setForm(emptyForm);
      await loadAsesores();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = (asesor: AsesorRecord) => {
    setShowForm(false);
    setEditForm({
      id: asesor.id,
      nombre: asesor.nombre,
      email: asesor.email,
      rol: asesor.rol,
      desarrollosIds: [...asesor.desarrollosIds],
    });
    setRevealedPin(null);
    setRevealedPins([]);
    setSuccess("");
    setError("");
  };

  const handleUpdate = async () => {
    if (!editForm) {
      return;
    }

    if (!editForm.nombre.trim() || !editForm.email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }

    if (!isValidEmail(editForm.email)) {
      setError("El email debe tener formato válido (ej. nombre@empresa.com).");
      return;
    }

    const desarrollosIds = isGerenteComercial
      ? editForm.desarrollosIds.slice(0, 1)
      : editForm.desarrollosIds;

    if (!desarrollosIds.length) {
      setError("Selecciona al menos un desarrollo.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/asesores/${encodeURIComponent(editForm.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editForm.nombre.trim(),
          email: editForm.email.trim(),
          rol: editForm.rol,
          desarrollosIds,
        }),
      });
      const data = (await response.json()) as {
        asesor?: AsesorRecord;
        adminSync?: AdminSyncPayload;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar el asesor.");
      }

      const savedName = editForm.nombre.trim();
      setEditForm(null);
      setSuccess(
        withAdminSyncMessage(`Datos de ${savedName} actualizados.`, data.adminSync),
      );
      await loadAsesores();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asesor: AsesorRecord) => {
    const confirmed = window.confirm(
      `¿Eliminar permanentemente a ${asesor.nombre}? Se borra el acceso al portal y su PIN. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) {
      return;
    }

    setSavingId(asesor.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/asesores/${asesor.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string; nombre?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el asesor.");
      }

      if (editForm?.id === asesor.id) {
        setEditForm(null);
      }

      setSuccess(`${data.nombre ?? asesor.nombre} eliminado permanentemente.`);
      await loadAsesores();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error al eliminar");
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPin = async (asesor: AsesorRecord) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/asesores/${asesor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regeneratePin: true }),
      });
      const data = (await response.json()) as {
        pin?: string;
        adminSync?: AdminSyncPayload;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo resetear el PIN.");
      }

      setRevealedPin(data.pin ?? null);
      setRevealedPins([]);
      setSuccess(
        withAdminSyncMessage(
          `Nuevo PIN para ${asesor.nombre}${data.pin ? `: ${data.pin}` : ""}.`,
          data.adminSync,
        ),
      );
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Error al resetear PIN");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRol = async (asesor: AsesorRecord, rol: AsesorRol) => {
    if (asesor.rol === rol) {
      return;
    }

    setSavingId(asesor.id);
    setError("");
    setSuccess("");
    setRevealedPin(null);
    setRevealedPins([]);

    try {
      const response = await fetch(`/api/admin/asesores/${asesor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol }),
      });
      const data = (await response.json()) as { adminSync?: AdminSyncPayload; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cambiar el rol.");
      }

      setSuccess(
        withAdminSyncMessage(`${asesor.nombre} ahora es ${asesorRolLabel[rol]}.`, data.adminSync),
      );
      await loadAsesores();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Error al cambiar rol");
    } finally {
      setSavingId(null);
    }
  };

  const handleSyncAdmin = async (asesor: AsesorRecord) => {
    setSavingId(asesor.id);
    setError("");
    setSuccess("");
    setRevealedPin(null);
    setRevealedPins([]);

    try {
      const response = await fetch(`/api/admin/asesores/${asesor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncAdmin: true }),
      });
      const data = (await response.json()) as { adminSync?: AdminSyncPayload; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo sincronizar acceso admin.");
      }

      setSuccess(
        withAdminSyncMessage(`Acceso admin de ${asesor.nombre} actualizado.`, data.adminSync),
      );
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Error al sincronizar admin");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (asesor: AsesorRecord) => {
    setSavingId(asesor.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/asesores/${asesor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !asesor.activo }),
      });
      const data = (await response.json()) as { adminSync?: AdminSyncPayload; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar el asesor.");
      }

      setSuccess(
        withAdminSyncMessage(
          asesor.activo ? `${asesor.nombre} desactivado.` : `${asesor.nombre} activado.`,
          data.adminSync,
        ),
      );
      await loadAsesores();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar");
    } finally {
      setSavingId(null);
    }
  };

  const toggleDesarrolloInForm = (id: string) => {
    setForm((current) => ({
      ...current,
      formDesarrollosIds: current.formDesarrollosIds.includes(id)
        ? current.formDesarrollosIds.filter((item) => item !== id)
        : [...current.formDesarrollosIds, id],
    }));
  };

  return (
    <div className="space-y-6">
      {desarrollos.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          No tienes desarrollos asignados. Pide al administrador gabi que configure tu perfil.
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
          Paso 3 · Asesores
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#13315C]">Accesos al portal comercial</h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-[#13315C]/5 px-3 py-1 text-xs font-semibold text-[#13315C]">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          {isGerenteComercial ? (
            <>
              Crea accesos comerciales para tu desarrollo.{" "}
              <strong>Gerente</strong>, <strong>Coordinador</strong> y <strong>Director</strong>{" "}
              tienen permisos amplios en el desarrollo y pueden entrar a{" "}
              <strong>/admin</strong> además del PIN en <strong>/portal/bbr</strong>.
            </>
          ) : (
            <>
              Crea accesos comerciales, asigna desarrollos y roles. El PIN de 4 dígitos se genera
              automáticamente por comercializadora. Compártelo por canal seguro para entrar en{" "}
              <strong>/portal/bbr</strong>.
            </>
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-[220px]">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              {isGerenteComercial ? "Ver asesores de" : "Desarrollo"}
            </span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="input-cotizador"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          {!isGerenteComercial ? (
            <button
              type="button"
              onClick={() => void handleImportDemo()}
              disabled={!desarrolloId || saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#13315C]/15 bg-white px-4 text-sm font-semibold text-[#13315C] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Importar demo BBR
            </button>
          ) : null}
          <button
            type="button"
            onClick={openCreateForm}
            disabled={!desarrolloId || saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#13315C] px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {isGerenteComercial ? "Nuevo acceso comercial" : "Nuevo asesor"}
          </button>
        </div>

        {!isGerenteComercial ? (
          <p className="mt-4 max-w-3xl text-xs text-slate-500">
            <strong>Importar demo BBR</strong> carga Ricardo (PIN 1234) y Rodrigo (PIN 5678) en
            Supabase con PIN hasheado. Solo se crean si aún no existen.
          </p>
        ) : selectedDesarrollo ? (
          <p className="mt-4 max-w-3xl text-xs text-slate-500">
            Comercializadora: <strong>{selectedDesarrollo.comercializador}</strong>. Roles
            disponibles: Gerente, Coordinador, Director y Asesor.
          </p>
        ) : null}

        <p className="mt-4 max-w-3xl text-xs text-slate-500">
          <strong>Desactivar</strong> suspende el acceso sin borrar datos; puedes reactivar después.
          <strong> Editar</strong> corrige nombre, email, rol o desarrollos.
          <strong> Eliminar</strong> borra el acceso de forma permanente (incluye PIN).
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {success}
          {revealedPin ? (
            <span className="mt-2 block font-black tracking-widest text-[#13315C]">
              PIN: {revealedPin}
            </span>
          ) : null}
          {revealedPins.length ? (
            <ul className="mt-2 space-y-1 font-black tracking-widest text-[#13315C]">
              {revealedPins.map((item) => (
                <li key={item.nombre}>
                  {item.nombre}: {item.pin}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
        <div className="rounded-2xl border border-[#13315C]/10 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-[#13315C]">
            {isGerenteComercial ? "Alta de acceso comercial" : "Alta de asesor"}
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Nombre
              </span>
              <input
                value={form.nombre}
                onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                className="input-cotizador"
                placeholder="Nombre completo"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Email
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="input-cotizador"
                placeholder="asesor@empresa.com"
              />
            </label>

            {isGerenteComercial ? (
              <>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Desarrollo asignado
                  </span>
                  <select
                    value={form.formDesarrolloId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, formDesarrolloId: event.target.value }))
                    }
                    className="input-cotizador"
                  >
                    <option value="">Selecciona un desarrollo</option>
                    {desarrollos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Rol en el desarrollo
                  </span>
                  <select
                    value={form.rol}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, rol: event.target.value as AsesorRol }))
                    }
                    className="input-cotizador"
                  >
                    {ALL_ASESOR_ROLES.map((rol) => (
                      <option key={rol} value={rol}>
                        {asesorRolLabel[rol]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Gerente, Coordinador y Director comparten permisos amplios en el desarrollo y
                    reciben invitación a <strong>/admin/login</strong>.
                  </p>
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Rol en el desarrollo
                  </span>
                  <select
                    value={form.rol}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, rol: event.target.value as AsesorRol }))
                    }
                    className="input-cotizador"
                  >
                    {ALL_ASESOR_ROLES.map((rol) => (
                      <option key={rol} value={rol}>
                        {asesorRolLabel[rol]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    PIN
                  </span>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Se generará automáticamente al guardar (único por comercializadora).
                  </p>
                </div>
              </>
            )}
          </div>

          {isGerenteComercial && formDesarrollo ? (
            <p className="mt-4 text-xs text-slate-500">
              Comercializadora: <strong>{formDesarrollo.comercializador}</strong>. El PIN será único
              entre los asesores activos de esta comercializadora.
            </p>
          ) : null}

          {!isGerenteComercial ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Desarrollos asignados
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {desarrollos.map((item) => {
                  const selected = form.formDesarrollosIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleDesarrolloInForm(item.id)}
                      className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                        selected
                          ? "bg-[#13315C] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {item.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 text-sm font-bold text-[#13315C] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar asesor
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#13315C]/8 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando asesores...
          </div>
        ) : asesores.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Asesor</th>
                  <th className="px-4 py-3">Rol en el desarrollo</th>
                  <th className="px-4 py-3">Desarrollo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {asesores.map((asesor) => (
                  <tr key={asesor.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#13315C]">{asesor.nombre}</p>
                      <p className="text-xs text-slate-500">{asesor.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={asesor.rol}
                        onChange={(event) =>
                          void handleChangeRol(asesor, event.target.value as AsesorRol)
                        }
                        disabled={Boolean(savingId) || saving}
                        className="min-w-[11rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-[#13315C] disabled:opacity-50"
                        aria-label={`Rol de ${asesor.nombre}`}
                      >
                        {getEditableAsesorRoles(isGerenteComercial, asesor.rol).map((rol) => (
                          <option key={rol} value={rol}>
                            {asesorRolLabel[rol]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {asesor.desarrollosIds
                        .map((id) => desarrolloNames[id] ?? id)
                        .join(" · ")}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          asesor.activo
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {asesor.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(asesor)}
                          disabled={Boolean(savingId) || saving}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#13315C]/15 px-3 py-2 text-xs font-bold text-[#13315C] disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        {isLeadershipAsesorRol(asesor.rol) && asesor.activo ? (
                          <button
                            type="button"
                            onClick={() => void handleSyncAdmin(asesor)}
                            disabled={Boolean(savingId) || saving}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-3 py-2 text-xs font-bold text-[#13315C] disabled:opacity-40"
                          >
                            <Shield className="h-3.5 w-3.5" />
                            Acceso admin
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleResetPin(asesor)}
                          disabled={savingId === asesor.id || saving || !asesor.activo}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#13315C]/15 px-3 py-2 text-xs font-bold text-[#13315C] disabled:opacity-40"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(asesor)}
                          disabled={Boolean(savingId) || saving}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                        >
                          {asesor.activo ? (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              Activar
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(asesor)}
                          disabled={Boolean(savingId) || saving}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            No hay asesores para este desarrollo. Crea el primero con el botón de arriba.
          </div>
        )}
      </div>

      {editForm ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#13315C]/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-asesor-title"
          onClick={() => {
            if (!saving) {
              setEditForm(null);
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#2DD4BF]/30 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
                  Edición
                </p>
                <h3 id="edit-asesor-title" className="mt-1 text-lg font-black text-[#13315C]">
                  Editar acceso comercial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditForm(null);
                  setError("");
                }}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-red-700">
                {error}
              </div>
            ) : null}

            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleUpdate();
              }}
            >
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Nombre
                </span>
                <input
                  value={editForm.nombre}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, nombre: event.target.value } : current,
                    )
                  }
                  className="input-cotizador"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, email: event.target.value } : current,
                    )
                  }
                  className="input-cotizador"
                  placeholder="nombre@empresa.com"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Rol en el desarrollo
                </span>
                <select
                  value={editForm.rol}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, rol: event.target.value as AsesorRol } : current,
                    )
                  }
                  className="input-cotizador"
                >
                  {getEditableAsesorRoles(isGerenteComercial, editForm.rol).map((rol) => (
                    <option key={rol} value={rol}>
                      {asesorRolLabel[rol]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!isGerenteComercial ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Desarrollos asignados
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {desarrollos.map((item) => {
                    const selected = editForm.desarrollosIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setEditForm((current) =>
                            current
                              ? {
                                  ...current,
                                  desarrollosIds: selected
                                    ? current.desarrollosIds.filter((id) => id !== item.id)
                                    : [...current.desarrollosIds, item.id],
                                }
                              : current,
                          )
                        }
                        className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                          selected
                            ? "bg-[#13315C] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {item.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] px-4 text-sm font-bold text-[#13315C] disabled:opacity-40 sm:flex-none"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditForm(null);
                  setError("");
                }}
                disabled={saving}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
