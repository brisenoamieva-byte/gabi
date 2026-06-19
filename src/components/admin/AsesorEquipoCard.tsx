"use client";

import Link from "next/link";
import {
  Building2,
  Eye,
  KeyRound,
  Loader2,
  Shield,
} from "lucide-react";
import type { AsesorKpi } from "@/lib/admin/asesores-kpi-service";
import { adminRolLabel } from "@/lib/admin/permissions";
import type { AdminRol } from "@/lib/admin/types";
import {
  asesorRolLabel,
  isLeadershipAsesorRol,
  type AsesorRecord,
  type AsesorRol,
} from "@/lib/asesores/types";

const avatarInitials = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const shortId = (id: string) => (id.length > 12 ? id.slice(0, 8) : id);

type AsesorEquipoCardProps = {
  asesor: AsesorRecord;
  kpi: AsesorKpi;
  desarrolloLabels: string;
  adminLink?: { activo: boolean; rol: AdminRol; email: string };
  leadsHref?: string;
  saving: boolean;
  savingId: string | null;
  onToggleActive: (asesor: AsesorRecord) => void;
  onOpenDetails: (asesor: AsesorRecord) => void;
  onResetPin: (asesor: AsesorRecord) => void;
  onSyncAdmin: (asesor: AsesorRecord) => void;
};

export function AsesorEquipoCard({
  asesor,
  kpi,
  desarrolloLabels,
  adminLink,
  leadsHref,
  saving,
  savingId,
  onToggleActive,
  onOpenDetails,
  onResetPin,
  onSyncAdmin,
}: AsesorEquipoCardProps) {
  const busy = saving || savingId === asesor.id;

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        asesor.activo ? "border-slate-200" : "border-slate-200/80 opacity-75"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-gabi-forest/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gabi-forest">
          {asesorRolLabel[asesor.rol]}
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-slate-400" title={asesor.id}>
          id: {shortId(asesor.id)}
        </span>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gabi-forest to-[#2d6a5a] text-lg font-black text-white shadow-inner"
          aria-hidden
        >
          {avatarInitials(asesor.nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-gabi-forest">{asesor.nombre}</p>
          <p className="truncate text-sm text-slate-600">{asesor.email}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400" title={desarrolloLabels}>
            {desarrolloLabels}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={asesor.activo}
          aria-label={asesor.activo ? "Desactivar asesor" : "Activar asesor"}
          disabled={busy}
          onClick={() => onToggleActive(asesor)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${
            asesor.activo ? "bg-gabi-forest" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              asesor.activo ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center">
        {leadsHref && kpi.leads > 0 ? (
          <Link
            href={leadsHref}
            className="rounded-lg py-1 transition hover:bg-white"
            title="Ver leads"
          >
            <p className="text-[10px] font-bold uppercase text-slate-400">Leads</p>
            <p className="text-lg font-black text-gabi-forest">{kpi.leads}</p>
          </Link>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Leads</p>
            <p className="text-lg font-black text-slate-400">{kpi.leads}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">Cotiz.</p>
          <p className="text-lg font-black text-gabi-forest">{kpi.cotizaciones}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">Apart.</p>
          <p className="text-lg font-black text-gabi-forest">{kpi.apartados}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">Conv.</p>
          <p className="text-lg font-black text-gabi-forest">
            {kpi.conversionPct === null ? "—" : `${kpi.conversionPct}%`}
          </p>
        </div>
      </div>

      {adminLink ? (
        <p className="mt-3 text-[10px] font-semibold text-emerald-700">
          Admin: {adminLink.activo ? adminRolLabel[adminLink.rol] : "inactivo"}
        </p>
      ) : isLeadershipAsesorRol(asesor.rol) && asesor.activo ? (
        <p className="mt-3 text-[10px] font-semibold text-amber-700">Admin: sin vincular</p>
      ) : null}

      <div className="mt-4 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onOpenDetails(asesor)}
          disabled={busy}
          className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gabi-forest/15 text-sm font-bold text-gabi-forest hover:bg-gabi-forest/5 disabled:opacity-40"
        >
          <Eye className="h-4 w-4" />
          Detalles
        </button>
        <button
          type="button"
          onClick={() => onOpenDetails(asesor)}
          disabled={busy}
          title="Desarrollos asignados"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 text-gabi-forest hover:bg-slate-50 disabled:opacity-40"
        >
          <Building2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onResetPin(asesor)}
          disabled={busy || !asesor.activo}
          title="Reset PIN"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 text-gabi-forest hover:bg-slate-50 disabled:opacity-40"
        >
          {savingId === asesor.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
        </button>
      </div>

      {isLeadershipAsesorRol(asesor.rol) && asesor.activo ? (
        <button
          type="button"
          onClick={() => onSyncAdmin(asesor)}
          disabled={busy}
          className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 text-xs font-bold text-gabi-forest disabled:opacity-40"
        >
          <Shield className="h-3.5 w-3.5" />
          Acceso admin
        </button>
      ) : null}
    </article>
  );
}

export type EquipoViewMode = "grid" | "list";
export type EquipoStatusFilter = "all" | "active" | "inactive";
export type EquipoRolFilter = "all" | AsesorRol;

export function filterAsesoresEquipo(
  asesores: AsesorRecord[],
  search: string,
  status: EquipoStatusFilter,
  rol: EquipoRolFilter,
) {
  const q = search.trim().toLowerCase();
  return asesores.filter((asesor) => {
    if (status === "active" && !asesor.activo) return false;
    if (status === "inactive" && asesor.activo) return false;
    if (rol !== "all" && asesor.rol !== rol) return false;
    if (!q) return true;
    return (
      asesor.nombre.toLowerCase().includes(q) ||
      asesor.email.toLowerCase().includes(q) ||
      asesor.id.toLowerCase().includes(q)
    );
  });
}
