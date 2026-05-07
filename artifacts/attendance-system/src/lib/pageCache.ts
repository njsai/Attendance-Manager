/**
 * Module-level page data cache.
 * Survives React component unmount/remount (route changes in Wouter).
 * Data older than TTL_MS is considered stale but still shown while re-fetching.
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface Entry<T> { data: T; at: number; }

const store = new Map<string, Entry<any>>();

/** Returns cached value, or null if missing / expired. */
export function getCached<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() - e.at > TTL_MS) { store.delete(key); return null; }
  return e.data as T;
}

/** Returns cached value even if expired (for showing stale data while refreshing). */
export function getCachedStale<T>(key: string): T | null {
  return (store.get(key)?.data as T) ?? null;
}

/** Saves data to cache with current timestamp. */
export function setCached(key: string, data: any): void {
  store.set(key, { data, at: Date.now() });
}

/** Removes a specific key from cache (call after mutations). */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Removes all keys that start with a prefix. */
export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
