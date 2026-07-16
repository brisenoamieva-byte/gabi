"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calculator,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Store,
  X,
} from "lucide-react";
import type {
  ComercializadoraAdminRecord,
  DesarrolloCatalogAdminRecord,
} from "@/lib/admin/catalog-service";
import { slugifyCatalogId } from "@/lib/catalog/slug";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";
import { ProductoCatalogAdminPanel } from "@/components/admin/ProductoCatalogAdminPanel";

type Tab = "comercializadoras" | "desarrollos" | "producto";

const emptyComercializadoraForm = {
  id: "",
  slug: "",
  nombre: "",
  usuario: "",
  logo: "",
  colorPrimary: "#13315C",
  colorAccent: "#2DD4BF",
};

const emptyDesarrolloForm = {
  id: "",
  slug: "",
  nombre: "",
  comercializadoraId: "",
  desarrollador: "",
  ubicacion: "",
  descripcion: "",
  precioDesde: "",
  tiposProducto: [] as string[],
  estado: "activo" as "activo" | "proximamente",
  logo: "",
  desarrolladorLogo: "",
  hubHeroImage: "",
  colorPrincipal: "#13315C",
  colorAcento: "#2DD4BF",
};

const productoOptions = ["casa", "departamento", "terreno", "oficina"] as const;

const portalPasswordHint = (slug: string) =>
  `PORTAL_${slug.toUpperCase().replace(/-/g, "_")}_PASSWORD`;

