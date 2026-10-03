import { createHash } from "node:crypto";
import { canonicalQuery } from "./canonical-query";
import { S3_PREFIX, S3_PUBLIC_URL } from "./config";

export const s3 = new Bun.S3Client({ bucket: process.env.S3_BUCKET });

export function s3ObjectUrl(key: string): string {
	return `${S3_PUBLIC_URL}/${key}`;
}

/**
 * Stable S3 object key for a rendered image: same relevant parameters in any
 * order produce the same key. Only queryParams are included — unknown params
 * (e.g. cache busters like t=Date.now()) can't spawn new objects. Each route
 * declares the params it reads (QUERY_PARAMS in its embed module).
 */
export function s3CacheKey(prefix: string, url: URL, queryParams: ReadonlySet<string>): string {
	const relevant = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
		if (queryParams.has(key)) {
			relevant.append(key, value);
		}
	});

	const payload = `${url.pathname}?${canonicalQuery(relevant)}`;
	const hash = createHash("sha256").update(payload).digest("hex");
	return [S3_PREFIX, prefix, `${hash}.webp`].filter(Boolean).join("/");
}
