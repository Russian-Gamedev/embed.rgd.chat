import { beforeEach, describe, expect, it } from "bun:test";
import { createCache } from "./cache";

beforeEach(() => {
	createCache().clear();
});

describe("createCache", () => {
	it("returns undefined for a missing key", () => {
		const cache = createCache<string>();
		expect(cache.get("missing")).toBeUndefined();
	});

	it("stores and retrieves a value", () => {
		const cache = createCache<string>();
		cache.set("key", "value");
		expect(cache.get("key")).toBe("value");
	});

	it("overwrites an existing key", () => {
		const cache = createCache<string>();
		cache.set("key", "first");
		cache.set("key", "second");
		expect(cache.get("key")).toBe("second");
	});

	it("expires entries after TTL", async () => {
		const cache = createCache<string>();
		cache.set("key", "value", 10);
		expect(cache.get("key")).toBe("value");
		await Bun.sleep(20);
		expect(cache.get("key")).toBeUndefined();
	});

	it("keeps entries with null TTL forever", async () => {
		const cache = createCache<string>();
		cache.set("key", "value", null);
		await Bun.sleep(20);
		expect(cache.get("key")).toBe("value");
	});

	it("uses default TTL when no TTL is provided", async () => {
		const cache = createCache<string>(10);
		expect(cache.get("key")).toBeUndefined();
		cache.set("key", "value");
		expect(cache.get("key")).toBe("value");
		await Bun.sleep(20);
		expect(cache.get("key")).toBeUndefined();
	});

	it("removes a key with delete", () => {
		const cache = createCache<string>();
		cache.set("key", "value");
		cache.delete("key");
		expect(cache.get("key")).toBeUndefined();
	});

	it("clears all keys", () => {
		const a = createCache<string>();
		const b = createCache<string>();
		a.set("x", "1");
		b.set("y", "2");
		a.clear();
		expect(a.get("x")).toBeUndefined();
		expect(b.get("y")).toBeUndefined();
	});

	it("purges expired entries", async () => {
		const cache = createCache<string>();
		cache.set("key", "value", 10);
		await Bun.sleep(20);
		cache.purge();
		expect(cache.get("key")).toBeUndefined();
	});

	it("handles multiple keys independently", () => {
		const cache = createCache<string>();
		cache.set("a", "1");
		cache.set("b", "2");
		expect(cache.get("a")).toBe("1");
		expect(cache.get("b")).toBe("2");
		cache.delete("a");
		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBe("2");
	});
});
