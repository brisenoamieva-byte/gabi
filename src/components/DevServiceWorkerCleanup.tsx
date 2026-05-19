"use client";

import { useEffect } from "react";

/**
 * En desarrollo, desregistra SW de builds previos y limpia caches PWA.
 * Evita 404 en layout.css / main-app.js cuando el navegador usa chunks viejos.
 */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    void (async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    })();
  }, []);

  return null;
}
