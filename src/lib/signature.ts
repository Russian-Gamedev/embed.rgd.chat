import { createHmac, timingSafeEqual } from "node:crypto";

const SIGN_PARAM = "sign";

export function canonicalQuery(params: URLSearchParams): string {
	const pairs: Array<[string, string]> = [];

	params.forEach((value, key) => {
		if (key !== SIGN_PARAM) {
			pairs.push([key, value]);
		}
	});

	pairs.sort(([ak, av], [bk, bv]) => {
		if (ak === bk) {
			return av.localeCompare(bv);
		}
		return ak.localeCompare(bk);
	});

	return pairs
		.map(([key, value]) => {
			return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
		})
		.join("&");
}

export function hmacSign(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifySignedUrl(options: { url: URL; secret: string }): boolean {
	const sign = options.url.searchParams.get(SIGN_PARAM);
	const expRaw = options.url.searchParams.get("exp");

	if (!sign) {
		return false;
	}

	if (expRaw) {
		const exp = Number(expRaw);
		if (!Number.isSafeInteger(exp)) {
			return false;
		}

		const now = Math.floor(Date.now() / 1000);
		if (exp < now) {
			return false;
		}
	}

	const payload = canonicalQuery(options.url.searchParams);
	const expected = hmacSign(payload, options.secret);

	const a = Buffer.from(sign);
	const b = Buffer.from(expected);

	if (a.length !== b.length) {
		return false;
	}

	return timingSafeEqual(a, b);
}
