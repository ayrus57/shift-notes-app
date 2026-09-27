// Shift service worker.
// Handles: offline app-shell caching, and focusing/opening the app when a
// reminder notification is tapped. Notifications themselves are triggered
// from the open app via registration.showNotification() — there is no
// server-push wired up yet, so this cannot wake a fully closed browser at an
// exact time. See the Notifications section in Settings for the honest limit.

const CACHE = "shift-shell-v1";
const SHELL = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// network-first for the app shell so updates show up quickly; falls back to
// cache when offline
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase/API calls

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});

// tapping a notification focuses an open tab, or opens a new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// placeholder for real server push, not wired up yet
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title || "Shift", {
      body: payload.body || "",
      icon: "./icon-192.png",
      data: { url: "./index.html" },
    })
  );
});
