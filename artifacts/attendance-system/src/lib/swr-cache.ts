// ─── Global SWR (Stale-While-Revalidate) Cache ────────────────────────────────
// Intercepts window.fetch for GET /api/ requests:
//   • Cache hit  (< FRESH_TTL)  → return immediately, skip network
//   • Cache stale (< STALE_TTL) → return immediately + revalidate in background
//   • Cache miss or expired     → fetch, cache, return
//
// Result: navigation between pages feels instant after the first visit.

const FRESH_TTL  = 30_000;   // 30s — serve without revalidation
const STALE_TTL  = 120_000;  // 2m  — serve stale + revalidate bg
const MAX_AGE    = 300_000;  // 5m  — hard expiry, don't serve at all

// In-flight requests: prevent duplicate network calls for the same URL
const inflight = new Map<string, Promise<Response>>();

interface CacheEntry { data: unknown; ts: number }
const store = new Map<string, CacheEntry>();

// Paths that must never be cached
const NO_CACHE_PATTERNS = ["/api/auth/", "/api/setup/"];

function isCacheable(url: string, method: string): boolean {
  if (method !== "GET") return false;
  if (!url.includes("/api/")) return false;
  return !NO_CACHE_PATTERNS.some((p) => url.includes(p));
}

/** Synchronous peek — returns cached data or undefined (for initial state) */
export function peekCache<T = unknown>(urlSuffix: string): T | undefined {
  for (const [key, entry] of store) {
    if (key.includes(urlSuffix) && Date.now() - entry.ts < STALE_TTL) {
      return entry.data as T;
    }
  }
  return undefined;
}

/** Manually clear cache (call after mutations that affect specific data) */
export function clearCache(pattern?: string) {
  if (!pattern) { store.clear(); return; }
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}

function makeJsonResponse(data: unknown, cacheStatus: string): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Cache": cacheStatus,
    },
  });
}

async function fetchAndCache(
  key: string,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  originalFetch: typeof fetch,
): Promise<Response> {
  const res = await originalFetch(input, init);
  if (res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      store.set(key, { data, ts: Date.now() });
      return new Response(text, {
        status: res.status,
        headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
      });
    } catch {
      return new Response(text, { status: res.status, headers: res.headers });
    }
  }
  return res;
}

let installed = false;

export function installSwrCache(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    const method = ((init?.method ?? (input instanceof Request ? input.method : "GET")) || "GET").toUpperCase();

    // ── Mutations: clear cache & skip ──────────────────────────────────────
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (rawUrl.includes("/api/")) store.clear();
      return originalFetch(input, init);
    }

    if (!isCacheable(rawUrl, method)) {
      return originalFetch(input, init);
    }

    const key = rawUrl;
    const now = Date.now();
    const entry = store.get(key);

    // ── FRESH hit ──────────────────────────────────────────────────────────
    if (entry && now - entry.ts < FRESH_TTL) {
      return makeJsonResponse(entry.data, "HIT-FRESH");
    }

    // ── STALE hit — return immediately, revalidate in background ──────────
    if (entry && now - entry.ts < STALE_TTL) {
      // Don't await — let it update the cache for the next request
      if (!inflight.has(key)) {
        const p = fetchAndCache(key, input, init, originalFetch).finally(() =>
          inflight.delete(key),
        );
        inflight.set(key, p);
      }
      return makeJsonResponse(entry.data, "HIT-STALE");
    }

    // ── MISS or MAX_AGE expired ────────────────────────────────────────────
    store.delete(key);

    // Deduplicate in-flight requests for the same URL
    if (inflight.has(key)) {
      const res = await inflight.get(key)!;
      return res.clone();
    }

    const p = fetchAndCache(key, input, init, originalFetch).finally(() =>
      inflight.delete(key),
    );
    inflight.set(key, p);
    return p;
  };
}
