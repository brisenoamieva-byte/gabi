"use client";

import { useEffect } from "react";

/**
 * next-pwa genera /sw.js en build, pero con App Router a menudo no inyecta el register.
 * Registramos explícitamente en producción para push + offline.
 */
export function RegisterPwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("[pwa] No se pudo registrar el service worker", error);
    });
  }, []);

  return null;
}
