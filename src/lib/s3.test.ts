import { describe, expect, test } from "bun:test";
import { s3CacheKey } from "./s3";

describe("s3CacheKey", () => {
	test("shape: prefix/hash.webp", () => {
		expect(s3CacheKey("title", new URL("https://embed.rgd.chat/title?text=hi"))).toMatch(
			/^title\/[0-9a-f]{64}\.webp$/,
		);
	});

	test("stable across parameter order", () => {
		const a = s3CacheKey("title", new URL("https://x/title?text=hi&fill=%23fff"));
		const b = s3CacheKey("title", new URL("https://x/title?fill=%23fff&text=hi"));
		expect(a).toBe(b);
	});

	test("ignores sign and exp", () => {
		const base = s3CacheKey("supporter", new URL("https://x/supporter?user=42"));
		const signed = s3CacheKey("supporter", new URL("https://x/supporter?user=42&exp=999&sign=abc"));
		expect(signed).toBe(base);
	});

	test("differs by prefix", () => {
		const url = new URL("https://x/invite/abc/banner");
		expect(s3CacheKey("invite", url)).not.toBe(s3CacheKey("user", url));
	});

	test("differs by path parameter", () => {
		expect(s3CacheKey("invite", new URL("https://x/invite/abc/banner"))).not.toBe(
			s3CacheKey("invite", new URL("https://x/invite/def/banner")),
		);
	});

	test("differs by parameter values", () => {
		expect(s3CacheKey("title", new URL("https://x/title?text=a"))).not.toBe(
			s3CacheKey("title", new URL("https://x/title?text=b")),
		);
	});
});
