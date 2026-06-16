"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import { BbrHabitareaLogo } from "@/components/brand/BbrHabitareaLogo";

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export type ShareGateAuthResult = {
  estudioSlug?: string;
  propuestaSlug?: string;
};

type PropuestaShareGateProps = {
  token: string;
  tituloCliente?: string | null;
  onAuthenticated: (result: ShareGateAuthResult) => void;
  authPath?: string;
  subjectLabel?: string;
  headline?: string;
};

export function PropuestaShareGate({
  token,
  tituloCliente,
  onAuthenticated,
  authPath = "/api/propuestas/share/auth",
  subjectLabel = "Propuesta comercial · Confidencial",
  headline = "Acceso privado",
}: PropuestaShareGateProps) {
  const controls = useAnimationControls();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        setError("");
        setCodigo((current) => (current.length < 6 ? `${current}${event.key}` : current));
      }
      if (event.key === "Backspace") {
        setError("");
        setCodigo((current) => current.slice(0, -1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (codigo.length !== 6 || loading) return;

    let cancelled = false;
    const authenticate = async () => {
      setLoading(true);
      try {
        const response = await fetch(authPath, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, codigo }),
        });
        const data = (await response.json()) as {
          error?: string;
          estudioSlug?: string;
          propuestaSlug?: string;
        };

        if (cancelled) return;

        if (response.status === 429) {
          setError(data.error ?? "Demasiados intentos. Espera un momento.");
          controls.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.35 } });
          setCodigo("");
          return;
        }

        if (response.ok) {
          onAuthenticated({
            estudioSlug: data.estudioSlug,
            propuestaSlug: data.propuestaSlug,
          });
          return;
        }

        setError(
          response.status === 401
            ? "Código incorrecto"
            : (data.error ?? "No se pudo verificar el código"),
        );
        controls.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.35 } });
        setCodigo("");
      } catch {
        if (cancelled) return;
        setError("Error de conexión. Intenta de nuevo.");
        setCodigo("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [authPath, codigo, controls, loading, onAuthenticated, token]);

  const handleDigit = (digit: string) => {
    if (codigo.length >= 6 || loading) return;
    setError("");
    setCodigo((current) => `${current}${digit}`);
  };

  const handleDelete = () => {
    if (loading) return;
    setError("");
    setCodigo((current) => current.slice(0, -1));
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-[#F8FAFC] to-white px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8"
      >
        <div className="text-center">
          <BbrHabitareaLogo height={32} className="mx-auto" />
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {subjectLabel}
          </p>
          <h1 className="mt-2 text-xl font-bold text-slate-800">{headline}</h1>
          {tituloCliente ? (
            <p className="mt-2 text-sm text-slate-500">Preparado para {tituloCliente}</p>
          ) : null}
          <p className="mt-4 text-sm text-slate-600">
            Ingresa el código de 6 dígitos que te compartió BBR Habitarea.
          </p>
        </div>

        <motion.div animate={controls} className="my-6">
          <div className="flex items-center justify-center gap-2.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-3 w-3 rounded-full border-2 transition-all"
                style={{
                  borderColor: index < codigo.length ? "#6cc24a" : "#cbd5e1",
                  backgroundColor: index < codigo.length ? "#6cc24a" : "#f8fafc",
                }}
              />
            ))}
          </div>
          <div className="mt-3 h-5 text-center">
            {error ? (
              <p className="text-sm font-semibold text-red-500">{error}</p>
            ) : (
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <LockKeyhole className="h-3 w-3" />
                {loading ? "Verificando…" : "Solo lectura · enlace privado"}
              </p>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-2.5">
          {digits.slice(0, 9).map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={loading}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-800 text-lg font-bold text-white shadow-md transition active:scale-[0.97] disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit("0")}
            disabled={loading}
            className="flex h-12 items-center justify-center rounded-xl bg-slate-800 text-lg font-bold text-white shadow-md transition active:scale-[0.97] disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition active:scale-[0.97] disabled:opacity-50"
          >
            Borrar
          </button>
        </div>
      </motion.div>
    </main>
  );
}
