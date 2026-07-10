import type { MemoryCache } from "./cache/cache";
import { createCache } from "./cache/cache";

export class ImageFetchError extends Error {
	readonly kind: string;
	readonly detail: unknown;

	constructor(kind: string, detail?: unknown) {
		super(`Image fetch failed: ${kind}`);
		this.name = "ImageFetchError";
		this.kind = kind;
		this.detail = detail;
	}
}

export interface ImageLoaderOptions {
	/** Hostnames (and subdomains) allowed for images. Empty = all allowed (with https:). */
	allowedHosts?: string[];
	/** Maximum response body in bytes. */
	maxBytes: number;
	/** Total timeout in ms for the entire fetch + redirect chain. */
	timeoutMs: number;
	/** Maximum number of consecutive redirects. */
	maxRedirects: number;
	/** Accepted MIME type prefixes (e.g. "image/png"). Empty = all image/*. */
	allowedMimeTypes?: string[];
	/** Optional external cache. Created internally if omitted. */
	cache?: MemoryCache<Promise<ArrayBuffer>>;
}

const DEFAULT_OPTIONS: ImageLoaderOptions = {
	maxBytes: 5 * 1024 * 1024,
	timeoutMs: 8_000,
	maxRedirects: 5,
};

async function readStreamWithLimit(stream: ReadableStream, limit: number): Promise<ArrayBuffer> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			total += value.byteLength;
			if (total > limit) {
				await reader.cancel();
				throw new ImageFetchError("too_large", `${total} bytes exceeds limit ${limit}`);
			}

			chunks.push(value);
		}
	} catch (error: unknown) {
		if (error instanceof ImageFetchError) {
			throw error;
		}
		throw error;
	}

	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return result.buffer as ArrayBuffer;
}

export class ImageLoader {
	readonly cache: MemoryCache<Promise<ArrayBuffer>>;
	private readonly options: ImageLoaderOptions;
	private fallbackReady: Promise<void> | null = null;

	constructor(options?: Partial<ImageLoaderOptions>) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
		this.cache = this.options.cache ?? createCache<Promise<ArrayBuffer>>(600_000);
	}

	isAllowed(url: URL): boolean {
		if (url.protocol !== "https:") {
			return false;
		}

		const hosts = this.options.allowedHosts;
		if (!hosts || hosts.length === 0) {
			return true;
		}

		const hostname = url.hostname.toLowerCase();
		return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
	}

	async ensureFallback(filePath: string, cacheKey: string): Promise<void> {
		if (this.fallbackReady) {
			return this.fallbackReady;
		}

		this.fallbackReady = this.loadFallback(filePath, cacheKey);
		return this.fallbackReady;
	}

	private async loadFallback(filePath: string, cacheKey: string): Promise<void> {
		const buffer = await Bun.file(filePath).arrayBuffer();
		this.cache.set(cacheKey, Promise.resolve(buffer));
	}

	async load(url: URL): Promise<ArrayBuffer> {
		const key = url.toString();

		const cached = this.cache.get(key);
		if (cached !== undefined) {
			return await cached;
		}

		const promise = this.download(url).catch((error: unknown) => {
			this.cache.delete(key);
			throw error;
		});

		this.cache.set(key, promise);
		return await promise;
	}

	private async download(url: URL): Promise<ArrayBuffer> {
		const controller = new AbortController();
		const timer = setTimeout(
			() => controller.abort(new ImageFetchError("timeout")),
			this.options.timeoutMs,
		);

		try {
			let currentUrl = url;

			for (let i = 0; i <= this.options.maxRedirects; i++) {
				if (i > 0 && !this.isAllowed(currentUrl)) {
					throw new ImageFetchError("redirect_not_allowed", currentUrl.hostname);
				}

				const response = await fetch(currentUrl.toString(), {
					method: "GET",
					redirect: "manual",
					signal: controller.signal,
				});

				if (response.status >= 300 && response.status < 400) {
					const location = response.headers.get("location");
					if (!location) {
						throw new ImageFetchError("redirect_no_location");
					}
					currentUrl = new URL(location, currentUrl);
					continue;
				}

				if (!response.ok) {
					throw new ImageFetchError("http_status", `${currentUrl.hostname}: ${response.status}`);
				}

				const contentLength = response.headers.get("content-length");
				if (contentLength !== null) {
					const len = parseInt(contentLength, 10);
					if (!Number.isNaN(len) && len > this.options.maxBytes) {
						throw new ImageFetchError(
							"too_large",
							`${currentUrl.hostname}: ${len} bytes via Content-Length`,
						);
					}
				}

				const mimeTypes = this.options.allowedMimeTypes;
				if (mimeTypes && mimeTypes.length > 0) {
					const contentType = response.headers.get("content-type") ?? "";
					const mimeOk = mimeTypes.some((m) => contentType.startsWith(m));
					if (!mimeOk) {
						throw new ImageFetchError("bad_content_type", contentType);
					}
				}

				if (!response.body) {
					throw new ImageFetchError("no_body");
				}

				return await readStreamWithLimit(response.body, this.options.maxBytes);
			}

			throw new ImageFetchError("too_many_redirects");
		} finally {
			clearTimeout(timer);
		}
	}
}
