"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NuboPreventaAnalisisSlides } from "@/components/estudios/nubo/NuboPreventaAnalisisSlides";
import { PropuestaShareGate } from "@/components/propuestas/PropuestaShareGate";
import { NUBO_ESTUDIO_SHARE_SLUG } from "@/lib/estudios/share-registry";

type SessionState =
  | { status: "loading" }
  | { status: "gate"; tituloCliente: string | null; estudioSlug: string }
  | { status: "ready"; estudioSlug: string }
  | { status: "invalid"; message: string };

export default function EstudioShareViewPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const checkSession = useCallback(async () => {
    if (!token) {
      setSession({ status: "invalid", message: "Enlace no válido." });
      return;
    }

    try {
      const response = await fetch(`/api/estudios/share/session?token=${encodeURIComponent(token)}`);
      const data = (await response.json()) as {
        authenticated?: boolean;
        estudioSlug?: string;
        tituloCliente?: string | null;
        error?: string;
      };

      if (!response.ok) {
        setSession({
          status: "invalid",
          message: data.error ?? "Este enlace no está disponible.",
        });
        return;
      }

      if (data.authenticated && data.estudioSlug) {
        setSession({ status: "ready", estudioSlug: data.estudioSlug });
        return;
      }

      setSession({
        status: "gate",
        tituloCliente: data.tituloCliente ?? null,
        estudioSlug: data.estudioSlug ?? "",
      });
    } catch {
      setSession({ status: "invalid", message: "No se pudo verificar el acceso." });
    }
  }, [token]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (session.status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#F8FAFC] to-white px-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          BBR Habitarea
        </p>
        <p className="text-sm font-semibold text-slate-700">Verificando acceso…</p>
      </main>
    );
  }

  if (session.status === "invalid") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-6 text-center">
        <p className="text-sm text-slate-600">{session.message}</p>
        <p className="text-xs text-slate-400">
          Solicita un nuevo enlace y código a tu contacto en BBR Habitarea.
        </p>
      </main>
    );
  }

  if (session.status === "gate") {
    return (
      <PropuestaShareGate
        token={token}
        tituloCliente={session.tituloCliente}
        onAuthenticated={() => void checkSession()}
        authPath="/api/estudios/share/auth"
        subjectLabel="Estudio de mercado · Confidencial"
        headline="NUBO · Condiciones para preventa"
      />
    );
  }

  if (session.estudioSlug !== NUBO_ESTUDIO_SHARE_SLUG) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-slate-500">Estudio no disponible.</p>
      </main>
    );
  }

  return (
    <main className="propuesta-deck-viewport flex h-[100svh] flex-col overflow-hidden bg-[#F8FAFC]">
      <NuboPreventaAnalisisSlides viewerMode="developer" />
    </main>
  );
}
