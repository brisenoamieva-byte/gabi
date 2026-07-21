"use client";

import { useState } from "react";
import { Loader2, MapPinned } from "lucide-react";
import {
  refreshStoredAsesorSession,
  syncAsesorFromAdminAuth,
} from "@/lib/asesores/session-client";
import { isGabiOperator } from "@/lib/gabi/operator";
import {
  canAccessCampoCrmFromAdmin,
  resolvePreferredCampoDesarrolloId,
} from "@/lib/admin/campo-crm-access";
import type { AdminProfile } from "@/lib/admin/types";
import { prepareCampoCrmEntry } from "@/lib/session/campo-crm-entry";

type AdminCampoCrmLinkProps = {
  profile: AdminProfile;
  desarrolloId?: string | null;
  variant?: "header" | "nav";
};

export function AdminCampoCrmLink({
  profile,
  desarrolloId,
  variant = "header",
}: AdminCampoCrmLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!canAccessCampoCrmFromAdmin(profile)) {
    return null;
  }

  const preferredDesarrolloId = resolvePreferredCampoDesarrolloId(profile, desarrolloId);

  const openCampoCrm = async () => {
    setLoading(true);
    setError("");

    try {
      let asesor = (await syncAsesorFromAdminAuth({ allowAfterLogout: true }))?.asesor ?? null;

      if (!asesor) {
        asesor = await refreshStoredAsesorSession();
      }

      if (!asesor) {
        setError(
          isGabiOperator({ email: profile.email })
            ? "No se pudo activar el CRM de campo. Recarga la página e intenta de nuevo."
            : "No encontramos tu perfil comercial. Verifica en Equipo que tu correo admin coincida con un gerente o director activo.",
        );
        return;
      }

      const path = prepareCampoCrmEntry(asesor, preferredDesarrolloId);
      window.location.assign(path);
    } catch {
      setError("No se pudo abrir el CRM de campo.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "nav") {
    return (
      <div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void openCampoCrm()}
          className="flex w-full items-center gap-3 rounded-xl border border-[#6CC24A]/30 bg-[#6CC24A]/10 px-3 py-3 text-sm font-semibold text-gabi-forest transition hover:bg-[#6CC24A]/15 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <MapPinned className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1 text-left">CRM de campo</span>
        </button>
        {error ? (
          <p className="mt-1 px-1 text-[11px] font-medium text-red-600">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={() => void openCampoCrm()}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#6CC24A]/35 bg-[#6CC24A]/10 px-3 text-sm font-semibold text-gabi-forest transition hover:bg-[#6CC24A]/15 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <MapPinned className="h-4 w-4 shrink-0" />
        )}
        CRM de campo
      </button>
      {error ? (
        <p className="absolute right-0 top-full z-10 mt-1 max-w-[16rem] rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 shadow-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
