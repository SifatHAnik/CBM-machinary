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
export async function safeFetch(key, fetcher, staticKey, onData, timeoutMs = 50) {
    const cached = loadFromCache(key);
    if (cached !== null && cached !== undefined) onData(cached, 'cache');

    try {
        const data = await Promise.race([
            Promise.resolve().then(() => fetcher()),
            new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), timeoutMs))
        ]);
        if (data !== undefined && data !== null) {
            saveToCache(key, data);
            onData(data, 'network');
            showStatusBadge('live');
            return data;
        }
    } catch (err) { /* fall through */ }

    if (cached !== null && cached !== undefined) {
        showStatusBadge('cached');
        return cached;
    }

    const snap = await loadSnapshot();
    if (snap && snap[staticKey]) {
        onData(snap[staticKey], 'static');
        showStatusBadge('snapshot');
        return snap[staticKey];
    }

    onData(null, 'failed');
    showStatusBadge('offline');
    return null;
}

let _badgeTimer = null;
function showStatusBadge(state) {
    const labels = {
        live:     { text: '● Live',      color: '#25D366' },
        cached:   { text: '● Cached',    color: '#d4a373' },
        snapshot: { text: '● Snapshot',  color: '#e2136e' },
        offline:  { text: '● Offline',   color: '#e2136e' }
    };
    const cfg = labels[state];
    if (!cfg) return;

    let badge = document.getElementById('cbm-status-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'cbm-status-badge';
        badge.style.cssText = `
            position: fixed;
            bottom: 12px;
            left: 12px;
            z-index: 9999;
            background: rgba(14,17,17,0.9);
            border: 1px solid rgba(255,255,255,0.15);
            padding: 4px 10px;
            border-radius: 20px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 1px;
            pointer-events: none;
            transition: opacity 0.4s ease;
        `;
        document.body.appendChild(badge);
    }
    badge.textContent = cfg.text;
    badge.style.color = cfg.color;
    badge.style.opacity = '1';

    clearTimeout(_badgeTimer);
    // If live, hide after 3 seconds. If cached/snapshot/offline, keep visible.
    if (state === 'live') {
        _badgeTimer = setTimeout(() => { badge.style.opacity = '0'; }, 3000);
    }
}