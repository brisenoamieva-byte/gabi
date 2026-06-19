"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { AsesoresAdminPanel } from "@/components/admin/AsesoresAdminPanel";
import { UsuariosAdminPanel } from "@/components/admin/UsuariosAdminPanel";
import type { AdminLinkByAsesor, EquipoTab } from "@/lib/admin/equipo-types";
import type { AdminUserRecord } from "@/lib/admin/usuarios-service";
import type { Desarrollo } from "@/lib/data";
import type { AsesorRecord } from "@/lib/asesores/types";

type EquipoAdminPanelProps = {
  desarrollos: Desarrollo[];
  adminDesarrollos: Desarrollo[];
  scopeLabel?: string;
  isGerenteComercial?: boolean;
  isSuperAdmin?: boolean;
  currentUserId: string;
  initialTab?: EquipoTab;
};

export type { AdminLinkByAsesor, EquipoTab } from "@/lib/admin/equipo-types";

export function EquipoAdminPanel({
  desarrollos,
  adminDesarrollos,
  scopeLabel,
  isGerenteComercial = false,
  isSuperAdmin = false,
  currentUserId,
  initialTab = "comercial",
}: EquipoAdminPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<EquipoTab>(isSuperAdmin ? initialTab : "comercial");
  const [adminUsuarios, setAdminUsuarios] = useState<AdminUserRecord[]>([]);
  const [asesorDirectory, setAsesorDirectory] = useState<AsesorRecord[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const setTabAndUrl = useCallback(
    (next: EquipoTab) => {
      setTab(next);
      const url = next === "admin" ? "/admin/asesores?tab=admin" : "/admin/asesores";
      router.replace(url, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    let cancelled = false;
    setLinksLoading(true);

    void (async () => {
      try {
        const [usuariosRes, asesoresRes] = await Promise.all([
          fetch("/api/admin/usuarios"),
          fetch("/api/admin/asesores?includeInactive=1"),
        ]);

        const usuariosData = (await usuariosRes.json()) as {
          usuarios?: AdminUserRecord[];
        };
        const asesoresData = (await asesoresRes.json()) as { asesores?: AsesorRecord[] };

        if (cancelled) return;

        if (usuariosRes.ok) {
          setAdminUsuarios(usuariosData.usuarios ?? []);
        }
        if (asesoresRes.ok) {
          setAsesorDirectory(asesoresData.asesores ?? []);
        }
      } finally {
        if (!cancelled) {
          setLinksLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const adminLinkByAsesorId = useMemo(() => {
    const map: AdminLinkByAsesor = {};
    for (const user of adminUsuarios) {
      if (!user.asesorId) continue;
      map[user.asesorId] = { activo: user.activo, rol: user.rol, email: user.email };
    }
    return map;
  }, [adminUsuarios]);

  const asesorNamesById = useMemo(
    () => Object.fromEntries(asesorDirectory.map((a) => [a.id, a.nombre])),
    [asesorDirectory],
  );

  const reloadAdminLinks = useCallback(async () => {
    if (!isSuperAdmin) return;
    const response = await fetch("/api/admin/usuarios");
    const data = (await response.json()) as { usuarios?: AdminUserRecord[] };
    if (response.ok) {
      setAdminUsuarios(data.usuarios ?? []);
    }
  }, [isSuperAdmin]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">
          Gestión de accesos
        </p>
        <h2 className="mt-2 text-2xl font-black text-gabi-forest">Equipo</h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-gabi-forest/5 px-3 py-1 text-xs font-semibold text-gabi-forest">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Administra quién vende en piso de ventas y quién configura GABI en el backoffice. Son dos
          accesos distintos que pueden pertenecer a la misma persona.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gabi-forest/10 bg-gabi-cream/40 p-4">
            <div className="flex items-center gap-2 text-gabi-forest">
              <KeyRound className="h-4 w-4" />
              <span className="text-sm font-bold">Portal comercial</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              PIN de 4 dígitos · recorrido, cotizador, mis leads ·{" "}
              <strong>/portal/…</strong>
            </p>
          </div>
          <div className="rounded-xl border border-gabi-forest/10 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-gabi-forest">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-bold">Panel admin</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Email + contraseña · sembrado, leads, reportes · <strong>/admin/login</strong>
            </p>
          </div>
        </div>

        {isSuperAdmin ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setTabAndUrl("comercial")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                tab === "comercial"
                  ? "bg-gabi-forest text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Users className="h-4 w-4" />
              Portal comercial (PIN)
            </button>
            <button
              type="button"
              onClick={() => setTabAndUrl("admin")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                tab === "admin"
                  ? "bg-gabi-forest text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Shield className="h-4 w-4" />
              Acceso admin (email)
            </button>
            {linksLoading ? (
              <span className="inline-flex items-center gap-1 self-center text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sincronizando vínculos…
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {tab === "comercial" || !isSuperAdmin ? (
        <AsesoresAdminPanel
          desarrollos={desarrollos}
          scopeLabel={scopeLabel}
          isGerenteComercial={isGerenteComercial}
          isSuperAdmin={isSuperAdmin}
          embedded
          adminLinkByAsesorId={adminLinkByAsesorId}
          onAdminLinksChange={() => void reloadAdminLinks()}
        />
      ) : (
        <UsuariosAdminPanel
          desarrollos={adminDesarrollos}
          currentUserId={currentUserId}
          embedded
          asesorNamesById={asesorNamesById}
          onUsuariosChange={() => void reloadAdminLinks()}
        />
      )}

      {isSuperAdmin && tab === "comercial" && adminUsuarios.length > 0 ? (
        <p className="text-xs text-slate-400">
          {adminUsuarios.filter((u) => u.asesorId).length} accesos admin vinculados a asesores ·{" "}
          {adminUsuarios.filter((u) => !u.asesorId).length} sin vínculo comercial (ej. operaciones).
          Cambia a la pestaña <strong>Acceso admin</strong> para invitar usuarios de backoffice.
        </p>
      ) : null}
    </div>
  );
}
