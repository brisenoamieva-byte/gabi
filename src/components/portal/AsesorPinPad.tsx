"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { LockKeyhole, LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GabiLogo } from "@/components/brand/GabiLogo";
import type { PortalSession } from "@/lib/portal/session";

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

type AsesorPinPadProps = {
  portal: PortalSession;
  portalSlug: string;
  successPath?: string;
  subtitle?: string;
  onPortalLogout?: () => void;
};

export function AsesorPinPad({
  portal,
  portalSlug,
  successPath = "/desarrollos",
  subtitle = "Ingresa tu PIN de 4 dígitos",
  onPortalLogout,
}: AsesorPinPadProps) {
  const router = useRouter();
  const controls = useAnimationControls();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        setError("");
        setPin((current) => (current.length < 4 ? `${current}${event.key}` : current));
      }

      if (event.key === "Backspace") {
        setError("");
        setPin((current) => current.slice(0, -1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (pin.length !== 4) {
      return;
    }

    let cancelled = false;
    let timeout: number | undefined;

    const authenticate = async () => {
      try {
        const response = await fetch("/api/asesores/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, portal: portalSlug }),
        });
        const data = (await response.json()) as {
          asesor?: {
            id: string;
            nombre: string;
            email: string;
            rol: string;
            desarrollosIds: string[];
          };
          error?: string;
        };

        if (!cancelled && response.status === 429) {
          setError(data.error ?? "Demasiados intentos. Espera un momento.");
          controls.start({
            x: [0, -14, 14, -10, 10, 0],
            transition: { duration: 0.38 },
          });
          timeout = window.setTimeout(() => setPin(""), 450);
          return;
        }

        if (!cancelled && response.ok && data.asesor) {
          localStorage.setItem("gabi_user", JSON.stringify(data.asesor));
          localStorage.removeItem("gabi_desarrollo");
          router.replace(successPath);
          return;
        }
      } catch {
        // Sin fallback en producción
      }

      if (cancelled) {
        return;
      }

      setError("PIN incorrecto");
      controls.start({
        x: [0, -14, 14, -10, 10, 0],
        transition: { duration: 0.38 },
      });
      timeout = window.setTimeout(() => setPin(""), 450);
    };

    void authenticate();

    return () => {
      cancelled = true;
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [controls, pin, portalSlug, router, successPath]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) {
      return;
    }
    setError("");
    setPin((current) => `${current}${digit}`);
  };

  const handleDelete = () => {
    setError("");
    setPin((current) => current.slice(0, -1));
  };

  const surfaceStyle = {
    backgroundColor: "#F8FAFC",
    color: portal.colorPrimary,
    ["--portal-primary" as string]: portal.colorPrimary,
    ["--portal-accent" as string]: portal.colorAccent,
  };

  return (
    <main
      className="grid h-dvh max-h-dvh grid-rows-[auto_1fr_auto] overflow-hidden"
      style={surfaceStyle}
    >
      <header className="flex shrink-0 flex-col items-center justify-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        {portal.logo ? (
          <Image
            src={portal.logo}
            alt={portal.nombre}
            width={420}
            height={260}
            priority
            className="h-[clamp(2.5rem,8vh,3.5rem)] w-auto max-w-[min(280px,80vw)] object-contain"
          />
        ) : (
          <p className="text-lg font-bold">{portal.nombre}</p>
        )}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Simulador de cotización
        </p>
        {onPortalLogout ? (
          <button
            type="button"
            onClick={onPortalLogout}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 transition hover:opacity-80"
          >
            <LogOut className="h-3 w-3" />
            Salir
          </button>
        ) : null}
      </header>

      <section className="flex min-h-0 items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[340px] rounded-2xl border border-black/8 bg-white p-5 shadow-lg sm:p-6"
        >
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: portal.colorPrimary }}>
              Acceso de pruebas
            </h1>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>

          <motion.div animate={controls} className="my-4">
            <div className="flex items-center justify-center gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-3.5 w-3.5 rounded-full border-2 transition-all"
                  style={{
                    borderColor: index < pin.length ? portal.colorAccent : "#cbd5e1",
                    backgroundColor: index < pin.length ? portal.colorAccent : "#f1f5f9",
                  }}
                />
              ))}
            </div>
            <div className="mt-2 h-5 text-center">
              {error ? (
                <p className="text-sm font-semibold text-red-500">{error}</p>
              ) : (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <LockKeyhole className="h-3 w-3" />
                  Sesión local segura
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
                className="flex h-[clamp(2.75rem,10.5vh,3.5rem)] items-center justify-center rounded-xl text-lg font-bold text-white shadow-md transition active:scale-[0.97]"
                style={{ backgroundColor: portal.colorPrimary }}
              >
                {digit}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleDigit("0")}
              className="flex h-[clamp(2.75rem,10.5vh,3.5rem)] items-center justify-center rounded-xl text-lg font-bold text-white shadow-md transition active:scale-[0.97]"
              style={{ backgroundColor: portal.colorPrimary }}
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-[clamp(2.75rem,10.5vh,3.5rem)] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold transition active:scale-[0.97]"
              style={{ color: portal.colorPrimary }}
            >
              Borrar
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="flex shrink-0 flex-col items-center justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Plataforma
        </p>
        <GabiLogo variant="footer" />
      </footer>
    </main>
  );
}
