// Minimal SW: network passthrough. Exists so the app meets the
// installability requirement (manifest + icons + fetch handler).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
