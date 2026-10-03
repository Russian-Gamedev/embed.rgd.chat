import { createHash } from "node:crypto";
import { canonicalQuery, EXP_PARAM, SIGN_PARAM } from "./canonical-query";
import { S3_PUBLIC_URL } from "./config";

export const s3 = new Bun.S3Client({ bucket: process.env.S3_BUCKET });

const CACHE_KEY_EXCLUDED_PARAMS: ReadonlySet<string> = new Set([SIGN_PARAM, EXP_PARAM]);

export function s3ObjectUrl(key: string): string {
	return `${S3_PUBLIC_URL}/${key}`;
}

/**
 * Stable S3 object key for a rendered image: same parameters in any order
 * produce the same key; signing parameters are excluded so different
 * signatures of the same content share one object.
 */
export function s3CacheKey(prefix: string, url: URL): string {
	const payload = `${url.pathname}?${canonicalQuery(url.searchParams, CACHE_KEY_EXCLUDED_PARAMS)}`;
	const hash = createHash("sha256").update(payload).digest("hex");
	return `${prefix}/${hash}.webp`;
}
