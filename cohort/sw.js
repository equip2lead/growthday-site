// Growth Day cohort · service worker: shows push notifications and opens the app when tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Growth Day", {
    body: d.body || "",
    icon: "/cohort/icon-192.png",
    badge: "/cohort/icon-192.png",
    tag: d.tag || "growthday",
    renotify: true,
    data: { url: d.url || "/cohort" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/cohort";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    for (const w of wins) { if (w.url.includes("/cohort") && "focus" in w) return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
