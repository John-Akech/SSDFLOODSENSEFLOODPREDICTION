// FloodSense Service Worker - v2.0.0
const CACHE_NAME = "floodsense-v2.0.0";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/images/FloodSenseLogo.png"
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn("Cache failed:", url)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http")) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(r => r || new Response(JSON.stringify({ error: "Offline" }), { status: 503 }))
      )
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(r => r || fetch(event.request))
    );
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push received");
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "New flood alert available",
      icon: "/images/FloodSenseLogo.png",
      badge: "/images/FloodSenseLogo.png",
      vibrate: [200, 100, 200],
      data: data.data || {},
      tag: "flood-alert"
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "FloodSense Alert", options)
    );
  } catch (error) {
    console.error("[SW] Push error:", error);
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/map") && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/map");
    })
  );
});

// Message handler
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
