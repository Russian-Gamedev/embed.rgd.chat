import { describe, expect, it } from "bun:test";
import { ImageLoader } from "../../lib/image-loader";
import { ALLOWED_AVATAR_HOSTS } from "./avatar";

const mod = await import("./supporter-card");

const avatarLoader = new ImageLoader({
	allowedHosts: ALLOWED_AVATAR_HOSTS,
	allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
});

describe("parseSupporterCardInput", () => {
	function url(params: string): URL {
		return new URL(`http://nope${params}`);
	}

	function parse(url: URL) {
		return mod.parseSupporterCardInput(url, avatarLoader);
	}

	describe("username", () => {
		it("rejects missing username", () => {
			expect(() => parse(url("?amount=100"))).toThrow(/username is required/);
		});

		it("rejects empty username", () => {
			expect(() => parse(url("?username=&amount=100"))).toThrow(/username must not be empty/);
		});

		it("rejects whitespace-only username", () => {
			expect(() => parse(url("?username=+++&amount=100"))).toThrow(/username must not be empty/);
		});

		it("rejects too long username (33 chars)", () => {
			expect(() => parse(url(`?username=${"a".repeat(33)}&amount=100`))).toThrow(
				/username must be at most 32/,
			);
		});

		it("accepts 32-char username", () => {
			const result = parse(url(`?username=${"a".repeat(32)}&amount=100`));
			expect(result.username).toBe("a".repeat(32));
		});

		it("rejects username with control characters", () => {
			expect(() => parse(url("?username=foo%00bar&amount=100"))).toThrow(
				/username contains invalid characters/,
			);
		});
	});

	describe("amount", () => {
		it("accepts valid amount", () => {
			const result = parse(url("?username=u&amount=500"));
			expect(result.amount).toBe(500);
		});

		it("rejects missing amount", () => {
			expect(() => parse(url("?username=u"))).toThrow(/amount is required/);
		});

		it('rejects "10abc"', () => {
			expect(() => parse(url("?username=u&amount=10abc"))).toThrow(
				/amount must be a positive integer/,
			);
		});

		it('rejects "NaN"', () => {
			expect(() => parse(url("?username=u&amount=NaN"))).toThrow(
				/amount must be a positive integer/,
			);
		});

		it('rejects "Infinity"', () => {
			expect(() => parse(url("?username=u&amount=Infinity"))).toThrow(
				/amount must be a positive integer/,
			);
		});

		it("rejects negative amount", () => {
			expect(() => parse(url("?username=u&amount=-100"))).toThrow(
				/amount must be a positive integer/,
			);
		});

		it("rejects zero", () => {
			expect(() => parse(url("?username=u&amount=0"))).toThrow(/amount must be at least 1/);
		});

		it("rejects amount above MAX_AMOUNT", () => {
			expect(() => parse(url("?username=u&amount=10000001"))).toThrow(
				/amount must be at most 10000000/,
			);
		});
	});

	describe("is_fee_paid_by_user", () => {
		it('accepts "1"', () => {
			const result = parse(url("?username=u&amount=100&is_fee_paid_by_user=1"));
			expect(result.isFeePaidByUser).toBe(true);
		});

		it('accepts "0"', () => {
			const result = parse(url("?username=u&amount=100&is_fee_paid_by_user=0"));
			expect(result.isFeePaidByUser).toBe(false);
		});

		it("defaults to false when absent", () => {
			const result = parse(url("?username=u&amount=100"));
			expect(result.isFeePaidByUser).toBe(false);
		});

		it('rejects "true"', () => {
			expect(() => parse(url("?username=u&amount=100&is_fee_paid_by_user=true"))).toThrow(
				/is_fee_paid_by_user must be '1' or '0'/,
			);
		});

		it('rejects "false"', () => {
			expect(() => parse(url("?username=u&amount=100&is_fee_paid_by_user=false"))).toThrow(
				/is_fee_paid_by_user must be '1' or '0'/,
			);
		});
	});

	describe("avatar_url", () => {
		it("accepts null (no avatar_url param)", () => {
			const result = parse(url("?username=u&amount=100"));
			expect(result.avatarUrl).toBeNull();
		});

		it("rejects http:// URL", () => {
			expect(() =>
				parse(url("?username=u&amount=100&avatar_url=http://cdn.discordapp.com/ava.png")),
			).toThrow(/avatar_url is not allowed/);
		});

		it("rejects non-allowlisted host", () => {
			expect(() =>
				parse(url("?username=u&amount=100&avatar_url=https://evil.com/ava.png")),
			).toThrow(/avatar_url is not allowed/);
		});

		it("accepts cdn.discordapp.com", () => {
			const result = parse(
				url("?username=u&amount=100&avatar_url=https://cdn.discordapp.com/ava.png"),
			);
			expect(result.avatarUrl?.hostname).toBe("cdn.discordapp.com");
		});

		it("accepts subdomain of allowed host", () => {
			const result = parse(
				url("?username=u&amount=100&avatar_url=https://sub.cdn.discordapp.com/ava.png"),
			);
			expect(result.avatarUrl).not.toBeNull();
		});
	});
});

describe("ImageLoader", () => {
	it("rejects non-https URLs", () => {
		const loader = new ImageLoader({ allowedHosts: ["cdn.discordapp.com"] });
		expect(loader.isAllowed(new URL("http://cdn.discordapp.com/ava.png"))).toBe(false);
	});

	it("rejects non-allowlisted hosts", () => {
		const loader = new ImageLoader({ allowedHosts: ["cdn.discordapp.com"] });
		expect(loader.isAllowed(new URL("https://evil.com/ava.png"))).toBe(false);
	});

	it("accepts allowlisted hosts", () => {
		const loader = new ImageLoader({ allowedHosts: ["cdn.discordapp.com"] });
		expect(loader.isAllowed(new URL("https://cdn.discordapp.com/ava.png"))).toBe(true);
	});

	it("accepts subdomains of allowlisted hosts", () => {
		const loader = new ImageLoader({ allowedHosts: ["cdn.discordapp.com"] });
		expect(loader.isAllowed(new URL("https://sub.cdn.discordapp.com/ava.png"))).toBe(true);
	});

	it("accepts any https host when allowlist is empty", () => {
		const loader = new ImageLoader({ allowedHosts: [] });
		expect(loader.isAllowed(new URL("https://any-host.com/img.png"))).toBe(true);
	});

	it("accepts any https host when allowlist is not set", () => {
		const loader = new ImageLoader({});
		expect(loader.isAllowed(new URL("https://any-host.com/img.png"))).toBe(true);
	});

	it("rejects http even without allowlist", () => {
		const loader = new ImageLoader({});
		expect(loader.isAllowed(new URL("http://any-host.com/img.png"))).toBe(false);
	});
});
