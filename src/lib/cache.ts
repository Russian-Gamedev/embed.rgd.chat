const ONE_MINUTE = 60000;

interface CacheEntry<V> {
	value: V;
	expiresAt: number | null;
}

const storage = new Map<string | number | symbol, CacheEntry<unknown>>();

let purgeTimer: ReturnType<typeof setInterval> | null = null;
const purgeInterval = ONE_MINUTE;

function tick() {
	const now = Date.now();
	for (const [key, entry] of storage) {
		if (entry.expiresAt !== null && entry.expiresAt <= now) {
			storage.delete(key);
		}
	}
}

function ensurePurge() {
	if (purgeTimer === null) {
		purgeTimer = setInterval(tick, purgeInterval);
		if (typeof purgeTimer === "object" && "unref" in purgeTimer) {
			(purgeTimer as NodeJS.Timeout).unref();
		}
	}
}

export interface MemoryCache<V> {
	get(key: string): V | undefined;
	set(key: string, value: V, ttl?: number | null): void;
	delete(key: string): void;
	clear(): void;
	purge(): void;
}

export function createCache<V>(defaultTtl: number | null = 5 * ONE_MINUTE): MemoryCache<V> {
	ensurePurge();

	function get(key: string): V | undefined {
		const entry = storage.get(key) as CacheEntry<V> | undefined;
		if (!entry) {
			return undefined;
		}
		if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
			storage.delete(key);
			return undefined;
		}
		return entry.value;
	}

	function set(key: string, value: V, ttl: number | null = defaultTtl): void {
		storage.set(key, {
			value,
			expiresAt: ttl === null ? null : Date.now() + ttl,
		} satisfies CacheEntry<V>);
	}

	function del(key: string): void {
		storage.delete(key);
	}

	function clear(): void {
		storage.clear();
	}

	function purge(): void {
		tick();
	}

	return { get, set, delete: del, clear, purge };
}