export function CatalogoAdminPanel() {
  const [tab, setTab] = useState<Tab>("comercializadoras");
  const [comercializadoras, setComercializadoras] = useState<ComercializadoraAdminRecord[]>([]);
  const [desarrollos, setDesarrollos] = useState<DesarrolloCatalogAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showComercializadoraForm, setShowComercializadoraForm] = useState(false);
  const [showDesarrolloForm, setShowDesarrolloForm] = useState(false);
  const [comercializadoraForm, setComercializadoraForm] = useState(emptyComercializadoraForm);
  const [desarrolloForm, setDesarrolloForm] = useState(emptyDesarrolloForm);
  const [editComercializadoraId, setEditComercializadoraId] = useState<string | null>(null);
  const [editDesarrolloId, setEditDesarrolloId] = useState<string | null>(null);
  const [filterComercializadoraId, setFilterComercializadoraId] = useState("");

  const comercializadoraNames = useMemo(
    () => Object.fromEntries(comercializadoras.map((item) => [item.id, item.nombre])),
    [comercializadoras],
  );

  const filteredDesarrollos = useMemo(() => {
    if (!filterComercializadoraId) {
      return desarrollos;
    }
    return desarrollos.filter((item) => item.comercializadoraId === filterComercializadoraId);
  }, [desarrollos, filterComercializadoraId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [comResponse, devResponse] = await Promise.all([
        fetch("/api/admin/catalog/comercializadoras?includeInactive=1"),
        fetch("/api/admin/catalog/desarrollos?includeInactive=1"),
      ]);

      const comData = (await comResponse.json()) as {
        comercializadoras?: ComercializadoraAdminRecord[];
        error?: string;
      };
      const devData = (await devResponse.json()) as {
        desarrollos?: DesarrolloCatalogAdminRecord[];
        error?: string;
      };

      if (!comResponse.ok) {
        throw new Error(comData.error ?? "No se pudieron cargar comercializadoras.");
      }
      if (!devResponse.ok) {
        throw new Error(devData.error ?? "No se pudieron cargar desarrollos.");
      }

      setComercializadoras(comData.comercializadoras ?? []);
      setDesarrollos(devData.desarrollos ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateComercializadora = () => {
    setEditComercializadoraId(null);
    setComercializadoraForm(emptyComercializadoraForm);
    setShowComercializadoraForm(true);
    setError("");
    setSuccess("");
  };

  const openEditComercializadora = (item: ComercializadoraAdminRecord) => {
    setEditComercializadoraId(item.id);
    setComercializadoraForm({
      id: item.id,
      slug: item.slug,
      nombre: item.nombre,
      usuario: item.usuario,
      logo: item.logo ?? "",
      colorPrimary: item.colorPrimary,
      colorAccent: item.colorAccent,
    });
    setShowComercializadoraForm(true);
    setError("");
    setSuccess("");
  };

  const openCreateDesarrollo = () => {
    setEditDesarrolloId(null);
    setDesarrolloForm({
      ...emptyDesarrolloForm,
      comercializadoraId: filterComercializadoraId || comercializadoras[0]?.id || "",
    });
    setShowDesarrolloForm(true);
    setError("");
    setSuccess("");
  };

  const openEditDesarrollo = (item: DesarrolloCatalogAdminRecord) => {
    setEditDesarrolloId(item.id);
    setDesarrolloForm({
      id: item.id,
      slug: item.slug,
      nombre: item.nombre,
      comercializadoraId: item.comercializadoraId,
      desarrollador: item.desarrollador,
      ubicacion: item.ubicacion,
      descripcion: item.descripcion,
      precioDesde: item.precioDesde ? String(item.precioDesde) : "",
      tiposProducto: [...item.tiposProducto],
      estado: item.estado,
      logo: item.logo ?? "",
      desarrolladorLogo: item.desarrolladorLogo ?? "",
      hubHeroImage: item.hubHeroImage ?? "",
      colorPrincipal: item.colorPrincipal,
      colorAcento: item.colorAcento,
    });
    setShowDesarrolloForm(true);
    setError("");
    setSuccess("");
  };

  const handleComercializadoraNombreChange = (nombre: string) => {
    setComercializadoraForm((prev) => {
      const next = { ...prev, nombre };
      if (!editComercializadoraId) {
        const slug = slugifyCatalogId(nombre);
        return { ...next, slug, id: slug, usuario: slug };
      }
      return next;
    });
  };

  const handleDesarrolloNombreChange = (nombre: string) => {
    setDesarrolloForm((prev) => {
      const next = { ...prev, nombre };
      if (!editDesarrolloId) {
        const slug = slugifyCatalogId(nombre);
        return { ...next, slug, id: slug };
      }
      return next;
    });
  };

  const toggleDesarrolloProducto = (tipo: string) => {
    setDesarrolloForm((prev) => ({
      ...prev,
      tiposProducto: prev.tiposProducto.includes(tipo)
        ? prev.tiposProducto.filter((item) => item !== tipo)
        : [...prev.tiposProducto, tipo],
    }));
  };

  const saveComercializadora = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        id: comercializadoraForm.id,
        slug: comercializadoraForm.slug,
        nombre: comercializadoraForm.nombre,
        usuario: comercializadoraForm.usuario,
        logo: comercializadoraForm.logo.trim() || null,
        colorPrimary: comercializadoraForm.colorPrimary,
        colorAccent: comercializadoraForm.colorAccent,
      };

      const response = editComercializadoraId
        ? await fetch(`/api/admin/catalog/comercializadoras/${editComercializadoraId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/catalog/comercializadoras", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      setSuccess(
        editComercializadoraId
          ? "Comercializadora actualizada."
          : `Comercializadora creada. Configura ${portalPasswordHint(comercializadoraForm.slug)} en Vercel.`,
      );
      setShowComercializadoraForm(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleComercializadoraActiva = async (item: ComercializadoraAdminRecord) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/catalog/comercializadoras/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !item.activo }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }

      setSuccess(item.activo ? "Comercializadora desactivada." : "Comercializadora reactivada.");
      await loadData();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const saveDesarrollo = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        id: desarrolloForm.id,
        slug: desarrolloForm.slug,
        nombre: desarrolloForm.nombre,
        comercializadoraId: desarrolloForm.comercializadoraId,
        desarrollador: desarrolloForm.desarrollador,
        ubicacion: desarrolloForm.ubicacion,
        descripcion: desarrolloForm.descripcion,
        precioDesde: desarrolloForm.precioDesde
          ? Number(desarrolloForm.precioDesde.replace(/,/g, ""))
          : undefined,
        tiposProducto: desarrolloForm.tiposProducto,
        estado: desarrolloForm.estado,
        logo: desarrolloForm.logo.trim() || null,
        desarrolladorLogo: desarrolloForm.desarrolladorLogo.trim() || null,
        hubHeroImage: desarrolloForm.hubHeroImage.trim() || null,
        colorPrincipal: desarrolloForm.colorPrincipal,
        colorAcento: desarrolloForm.colorAcento,
      };

      const response = editDesarrolloId
        ? await fetch(`/api/admin/catalog/desarrollos/${editDesarrolloId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/catalog/desarrollos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      setSuccess(editDesarrolloId ? "Desarrollo actualizado." : "Desarrollo creado.");
      setShowDesarrolloForm(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleDesarrolloActivo = async (item: DesarrolloCatalogAdminRecord) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/catalog/desarrollos/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !item.activo }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }

      setSuccess(
        item.activo
          ? "Desarrollo desactivado — CRM y automatizaciones pausadas."
          : "Desarrollo reactivado — CRM y automatizaciones habilitadas.",
      );
      await loadData();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
          Onboarding B2B
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#13315C]">Catálogo multi-tenant</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Alta de comercializadoras y desarrollos. Después de crear, completa producto, sembrado y
          la ficha en{" "}
          <a href="/admin/desarrollos" className="font-bold text-[#13315C] underline">
            Desarrollos
          </a>{" "}
          (bancarios, cotizador, Drive). Guía: <code className="text-xs">docs/add-desarrollo.md</code>
          .
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Solo Grupo Investti
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              Reglas e import del simulador de lotes (no aplica a BBR / Gavia).
            </p>
            <Link
              href="/admin/investti-simulador"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#13315C]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#13315C] hover:bg-white"
            >
              <Calculator className="h-4 w-4" />
              Simulador Investti
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("comercializadoras")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === "comercializadoras"
                ? "bg-[#13315C] text-white"
                : "bg-slate-100 text-[#13315C] hover:bg-slate-200"
            }`}
          >
            Comercializadoras
          </button>
          <button
            type="button"
            onClick={() => setTab("desarrollos")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === "desarrollos"
                ? "bg-[#13315C] text-white"
                : "bg-slate-100 text-[#13315C] hover:bg-slate-200"
            }`}
          >
            Desarrollos
          </button>
          <button
            type="button"
            onClick={() => setTab("producto")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === "producto"
                ? "bg-[#13315C] text-white"
                : "bg-slate-100 text-[#13315C] hover:bg-slate-200"
            }`}
          >
            Producto
          </button>
        </div>
      </div>

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

      {tab === "comercializadoras" ? (
        <section className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[#13315C]">Comercializadoras</h3>
              <p className="text-sm text-slate-500">Portales B2B y branding por tenant.</p>
            </div>
            <button
              type="button"
              onClick={openCreateComercializadora}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 py-2.5 text-sm font-black text-[#13315C]"
            >
              <Plus className="h-4 w-4" />
              Nueva comercializadora
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <div className="space-y-3">
              {comercializadoras.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Store className="h-4 w-4 text-[#2DD4BF]" />
                      <h4 className="font-black text-[#13315C]">{item.nombre}</h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.activo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {item.activo ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      ID: {item.id} · Portal: {item.portalPath} · Usuario: {item.usuario}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.desarrollosCount} desarrollo(s) · Env: {portalPasswordHint(item.slug)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={item.portalPath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#13315C]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Portal
                    </a>
                    <button
                      type="button"
                      onClick={() => openEditComercializadora(item)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#13315C]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void toggleComercializadoraActiva(item)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      {item.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  </div>
                </article>
              ))}
              {!comercializadoras.length ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No hay comercializadoras. Crea la primera o importa el catálogo piloto desde
                  Asesores.
                </p>
              ) : null}
            </div>
          )}
        </section>
      ) : tab === "desarrollos" ? (
        <section className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[#13315C]">Desarrollos</h3>
              <p className="text-sm text-slate-500">Proyectos comercializados por cada tenant.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[200px]">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Filtrar
                </span>
                <select
                  value={filterComercializadoraId}
                  onChange={(event) => setFilterComercializadoraId(event.target.value)}
                  className="input-cotizador"
                >
                  <option value="">Todas</option>
                  {comercializadoras.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={openCreateDesarrollo}
                disabled={!comercializadoras.length}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 py-2.5 text-sm font-black text-[#13315C] disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Nuevo desarrollo
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDesarrollos.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#2DD4BF]" />
                      <h4 className="font-black text-[#13315C]">{item.nombre}</h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.activo && item.estado === "activo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.activo ? item.estado : "Inactivo"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {comercializadoraNames[item.comercializadoraId] ?? item.comercializadoraId}{" "}
                      · {item.ubicacion || "Sin ubicación"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      ID: {item.id} · Tipos: {item.tiposProducto.join(", ") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditDesarrollo(item)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#13315C]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void toggleDesarrolloActivo(item)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      {item.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  </div>
                </article>
              ))}
              {!filteredDesarrollos.length ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No hay desarrollos para este filtro.
                </p>
              ) : null}
            </div>
          )}
        </section>
      ) : (
        <ProductoCatalogAdminPanel
          desarrollos={filteredDesarrollos.map((item) => ({
            id: item.id,
            nombre: item.nombre,
          }))}
        />
      )}

      {showComercializadoraForm ? (
        <FormModal
          title={editComercializadoraId ? "Editar comercializadora" : "Nueva comercializadora"}
          onClose={() => !saving && setShowComercializadoraForm(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={comercializadoraForm.nombre}
                onChange={(event) => handleComercializadoraNombreChange(event.target.value)}
                className="input-cotizador"
                placeholder="BBR Habitarea"
              />
            </Field>
            <Field label="ID (no editable después)">
              <input
                value={comercializadoraForm.id}
                onChange={(event) =>
                  setComercializadoraForm((prev) => ({
                    ...prev,
                    id: slugifyCatalogId(event.target.value),
                  }))
                }
                disabled={Boolean(editComercializadoraId)}
                className="input-cotizador disabled:opacity-60"
              />
            </Field>
            <Field label="Slug portal">
              <input
                value={comercializadoraForm.slug}
                onChange={(event) =>
                  setComercializadoraForm((prev) => ({
                    ...prev,
                    slug: slugifyCatalogId(event.target.value),
                  }))
                }
                className="input-cotizador"
              />
            </Field>
            <Field label="Usuario portal">
              <input
                value={comercializadoraForm.usuario}
                onChange={(event) =>
                  setComercializadoraForm((prev) => ({
                    ...prev,
                    usuario: event.target.value.toLowerCase(),
                  }))
                }
                className="input-cotizador"
              />
            </Field>
            <AdminImageUploadField
              label="Logo comercializadora"
              className="sm:col-span-2"
              value={comercializadoraForm.logo}
              onChange={(url) => setComercializadoraForm((prev) => ({ ...prev, logo: url }))}
              kind="comercializadora-logo"
              comercializadoraId={comercializadoraForm.id || editComercializadoraId || undefined}
              hint="Visible en portales y dashboard."
            />
            <Field label="Color principal">
              <input
                type="color"
                value={comercializadoraForm.colorPrimary}
                onChange={(event) =>
                  setComercializadoraForm((prev) => ({
                    ...prev,
                    colorPrimary: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200"
              />
            </Field>
            <Field label="Color acento">
              <input
                type="color"
                value={comercializadoraForm.colorAccent}
                onChange={(event) =>
                  setComercializadoraForm((prev) => ({
                    ...prev,
                    colorAccent: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200"
              />
            </Field>
          </div>
          {!editComercializadoraId ? (
            <p className="mt-4 rounded-xl bg-[#13315C]/5 p-3 text-xs text-slate-600">
              Después de crear, agrega{" "}
              <code className="font-mono">{portalPasswordHint(comercializadoraForm.slug || "slug")}</code>{" "}
              en las variables de entorno de Vercel.
            </p>
          ) : null}
          <ModalActions
            saving={saving}
            onCancel={() => setShowComercializadoraForm(false)}
            onSave={() => void saveComercializadora()}
          />
        </FormModal>
      ) : null}

      {showDesarrolloForm ? (
        <FormModal
          title={editDesarrolloId ? "Editar desarrollo" : "Nuevo desarrollo"}
          onClose={() => !saving && setShowDesarrolloForm(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={desarrolloForm.nombre}
                onChange={(event) => handleDesarrolloNombreChange(event.target.value)}
                className="input-cotizador"
              />
            </Field>
            <Field label="Comercializadora">
              <select
                value={desarrolloForm.comercializadoraId}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({
                    ...prev,
                    comercializadoraId: event.target.value,
                  }))
                }
                className="input-cotizador"
              >
                <option value="">Selecciona...</option>
                {comercializadoras
                  .filter((item) => item.activo)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="ID">
              <input
                value={desarrolloForm.id}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({
                    ...prev,
                    id: slugifyCatalogId(event.target.value),
                  }))
                }
                disabled={Boolean(editDesarrolloId)}
                className="input-cotizador disabled:opacity-60"
              />
            </Field>
            <Field label="Slug">
              <input
                value={desarrolloForm.slug}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({
                    ...prev,
                    slug: slugifyCatalogId(event.target.value),
                  }))
                }
                className="input-cotizador"
              />
            </Field>
            <Field label="Desarrollador">
              <input
                value={desarrolloForm.desarrollador}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({ ...prev, desarrollador: event.target.value }))
                }
                className="input-cotizador"
              />
            </Field>
            <Field label="Ubicación">
              <input
                value={desarrolloForm.ubicacion}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({ ...prev, ubicacion: event.target.value }))
                }
                className="input-cotizador"
              />
            </Field>
            <Field label="Precio desde">
              <input
                value={desarrolloForm.precioDesde}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({ ...prev, precioDesde: event.target.value }))
                }
                className="input-cotizador"
                placeholder="2500000"
              />
            </Field>
            <Field label="Estado">
              <select
                value={desarrolloForm.estado}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({
                    ...prev,
                    estado: event.target.value as "activo" | "proximamente",
                  }))
                }
                className="input-cotizador"
              >
                <option value="activo">Activo</option>
                <option value="proximamente">Próximamente</option>
              </select>
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <textarea
                value={desarrolloForm.descripcion}
                onChange={(event) =>
                  setDesarrolloForm((prev) => ({ ...prev, descripcion: event.target.value }))
                }
                className="input-cotizador min-h-24"
              />
            </Field>
            <AdminImageUploadField
              label="Logo desarrollo"
              className="sm:col-span-2"
              value={desarrolloForm.logo}
              onChange={(url) => setDesarrolloForm((prev) => ({ ...prev, logo: url }))}
              kind="desarrollo-logo"
              desarrolloId={desarrolloForm.id || editDesarrolloId || undefined}
              hint="Hub de desarrollos, cotizador y selector de proyecto."
            />
            <AdminImageUploadField
              label="Logo desarrollador"
              className="sm:col-span-2"
              value={desarrolloForm.desarrolladorLogo}
              onChange={(url) => setDesarrolloForm((prev) => ({ ...prev, desarrolladorLogo: url }))}
              kind="desarrollo-desarrollador-logo"
              desarrolloId={desarrolloForm.id || editDesarrolloId || undefined}
              hint="Cabecera del cotizador y materiales comerciales."
            />
            <AdminImageUploadField
              label="Portada hub"
              className="sm:col-span-2"
              value={desarrolloForm.hubHeroImage}
              onChange={(url) => setDesarrolloForm((prev) => ({ ...prev, hubHeroImage: url }))}
              kind="hub-hero"
              desarrolloId={desarrolloForm.id || editDesarrolloId || undefined}
              hint="Imagen wide en la tarjeta y detalle de Desarrollos admin. JPG/PNG recomendado 16:10."
            />
            <div className="sm:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase text-slate-500">
                Tipos de producto
              </span>
              <div className="flex flex-wrap gap-2">
                {productoOptions.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleDesarrolloProducto(tipo)}
                    className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                      desarrolloForm.tiposProducto.includes(tipo)
                        ? "bg-[#13315C] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ModalActions
            saving={saving}
            onCancel={() => setShowDesarrolloForm(false)}
            onSave={() => void saveDesarrollo()}
          />
        </FormModal>
      ) : null}
    </div>
  );
}

function FormModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h3 className="text-xl font-black text-[#13315C]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ModalActions({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-[#13315C] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Guardar
      </button>
    </div>
  );
}
