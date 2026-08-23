// MONK service worker.
//
// Three caches with different jobs:
//   shell  — the app's own static assets, safe to serve cache-first
//   pages  — last-known-good HTML, so navigation works offline
//   audio  — chapters the listener downloaded on purpose; never evicted here,
//            only by the download manager in the app
const VERSION = "v1";
const SHELL_CACHE = `monk-shell-${VERSION}`;
const PAGE_CACHE = `monk-pages-${VERSION}`;
// Deliberately not versioned: downloads belong to the listener, so bumping the
// worker must never throw them away.
const AUDIO_CACHE = "monk-audio-v1";

const SHELL_ROUTES = ["/", "/search", "/library", "/settings"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      // Best effort: a cold install offline should not fail the whole worker.
      await Promise.allSettled(SHELL_ROUTES.map((route) => cache.add(route)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, PAGE_CACHE, AUDIO_CACHE]);
      const names = await caches.keys();

      await Promise.all(
        names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// Media elements ask for byte ranges when seeking. A cached response is a
// whole file, so slice it and answer 206 rather than handing back a 200 the
// element cannot seek within.
async function rangeResponse(cached, rangeHeader) {
  const buffer = await cached.arrayBuffer();
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);

  if (!match) return cached;

  const total = buffer.byteLength;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : total - 1;

  if (start >= total) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }

  const slice = buffer.slice(start, end + 1);

  return new Response(slice, {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/wav",
      "Content-Length": String(slice.byteLength),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
    },
  });
}

async function handleAudio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  // Ignore the Range header when looking up: downloads are stored whole.
  const cached = await cache.match(request, { ignoreSearch: false, ignoreVary: true });

  if (cached) {
    const range = request.headers.get("range");
    return range ? rangeResponse(cached.clone(), range) : cached;
  }

  return fetch(request);
}

async function handleNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);

  try {
    const response = await fetch(request);
    // Keep the newest good copy for the next offline visit.
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match("/library")) ||
      (await cache.match("/")) ||
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

async function handleStatic(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/samples/")) {
    event.respondWith(handleAudio(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/covers/")) {
    event.respondWith(handleStatic(request));
  }
});
