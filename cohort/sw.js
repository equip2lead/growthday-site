// Growth Day cohort · service worker
// 1) keeps the app available offline (network first, saved copy when there's no connection)
// 2) shows push notifications and opens the app when tapped
const SHELL = "gd-shell-v2";
const SHELL_FILES = ["/cohort/", "/cohort/manifest.webmanifest", "/cohort/icon-192.png", "/cohort/icon-512.png", "/cohort/growth-day-poster.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("gd-shell-") && k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // the app page: try the network, fall back to the saved copy when offline
  if (req.mode === "navigate" && url.origin === location.origin && url.pathname.startsWith("/cohort")) {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(SHELL).then((c) => c.put("/cohort/", copy)); return res;
    }).catch(() => caches.match("/cohort/")));
    return;
  }
  // small same-origin files (icons, manifest, poster) and fonts: saved copy first, refreshed in the background
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isStatic = url.origin === location.origin && url.pathname.startsWith("/cohort/") && /\.(png|jpg|webmanifest|svg)$/.test(url.pathname);
  if (isFont || isStatic) {
    e.respondWith(caches.open(SHELL).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Growth Day", {
    body: d.body || "",
    icon: "/cohort/icon-192.png",
    badge: "/cohort/icon-192.png",
    tag: d.tag || "growthday",
    renotify: true,
    data: { url: d.url || "/cohort/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/cohort/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    for (const w of wins) { if (w.url.includes("/cohort") && "focus" in w) return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
