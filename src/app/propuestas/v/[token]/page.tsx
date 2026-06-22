"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PropuestaShareGate } from "@/components/propuestas/PropuestaShareGate";
import { PropuestaComercialSlides } from "@/components/propuestas/PropuestaComercialSlides";
import { useResolvedPropuesta } from "@/lib/propuestas/use-resolved-propuesta";
import type { ConsultoriaMarcaPresentacion } from "@/lib/brand/consultoria-marca";
import { DEFAULT_CONSULTORIA_MARCA } from "@/lib/brand/consultoria-marca";

type SessionState =
  | { status: "loading" }
  | { status: "gate"; tituloCliente: string | null; propuestaSlug: string; presentacionMarca?: ConsultoriaMarcaPresentacion }
  | { status: "ready"; propuestaSlug: string; presentacionMarca?: ConsultoriaMarcaPresentacion }
  | { status: "invalid"; message: string };

export default function PropuestaShareViewPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const propuestaSlug = session.status === "ready" ? session.propuestaSlug : "";
  const propuestaQuery = useResolvedPropuesta(propuestaSlug);

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
        presentacionMarca?: ConsultoriaMarcaPresentacion;
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
        setSession({
          status: "ready",
          propuestaSlug: data.propuestaSlug,
          presentacionMarca: data.presentacionMarca ?? DEFAULT_CONSULTORIA_MARCA,
        });
        return;
      }

      setSession({
        status: "gate",
        tituloCliente: data.tituloCliente ?? null,
        propuestaSlug: data.propuestaSlug ?? "",
        presentacionMarca: data.presentacionMarca ?? DEFAULT_CONSULTORIA_MARCA,
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
        presentacionMarca={session.presentacionMarca ?? DEFAULT_CONSULTORIA_MARCA}
        onAuthenticated={(result) => {
          if (result.propuestaSlug) {
            setSession({
              status: "ready",
              propuestaSlug: result.propuestaSlug,
              presentacionMarca: session.presentacionMarca ?? DEFAULT_CONSULTORIA_MARCA,
            });
            return;
          }
          void checkSession();
        }}
      />
    );
  }

  if (propuestaQuery.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-slate-500">Cargando propuesta…</p>
      </main>
    );
  }

  if (propuestaQuery.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 text-center">
        <p className="text-sm text-slate-500">{propuestaQuery.message}</p>
      </main>
    );
  }

  return (
    <PropuestaComercialSlides
      data={propuestaQuery.data.propuesta}
      media={propuestaQuery.data.media}
      presentacionMarca={
        propuestaQuery.data.presentacionMarca ??
        (session.status === "ready" ? session.presentacionMarca : undefined) ??
        DEFAULT_CONSULTORIA_MARCA
      }
      viewerMode="developer"
    />
  );
}
