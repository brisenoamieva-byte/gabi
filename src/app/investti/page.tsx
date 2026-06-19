"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AsesorPinPad } from "@/components/portal/AsesorPinPad";
import {
  getInvesttiDesarrolloIdsForAsesor,
  getInvesttiSimuladorPortalSession,
  INVESTTI_SIMULADOR_PORTAL_SLUG,
} from "@/lib/portal/investti-simulador";
import { readStoredAsesorSession } from "@/lib/asesores/session-client";
import { PORTAL_STORAGE_KEY, type PortalSession } from "@/lib/portal/session";
import { logoutAsesorSession } from "@/lib/session/asesor-session-actions";
import { GABI_DESARROLLO_KEY, GABI_USER_KEY } from "@/lib/session/keys";

export default function InvesttiSimuladorEntryPage() {
  const router = useRouter();
  const [portal, setPortal] = useState<PortalSession | null>(null);

  useEffect(() => {
    const session = getInvesttiSimuladorPortalSession();
    localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(session));
    setPortal(session);

    const stored = readStoredAsesorSession();
    if (stored && !getInvesttiDesarrolloIdsForAsesor(stored).length) {
      localStorage.removeItem(GABI_USER_KEY);
      localStorage.removeItem(GABI_DESARROLLO_KEY);
    }
  }, []);

  const handleLogout = () => {
    logoutAsesorSession(router, { clearPortal: true, redirect: "/" });
  };

  if (!portal) {
    return (
      <main className="grid h-dvh place-items-center bg-[#F8FAFC] text-[#13315C]">
        <p className="font-semibold">Cargando simulador…</p>
      </main>
    );
  }

  return (
    <AsesorPinPad
      portal={portal}
      portalSlug={INVESTTI_SIMULADOR_PORTAL_SLUG}
      successPath="/investti/desarrollos"
      subtitle="PIN compartido para gerentes y asesores Investti"
      onPortalLogout={handleLogout}
    />
  );
}
