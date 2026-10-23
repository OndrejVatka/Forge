/**
 * CacheStorage name of the service worker's runtime cache for Supabase REST
 * reads. Shared with vite.config.ts so the cache that is written and the cache
 * that is purged on sign-out cannot drift apart.
 */
export const SUPABASE_REST_CACHE = 'forge-supabase-rest';

/**
 * Deletes the service worker's cached board data. Called on sign-out so ticket
 * contents are not left readable in DevTools on a shared or lost device.
 *
 * @returns Resolves once the cache is gone, or immediately where CacheStorage
 *   is unavailable (insecure contexts, test environments).
 * @example
 * await clearOfflineBoardCache();
 */
export async function clearOfflineBoardCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(SUPABASE_REST_CACHE);
}
