import { describe, expect, test } from "bun:test";
import { s3CacheKey } from "./s3";

const TITLE_PARAMS = new Set([
	"text",
	"fill",
	"stroke",
	"format",
	"background",
	"blur",
	"overlay",
	"width",
	"height",
	"font_size",
	"margin",
	"rotate",
	"level",
]);

const SUPPORTER_PARAMS = new Set(["username", "amount", "avatar_url", "is_fee_paid_by_user"]);
const NO_PARAMS = new Set<string>();

describe("s3CacheKey", () => {
	test("shape: base folder/prefix/hash.webp", () => {
		expect(
			s3CacheKey("title", new URL("https://embed.rgd.chat/title?text=hi"), TITLE_PARAMS),
		).toMatch(/^embed\/title\/[0-9a-f]{64}\.webp$/);
	});

	test("stable across parameter order", () => {
		const a = s3CacheKey("title", new URL("https://x/title?text=hi&fill=%23fff"), TITLE_PARAMS);
		const b = s3CacheKey("title", new URL("https://x/title?fill=%23fff&text=hi"), TITLE_PARAMS);
		expect(a).toBe(b);
	});

	test("ignores unknown parameters", () => {
		const base = s3CacheKey("title", new URL("https://x/title?text=hi"), TITLE_PARAMS);
		const cacheBuster = s3CacheKey(
			"title",
			new URL("https://x/title?text=hi&t=1730000000"),
			TITLE_PARAMS,
		);
		expect(cacheBuster).toBe(base);
	});

	test("ignores sign and exp", () => {
		const base = s3CacheKey(
			"supporter",
			new URL("https://x/supporter?username=alice"),
			SUPPORTER_PARAMS,
		);
		const signed = s3CacheKey(
			"supporter",
			new URL("https://x/supporter?username=alice&exp=999&sign=abc"),
			SUPPORTER_PARAMS,
		);
		expect(signed).toBe(base);
		expect(
			s3CacheKey("supporter", new URL("https://x/supporter?username=bob"), SUPPORTER_PARAMS),
		).not.toBe(base);
	});

	test("every declared title parameter affects the key", () => {
		const base = s3CacheKey("title", new URL("https://x/title"), TITLE_PARAMS);
		for (const param of TITLE_PARAMS) {
			expect(
				s3CacheKey("title", new URL(`https://x/title?${param}=1`), TITLE_PARAMS),
				param,
			).not.toBe(base);
		}
	});

	test("every declared supporter parameter affects the key", () => {
		const base = s3CacheKey("supporter", new URL("https://x/supporter"), SUPPORTER_PARAMS);
		for (const param of SUPPORTER_PARAMS) {
			expect(
				s3CacheKey("supporter", new URL(`https://x/supporter?${param}=1`), SUPPORTER_PARAMS),
				param,
			).not.toBe(base);
		}
	});

	test("differs by prefix", () => {
		const url = new URL("https://x/invite/abc/banner");
		expect(s3CacheKey("invite", url, NO_PARAMS)).not.toBe(s3CacheKey("user", url, NO_PARAMS));
	});

	test("differs by path parameter", () => {
		expect(s3CacheKey("invite", new URL("https://x/invite/abc/banner"), NO_PARAMS)).not.toBe(
			s3CacheKey("invite", new URL("https://x/invite/def/banner"), NO_PARAMS),
		);
	});

	test("differs by parameter values", () => {
		expect(s3CacheKey("title", new URL("https://x/title?text=a"), TITLE_PARAMS)).not.toBe(
			s3CacheKey("title", new URL("https://x/title?text=b"), TITLE_PARAMS),
		);
	});
});
