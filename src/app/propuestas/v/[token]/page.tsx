"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PropuestaShareGate } from "@/components/propuestas/PropuestaShareGate";
import { NuboPropuestaSlides } from "@/components/propuestas/NuboPropuestaSlides";
import { getPropuestaBySlug } from "@/lib/propuestas/registry";

type SessionState =
  | { status: "loading" }
  | { status: "gate"; tituloCliente: string | null; propuestaSlug: string }
  | { status: "ready"; propuestaSlug: string }
  | { status: "invalid"; message: string };

export default function PropuestaShareViewPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const checkSession = useCallback(async () => {
    if (!token) {
      setSession({ status: "invalid", message: "Enlace no válido." });
      return;
    }

    try {
      const response = await fetch(`/api/propuestas/share/session?token=${encodeURIComponent(token)}`);
      const data = (await response.json()) as {
        authenticated?: boolean;
        propuestaSlug?: string;
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

      if (data.authenticated && data.propuestaSlug) {
        setSession({ status: "ready", propuestaSlug: data.propuestaSlug });
        return;
      }

      setSession({
        status: "gate",
        tituloCliente: data.tituloCliente ?? null,
        propuestaSlug: data.propuestaSlug ?? "",
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
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-slate-500">Verificando acceso…</p>
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
        onAuthenticated={(result) => {
          if (result.propuestaSlug) {
            setSession({ status: "ready", propuestaSlug: result.propuestaSlug });
            return;
          }
          void checkSession();
        }}
      />
    );
  }

  const propuesta = getPropuestaBySlug(session.propuestaSlug);
  if (!propuesta) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-slate-500">Propuesta no disponible.</p>
      </main>
    );
  }

  return <NuboPropuestaSlides data={propuesta} viewerMode="developer" />;
}
