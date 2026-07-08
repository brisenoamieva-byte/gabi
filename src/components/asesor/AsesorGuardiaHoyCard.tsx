"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, LogIn, LogOut, MapPin } from "lucide-react";
import type { AsesorGuardiaHoy } from "@/lib/asesores/guardias-service";
import { guardiaMarcajeTipoLabel } from "@/lib/comercial/guardia-marcaje-types";

type AsesorGuardiaHoyCardProps = {
  asesorId: string;
  desarrolloId: string;
};

function formatHora(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

function readGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu dispositivo no soporta geolocalización."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Activa la ubicación en tu celular para registrar entrada o salida.";
  }
  if (error.code === error.TIMEOUT) {
    return "No se pudo obtener la ubicación a tiempo. Intenta de nuevo al aire libre.";
  }
  return "No se pudo obtener tu ubicación. Verifica GPS y permisos.";
}

export function AsesorGuardiaHoyCard({ asesorId, desarrolloId }: AsesorGuardiaHoyCardProps) {
  const [guardias, setGuardias] = useState<AsesorGuardiaHoy[]>([]);
  const [marcajesEnabled, setMarcajesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingTurno, setSubmittingTurno] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ asesorId, desarrolloId });
      const response = await fetch(`/api/asesores/guardias?${params}`);
      const data = (await response.json()) as {
        guardias?: AsesorGuardiaHoy[];
        marcajesEnabled?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la guardia.");
      }
      setMarcajesEnabled(Boolean(data.marcajesEnabled));
      setGuardias(data.guardias ?? []);
    } catch (e) {
      setMarcajesEnabled(false);
      setGuardias([]);
      setError(e instanceof Error ? e.message : "Error al cargar guardia.");
    } finally {
      setLoading(false);
    }
  }, [asesorId, desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarcaje = async (guardia: AsesorGuardiaHoy) => {
    if (!guardia.pendiente) {
      return;
    }

    setSubmittingTurno(guardia.turno);
    setError("");
    setSuccess("");

    try {
      const position = await readGeolocation();
      const response = await fetch("/api/asesores/guardias/marcaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asesorId,
          desarrolloId,
          turno: guardia.turno,
          tipo: guardia.pendiente,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMetros: position.coords.accuracy,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar el marcaje.");
      }

      setSuccess(
        `${guardiaMarcajeTipoLabel[guardia.pendiente]} registrada · ${formatHora(new Date().toISOString())}`,
      );
      await load();
    } catch (e) {
      if (e instanceof GeolocationPositionError) {
        setError(geolocationErrorMessage(e));
      } else {
        setError(e instanceof Error ? e.message : "Error al registrar marcaje.");
      }
    } finally {
      setSubmittingTurno(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Guardia de hoy…
      </div>
    );
  }

  if (!marcajesEnabled) {
    return null;
  }

  if (!guardias.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {guardias.map((guardia) => {
        const isSubmitting = submittingTurno === guardia.turno;
        const pendiente = guardia.pendiente;
        const Icon = pendiente === "salida" ? LogOut : LogIn;

        return (
          <div
            key={guardia.asignacionId}
            className="rounded-2xl border border-[#201044]/12 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Tu guardia hoy
                  </p>
                  <p className="text-lg font-black text-[#201044]">{guardia.turnoLabel}</p>
                  <p className="text-sm text-slate-600">{guardia.horario}</p>
                  {guardia.notas ? (
                    <p className="mt-0.5 text-xs text-slate-500">{guardia.notas}</p>
                  ) : null}
                </div>

                <div className="grid gap-1 text-xs text-slate-600">
                  <p>
                    Entrada:{" "}
                    {guardia.marcajes.entrada
                      ? `${formatHora(guardia.marcajes.entrada.registradoAt)} · ${Math.round(guardia.marcajes.entrada.distanciaMetros)} m`
                      : "Pendiente"}
                  </p>
                  <p>
                    Salida:{" "}
                    {guardia.marcajes.salida
                      ? `${formatHora(guardia.marcajes.salida.registradoAt)} · ${Math.round(guardia.marcajes.salida.distanciaMetros)} m`
                      : "Pendiente"}
                  </p>
                </div>

                <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {guardia.caseta.etiqueta ?? "Caseta de ventas"} · debes estar a{" "}
                  {guardia.caseta.radioMetros} m o menos
                </p>

                {pendiente ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleMarcaje(guardia)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    Registrar {guardiaMarcajeTipoLabel[pendiente].toLowerCase()}
                  </button>
                ) : (
                  <p className="text-xs font-semibold text-emerald-700">
                    Turno completo · entrada y salida registradas
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-emerald-700">{success}</p> : null}
    </div>
  );
}
