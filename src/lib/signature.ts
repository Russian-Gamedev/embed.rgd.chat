import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalQuery, EXP_PARAM, SIGN_PARAM } from "./canonical-query";

export { canonicalQuery };

export function hmacSign(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifySignedUrl(options: { url: URL; secret: string }): boolean {
	const sign = options.url.searchParams.get(SIGN_PARAM);
	const expRaw = options.url.searchParams.get(EXP_PARAM);

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
