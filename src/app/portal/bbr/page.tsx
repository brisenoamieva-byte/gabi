"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { LockKeyhole, LogOut } from "lucide-react";
import Image from "next/image";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { useRouter } from "next/navigation";

const PORTAL_KEY = "gabi_portal";
const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export default function BbrAdvisorLoginPage() {
  const router = useRouter();
  const controls = useAnimationControls();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const portal = localStorage.getItem(PORTAL_KEY);
      if (!portal) {
        router.replace("/portal");
        return;
      }

      const parsed = JSON.parse(portal) as { slug?: string };
      if (parsed.slug !== "bbr") {
        router.replace("/portal");
        return;
      }

      setReady(true);
    } catch {
      localStorage.removeItem(PORTAL_KEY);
      router.replace("/portal");
    }
  }, [router]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        setError("");
        setPin((current) =>
          current.length < 4 ? `${current}${event.key}` : current,
        );
      }

      if (event.key === "Backspace") {
        setError("");
        setPin((current) => current.slice(0, -1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ready]);

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
          body: JSON.stringify({ pin, portal: "bbr" }),
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
          router.replace("/desarrollos");
          return;
        }
      } catch {
        // Sin fallback en producción: solo API
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
  }, [controls, pin, router]);

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

  const handlePortalLogout = () => {
    localStorage.removeItem(PORTAL_KEY);
    localStorage.removeItem("gabi_user");
    localStorage.removeItem("gabi_desarrollo");
    router.replace("/portal");
  };

  if (!ready) {
    return (
      <main className="grid h-dvh place-items-center bg-[#F2F0E9] text-[#201044]">
        <p className="font-semibold">Cargando portal BBR...</p>
      </main>
    );
  }

  return (
    <main className="grid h-dvh max-h-dvh grid-rows-[auto_1fr_auto] overflow-hidden bbr-surface text-bbr-purple">
      <header className="flex shrink-0 flex-col items-center justify-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <Image
          src="/logos/bbr-habitarea.png"
          alt="BBR Habitarea"
          width={420}
          height={260}
          priority
          className="h-[clamp(2.5rem,8vh,3.5rem)] w-auto max-w-[min(280px,80vw)] object-contain mix-blend-multiply"
        />
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#201044]/55">
          Portal comercial BBR
        </p>
        <button
          type="button"
          onClick={handlePortalLogout}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 transition hover:text-[#201044]"
        >
          <LogOut className="h-3 w-3" />
          Salir del portal
        </button>
      </header>

      <section className="flex min-h-0 items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[340px] rounded-[1.75rem] border border-[#201044]/10 bg-white p-5 shadow-xl shadow-[#201044]/10 sm:p-6"
        >
          <div className="text-center">
            <h1 className="text-xl font-black text-[#201044]">
              Acceso de asesores
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Ingresa tu PIN de 4 dígitos
            </p>
          </div>

          <motion.div animate={controls} className="my-4">
            <div className="flex items-center justify-center gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
                    index < pin.length
                      ? "border-[#6cc24a] bg-[#6cc24a] shadow-md shadow-[#6cc24a]/30"
                      : "border-slate-300 bg-slate-100"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 h-5 text-center">
              {error ? (
                <p className="text-sm font-semibold text-[#ef4444]">{error}</p>
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
                className="flex h-[clamp(2.75rem,10.5vh,3.5rem)] items-center justify-center rounded-xl bg-[#201044] text-lg font-bold text-white shadow-md transition active:scale-[0.97] hover:bg-[#35156d]"
              >
                {digit}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleDigit("0")}
              className="flex h-[clamp(2.75rem,10.5vh,3.5rem)] items-center justify-center rounded-xl bg-[#201044] text-lg font-bold text-white shadow-md transition active:scale-[0.97] hover:bg-[#35156d]"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-[clamp(2.75rem,10.5vh,3.5rem)] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-[#201044] transition active:scale-[0.97] hover:bg-slate-100"
            >
              Borrar
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="flex shrink-0 flex-col items-center justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-400">
          Plataforma
        </p>
        <GabiLogo variant="footer" />
      </footer>
    </main>
  );
}
