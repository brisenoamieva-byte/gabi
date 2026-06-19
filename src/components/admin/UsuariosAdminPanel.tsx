"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Shield, UserCheck, UserX, X } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import { adminRolLabel } from "@/lib/admin/permissions";
import type { AdminRol } from "@/lib/admin/types";
import type { AdminUserRecord } from "@/lib/admin/usuarios-service";

type UsuariosAdminPanelProps = {
  desarrollos: Desarrollo[];
  currentUserId: string;
  embedded?: boolean;
  asesorNamesById?: Record<string, string>;
  onUsuariosChange?: () => void;
};

const emptyForm = {
  nombre: "",
  email: "",
  rol: "gerente" as AdminRol,
  desarrollosIds: [] as string[],
};

export function UsuariosAdminPanel({
  desarrollos,
  currentUserId,
  embedded = false,
  asesorNamesById = {},
  onUsuariosChange,
}: UsuariosAdminPanelProps) {
  const [usuarios, setUsuarios] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null);
  const [form, setForm] = useState(emptyForm);

  const desarrolloNames = useMemo(
    () => Object.fromEntries(desarrollos.map((item) => [item.id, item.nombre])),
    [desarrollos],
  );

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/usuarios");
      const data = (await response.json()) as { usuarios?: AdminUserRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la lista.");
      }

      setUsuarios(data.usuarios ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsuarios();
  }, [loadUsuarios]);

  const openCreate = () => {
    setEditUser(null);
    setForm({
      ...emptyForm,
      desarrollosIds: desarrollos[0]?.id ? [desarrollos[0].id] : [],
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (user: AdminUserRecord) => {
    setEditUser(user);
    setForm({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      desarrollosIds: [...user.desarrollosIds],
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const toggleDesarrollo = (id: string) => {
    setForm((prev) => ({
      ...prev,
      desarrollosIds: prev.desarrollosIds.includes(id)
        ? prev.desarrollosIds.filter((item) => item !== id)
        : [...prev.desarrollosIds, id],
    }));
  };

  const saveUser = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editUser) {
        const response = await fetch(`/api/admin/usuarios/${editUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            rol: form.rol,
            desarrollosIds: form.rol === "superadmin" ? [] : form.desarrollosIds,
          }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo guardar.");
        }
        setSuccess("Usuario actualizado.");
      } else {
        const response = await fetch("/api/admin/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            email: form.email,
            rol: form.rol,
            desarrollosIds: form.rol === "superadmin" ? [] : form.desarrollosIds,
          }),
        });
        const data = (await response.json()) as { invited?: boolean; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo invitar.");
        }
        setSuccess(
          data.invited
            ? `Invitación enviada a ${form.email}. Debe entrar en /admin/login y definir contraseña.`
            : `Acceso admin activado para ${form.email}.`,
        );
      }

      setShowForm(false);
      await loadUsuarios();
      onUsuariosChange?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (user: AdminUserRecord) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !user.activo }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }
      setSuccess(user.activo ? "Usuario desactivado." : "Usuario reactivado.");
      await loadUsuarios();
      onUsuariosChange?.();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const formatDesarrollos = (ids: string[]) => {
    if (!ids.length) {
      return "Todos los desarrollos";
    }
    return ids.map((id) => desarrolloNames[id] ?? id).join(" · ");
  };

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
            Accesos backoffice
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#13315C]">Usuarios admin</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-500">
            Invita gerentes y operaciones, y asigna qué desarrollos pueden gestionar en documentos,
            inventario y asesores.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 py-2.5 text-sm font-black text-[#13315C]"
          >
            <Plus className="h-4 w-4" />
            Invitar usuario
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-black text-gabi-forest">Acceso admin (email)</h3>
            <p className="mt-1 text-sm text-slate-500">
              Usuarios de backoffice, operaciones y superadmins. Los gerentes comerciales con rol
              de liderazgo se vinculan automáticamente desde la pestaña Portal comercial.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Invitar usuario
          </button>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="space-y-3">
            {usuarios.map((user) => (
              <article
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Shield className="h-4 w-4 text-[#2DD4BF]" />
                    <h4 className="font-black text-[#13315C]">{user.nombre}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        user.activo
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {user.activo ? "Activo" : "Inactivo"}
                    </span>
                    {user.id === currentUserId ? (
                      <span className="rounded-full bg-[#13315C]/10 px-2 py-0.5 text-[10px] font-bold text-[#13315C]">
                        Tú
                      </span>
                    ) : null}
                    {user.asesorId && asesorNamesById[user.asesorId] ? (
                      <span className="rounded-full bg-gabi-forest/10 px-2 py-0.5 text-[10px] font-bold text-gabi-forest">
                        Asesor: {asesorNamesById[user.asesorId]}
                      </span>
                    ) : !user.asesorId ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        Solo backoffice
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {adminRolLabel[user.rol]} · {formatDesarrollos(user.desarrollosIds)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#13315C]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  {user.id !== currentUserId ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void toggleActivo(user)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      {user.activo ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      {user.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {!usuarios.length ? (
              <p className="py-8 text-center text-sm text-slate-500">No hay usuarios admin.</p>
            ) : null}
          </div>
        )}
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <h3 className="text-xl font-black text-[#13315C]">
                {editUser ? "Editar usuario" : "Invitar usuario"}
              </h3>
              <button
                type="button"
                onClick={() => !saving && setShowForm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                  Nombre
                </span>
                <input
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  className="input-cotizador"
                />
              </label>

              {!editUser ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                    Email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="input-cotizador"
                  />
                </label>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {form.email}
                </p>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Rol</span>
                <select
                  value={form.rol}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      rol: event.target.value as AdminRol,
                      desarrollosIds:
                        event.target.value === "superadmin" ? [] : prev.desarrollosIds,
                    }))
                  }
                  className="input-cotizador"
                  disabled={editUser?.id === currentUserId}
                >
                  <option value="superadmin">Administrador gabi</option>
                  <option value="gerente">Gerente comercial</option>
                  <option value="operaciones">Operaciones</option>
                </select>
              </label>

              {form.rol !== "superadmin" ? (
                <div>
                  <span className="mb-2 block text-xs font-bold uppercase text-slate-500">
                    Desarrollos asignados
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {desarrollos.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleDesarrollo(item.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          form.desarrollosIds.includes(item.id)
                            ? "bg-[#13315C] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-[#13315C]/5 px-3 py-2 text-xs text-slate-600">
                  Superadmin tiene acceso a todos los desarrollos.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveUser()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#13315C] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editUser ? "Guardar" : "Invitar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
