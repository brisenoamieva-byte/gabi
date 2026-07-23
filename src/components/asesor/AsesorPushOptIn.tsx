"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });

const isLocalDevHost = (): boolean => {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
};

/** Asegura registro de /sw.js (next-pwa a veces no lo registra solo en App Router). */
const ensureServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  let registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) {
    registration = await withTimeout(
      navigator.serviceWorker.register("/sw.js", { scope: "/" }),
      10000,
    );
  }
  await withTimeout(navigator.serviceWorker.ready, 8000);
  return registration;
};

type PushOptInState =
  | "loading"
  | "unsupported"
  | "no_sw"
  | "denied"
  | "subscribed"
  | "ready"
  | "error";

type AsesorPushOptInProps = {
  className?: string;
  compact?: boolean;
};

export function AsesorPushOptIn({ className = "", compact = false }: AsesorPushOptInProps) {
  const [state, setState] = useState<PushOptInState>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      setMessage(
        "Este navegador no soporta avisos push. En iPhone: Instalar Gabi en Inicio y abrir desde ahí. En Android: Chrome.",
      );
      return;
    }

    if (isLocalDevHost()) {
      setState("no_sw");
      setMessage(
        "En local/dev los avisos no se activan. Abre https://www.gabi.mx, entra con tu PIN e instala la app.",
      );
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      setMessage(null);
      return;
    }

    try {
      const registration = await ensureServiceWorker();
      const existing = await registration.pushManager.getSubscription();
      setState(existing ? "subscribed" : "ready");
      setMessage(null);
    } catch {
      setState("no_sw");
      setMessage(
        "No se pudo activar la app en este dispositivo. Abre https://www.gabi.mx en Chrome (Android) o instálala en Inicio (iPhone) y vuelve a intentar.",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubscribe = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (state === "unsupported") {
        setMessage(
          "Este navegador no soporta avisos. Usa Chrome en Android o Gabi instalada en iPhone.",
        );
        return;
      }

      if (isLocalDevHost()) {
        setMessage("Abre https://www.gabi.mx (producción) para activar recordatorios.");
        return;
      }

      const vapidRes = await fetch("/api/asesores/push/vapid-public-key");
      const vapidData = (await vapidRes.json()) as {
        publicKey?: string;
        error?: string;
        configured?: boolean;
      };
      if (!vapidRes.ok || !vapidData.publicKey) {
        setMessage(vapidData.error ?? "Push no configurado aún en el servidor (faltan vars VAPID).");
        setState("error");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "ready");
        setMessage("Necesitas permitir notificaciones en el celular.");
        return;
      }

      const registration = await ensureServiceWorker();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) {
        setMessage("El navegador no devolvió una suscripción válida.");
        setState("error");
        return;
      }

      const saveRes = await fetch("/api/asesores/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          keys: { p256dh, auth },
          userAgent: navigator.userAgent,
        }),
      });
      const saveData = (await saveRes.json()) as { error?: string };
      if (!saveRes.ok) {
        setMessage(saveData.error ?? "No se pudo guardar la suscripción.");
        setState("error");
        return;
      }

      setState("subscribed");
      setMessage(
        isStandalone()
          ? "Listo. Te avisaremos de pendientes en este celular."
          : "Listo. Para mejor resultado: instala Gabi en inicio (sobre todo en iPhone).",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo activar.");
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await withTimeout(navigator.serviceWorker.ready, 4000);
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/asesores/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      if ("clearAppBadge" in navigator) {
        try {
          await (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
        } catch {
          // ignore
        }
      }
      setState("ready");
      setMessage("Recordatorios desactivados en este dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desactivar.");
    } finally {
      setBusy(false);
    }
  };

  if (compact && state === "subscribed") {
    return null;
  }

  const description =
    state === "loading"
      ? "Comprobando si este dispositivo puede recibir avisos…"
      : state === "unsupported"
        ? "Este navegador no soporta avisos push."
        : state === "no_sw"
          ? "Aún no está lista la app instalada en este dispositivo."
          : state === "denied"
            ? "Las notificaciones están bloqueadas. Actívalas en Ajustes del sistema."
            : state === "subscribed"
              ? "Avisos de pasos vencidos y pendientes del CRM."
              : "Activa avisos visuales cuando tengas leads por atender.";

  const canActivate = state === "ready" || state === "error";
  const showHelpOnly = state === "unsupported" || state === "no_sw" || state === "loading";

  return (
    <div
      className={`rounded-2xl border border-[#13315C]/15 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#13315C]/10 text-[#13315C]">
          {state === "subscribed" ? (
            <Bell className="h-4 w-4" strokeWidth={2} />
          ) : state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <BellOff className="h-4 w-4" strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#13315C]">Recordatorios en el celular</p>
          <p className="mt-0.5 text-sm text-slate-600">{description}</p>
          {message ? <p className="mt-1.5 text-xs text-slate-500">{message}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {state === "subscribed" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleUnsubscribe()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Desactivar
              </button>
            ) : null}
            {canActivate || showHelpOnly ? (
              <button
                type="button"
                disabled={busy || state === "loading" || state === "unsupported"}
                onClick={() => void handleSubscribe()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#13315C] px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1A4478] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                Activar recordatorios
              </button>
            ) : null}
            {state === "denied" ? null : null}
            {state === "no_sw" ? (
              <a
                href="https://www.gabi.mx/dashboard"
                className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#13315C] transition hover:bg-slate-50"
              >
                Abrir gabi.mx
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Actualiza el badge del ícono PWA según pendientes. */
export async function syncAsesorAppBadge(count: number): Promise<void> {
  if (typeof navigator === "undefined") {
    return;
  }
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0 && typeof nav.setAppBadge === "function") {
      await nav.setAppBadge(count);
      return;
    }
    if (typeof nav.clearAppBadge === "function") {
      await nav.clearAppBadge();
    }
  } catch {
    // Badge API no disponible en todos los navegadores
  }
}
