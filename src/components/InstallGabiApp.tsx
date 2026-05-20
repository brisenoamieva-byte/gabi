"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallGabiAppProps = {
  variant?: "landing" | "dashboard" | "compact";
  className?: string;
};

const isIosDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isStandalone = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(
      "standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone,
    )
  );
};

export function InstallGabiApp({ variant = "landing", className = "" }: InstallGabiAppProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const ios = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setInstalled(isStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    setShowHelp(true);
  };

  if (installed) {
    if (variant === "compact") {
      return null;
    }

    return (
      <div
        className={`rounded-2xl border border-gabi-emerald/25 bg-gabi-emerald/10 px-4 py-3 text-sm font-semibold text-gabi-navy ${className}`.trim()}
      >
        gabi está instalada en este dispositivo.
      </div>
    );
  }

  const buttonClass =
    variant === "dashboard"
      ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#201044]/12 bg-white px-4 text-sm font-bold text-[#201044] transition hover:bg-slate-50"
      : variant === "compact"
        ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gabi-navy px-4 text-sm font-bold text-white"
        : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gabi-navy px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-gabi-navy-light";

  return (
    <div className={className}>
      <button type="button" onClick={() => void handleInstall()} className={buttonClass}>
        <Download className="h-4 w-4" />
        {deferredPrompt ? "Instalar gabi en este dispositivo" : "Agregar gabi a inicio"}
      </button>

      {!deferredPrompt && !ios ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Si no aparece el diálogo automático, usa este botón o el menú del navegador →{" "}
          <span className="font-semibold">Instalar app</span>.
        </p>
      ) : null}

      {ios ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          En iPhone/iPad: Safari → Compartir{" "}
          <Share className="inline h-3.5 w-3.5 align-text-bottom" /> → Agregar a inicio.
        </p>
      ) : null}

      {showHelp ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-gabi-navy/50 p-4 backdrop-blur-sm sm:items-center">
          <div
            role="dialog"
            aria-labelledby="install-gabi-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/logos/gabi-icon-192.png"
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-2xl"
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gabi-teal">
                    Instalar gabi
                  </p>
                  <h3 id="install-gabi-title" className="text-lg font-black text-gabi-navy">
                    Acceso directo en tu celular
                  </h3>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setShowHelp(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="mt-5 space-y-3 text-sm leading-relaxed text-slate-600">
              {ios ? (
                <>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gabi-navy text-xs font-black text-white">
                      1
                    </span>
                    Abre gabi.mx en <strong>Safari</strong> (no en Chrome).
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gabi-navy text-xs font-black text-white">
                      2
                    </span>
                    Toca Compartir → <strong>Agregar a inicio</strong>.
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gabi-navy text-xs font-black text-white">
                      3
                    </span>
                    Confirma. Verás el icono navy con la <strong>g</strong> teal.
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gabi-navy text-xs font-black text-white">
                      1
                    </span>
                    Usa Chrome o Edge en Android.
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gabi-navy text-xs font-black text-white">
                      2
                    </span>
                    Menú ⋮ → <strong>Instalar app</strong> o <strong>Agregar a inicio</strong>.
                  </li>
                  <li className="flex gap-3">
                    <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-gabi-teal" />
                    Luego entra desde el icono para modo offline en showroom.
                  </li>
                </>
              )}
            </ol>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-6 min-h-11 w-full rounded-xl bg-gabi-navy text-sm font-bold text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
