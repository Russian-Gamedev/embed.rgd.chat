import { describe, expect, it } from "bun:test";
import { canonicalQuery, hmacSign, verifySignedUrl } from "./signature";

const SECRET = "test-secret-key";

function createTestUrl(params: Record<string, string>): URL {
	const url = new URL("https://example.com/image");
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	const query = canonicalQuery(url.searchParams);
	const sign = hmacSign(query, SECRET);
	url.searchParams.set("sign", sign);
	return url;
}

describe("canonicalQuery", () => {
	it("sorts params alphabetically by key", () => {
		const params = new URLSearchParams("z=1&a=2&m=3");
		expect(canonicalQuery(params)).toBe("a=2&m=3&z=1");
	});

	it("sorts by value when keys are equal", () => {
		const params = new URLSearchParams("a=z&a=b");
		expect(canonicalQuery(params)).toBe("a=b&a=z");
	});

	it("excludes sign param", () => {
		const params = new URLSearchParams("a=1&sign=abc&b=2");
		expect(canonicalQuery(params)).toBe("a=1&b=2");
	});

	it("encodes special characters", () => {
		const params = new URLSearchParams("name=hello world&q=foo&bar");
		expect(canonicalQuery(params)).toBe("bar=&name=hello%20world&q=foo");
	});
});

describe("hmacSign", () => {
	it("produces a base64url string", () => {
		const result = hmacSign("a=1&b=2", SECRET);
		expect(typeof result).toBe("string");
		expect(/^[A-Za-z0-9_-]+$/.test(result)).toBe(true);
	});

	it("produces consistent output for same input", () => {
		const a = hmacSign("hello", SECRET);
		const b = hmacSign("hello", SECRET);
		expect(a).toBe(b);
	});

	it("produces different output for different secrets", () => {
		const a = hmacSign("hello", SECRET);
		const b = hmacSign("hello", "different-secret");
		expect(a).not.toBe(b);
	});
});

describe("verifySignedUrl", () => {
	it("validates a correctly signed URL", () => {
		const url = createTestUrl({ id: "123", route: "banner" });
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(true);
	});

	it("validates a signed URL with exp", () => {
		const exp = Math.floor(Date.now() / 1000) + 3600;
		const url = createTestUrl({ id: "123", exp: String(exp) });
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(true);
	});

	it("rejects an expired URL", () => {
		const exp = Math.floor(Date.now() / 1000) - 10;
		const url = createTestUrl({ id: "123", exp: String(exp) });
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(false);
	});

	it("rejects a URL without sign param", () => {
		const url = new URL("https://example.com/image?id=123");
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(false);
	});

	it("rejects a URL without sign param even with exp", () => {
		const url = new URL("https://example.com/image?id=123&exp=9999999999");
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(false);
	});

	it("rejects a tampered URL", () => {
		const url = createTestUrl({ id: "123" });
		url.searchParams.set("id", "999");
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(false);
	});

	it("rejects a URL signed with a different secret", () => {
		const url = createTestUrl({ id: "123" });
		expect(verifySignedUrl({ url, secret: "wrong-secret" })).toBe(false);
	});

	it("rejects a URL with non-integer exp", () => {
		const url = createTestUrl({ id: "123", exp: "not-a-number" });
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(false);
	});

	it("validates a URL without exp param", () => {
		const url = createTestUrl({ id: "123" });
		expect(verifySignedUrl({ url, secret: SECRET })).toBe(true);
	});
});
