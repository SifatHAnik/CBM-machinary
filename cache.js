// ============================================================
// CACHE + FALLBACK ENGINE
// ============================================================
// Three layers of truth:
//   1. NETWORK  →  Firestore (live, can be slow or unreachable)
//   2. CACHE    →  localStorage (instant, per-browser, survives outages)
//   3. SNAPSHOT →  /static/snapshot.json (ships with the site, always up)

const PREFIX = 'cbm_cache_';
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function saveToCache(key, data) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
    } catch (e) { /* quota hit — ignore */ }
}

export function loadFromCache(key) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        return JSON.parse(raw).data;
    } catch (e) { return null; }
}

export function isCacheFresh(key) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return false;
        return Date.now() - JSON.parse(raw).ts < TTL_MS;
    } catch (e) { return false; }
}

let _snapPromise = null;
export function loadSnapshot() {
    if (_snapPromise) return _snapPromise;
    _snapPromise = fetch('/static/snapshot.json')
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null);
    return _snapPromise;
}

/**
 * The main workhorse. Shows cache immediately, tries network with a
 * timeout, falls back to cache then to the static snapshot.
 *
 * @param key        cache key (e.g. 'categories', 'products-cnc')
 * @param fetcher    async function that returns the fresh data
 * @param staticKey  key inside snapshot.json (same as key usually)
 * @param onData     callback (data, source) — source is 'cache' | 'network' | 'static' | 'failed'
 * @param timeoutMs  how long to wait for network before giving up
 */
export async function safeFetch(key, fetcher, staticKey, onData, timeoutMs = 4500) {
    // 1. Show cache instantly (if we have any)
    const cached = loadFromCache(key);
    if (cached !== null && cached !== undefined) onData(cached, 'cache');

    // 2. Race network vs timeout
    try {
        const data = await Promise.race([
            Promise.resolve().then(() => fetcher()),
            new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), timeoutMs))
        ]);
        if (data !== undefined && data !== null) {
            saveToCache(key, data);
            onData(data, 'network');
            return data;
        }
    } catch (err) {
        // fall through
    }

    // 3. Network failed — cache already showing, nothing more to do
    if (cached !== null && cached !== undefined) return cached;

    // 4. No cache — try static snapshot
    const snap = await loadSnapshot();
    if (snap && snap[staticKey]) {
        onData(snap[staticKey], 'static');
        return snap[staticKey];
    }

    // 5. Nothing worked
    onData(null, 'failed');
    return null;
}