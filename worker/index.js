/* global self, clients */

self.addEventListener("push", (event) => {
  let data = {
    title: "Gabi",
    body: "Tienes pendientes en tu CRM",
    url: "/mis-leads",
    tag: "gabi-crm-pendientes",
    badgeCount: 0,
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    try {
      const text = event.data?.text?.();
      if (text) {
        data.body = text;
      }
    } catch {
      // ignore malformed payload
    }
  }

  const url = typeof data.url === "string" && data.url ? data.url : "/mis-leads";

  event.waitUntil(
    (async () => {
      if (
        typeof data.badgeCount === "number" &&
        data.badgeCount > 0 &&
        typeof self.registration.setAppBadge === "function"
      ) {
        try {
          await self.registration.setAppBadge(data.badgeCount);
        } catch {
          // Badge API opcional
        }
      }

      await self.registration.showNotification(data.title || "Gabi", {
        body: data.body || "Revisa tus pendientes en Gabi",
        icon: "/logos/gabi-icon-192.png",
        badge: "/logos/gabi-icon-192.png",
        tag: data.tag || "gabi-crm-pendientes",
        renotify: true,
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/mis-leads";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && typeof client.navigate === "function") {
            try {
              await client.navigate(targetUrl);
              return;
            } catch {
              // fall through to openWindow
            }
          }
          return;
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })(),
  );
});
