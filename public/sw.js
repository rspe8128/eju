/* eslint-disable no-undef */
/**
 * 서비스워커 — 오프라인에서도 앱이 열리게 한다.
 *
 * 왜 직접 짰나: next-pwa 같은 패키지는 빌드 파이프라인에 손을 대야 하는데,
 * 이 앱은 데이터가 전부 localStorage에 있어서 캐시할 게 앱 셸과 정적 자산뿐이다.
 * 그 정도는 50줄이면 된다.
 *
 * 규칙
 *  · /api/* 는 절대 캐시하지 않는다 (번역·AI 채점은 온라인 전용이고, 캐시된
 *    응답을 되돌려 주면 "왜 결과가 안 바뀌지"로 몇 시간을 태우게 된다)
 *  · 문서 요청은 network-first — 새 배포를 곧바로 받고, 실패하면 캐시로 떨어진다
 *  · /_next/static/* 은 파일명에 해시가 붙으므로 cache-first가 안전하다
 *  · 캐시 이름에 버전을 박아 두고, activate에서 옛 캐시를 지운다. 이렇게 하면
 *    Cache Storage가 무한정 늘어나지 않는다 (localStorage 할당량과는 별개지만,
 *    기기 전체 저장 압박이 커지면 브라우저가 localStorage까지 비울 수 있다)
 */

const VERSION = "v1";
const SHELL_CACHE = `eju-shell-${VERSION}`;
const ASSET_CACHE = `eju-assets-${VERSION}`;

/** 한 번도 안 열어 본 화면도 오프라인에서 뜨도록 미리 받아 둔다. */
const SHELL_URLS = [
  "/",
  "/study/today",
  "/study/japanese",
  "/study/library",
  "/review",
  "/mock",
  "/manifest.json",
  "/icon.svg",
];

/** 정적 자산 캐시가 이만큼 넘으면 오래된 것부터 버린다. */
const MAX_ASSET_ENTRIES = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll은 하나만 실패해도 전체가 실패한다. 개별로 넣고 실패는 넘긴다.
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* 설치 시점에 못 받은 건 나중에 방문할 때 채워진다 */
          }
        })
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (const key of keys.slice(0, keys.length - max)) {
    await cache.delete(key);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    // 처음 보는 경로라면 최소한 홈 셸이라도 띄운다 (라우팅은 클라이언트가 한다)
    const shell = await cache.match("/");
    if (shell) return shell;
    return new Response("오프라인입니다.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    await cache.put(request, fresh.clone());
    trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES);
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 번역·AI 채점은 온라인 전용. 캐시에 손대지 않는다.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    /\.(?:js|css|woff2?|png|svg|jpg|jpeg|webp|json)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
  }
});
