import type { BunRequest } from "bun";
import { IMAGE_CACHE_TTL_SECONDS, IS_DEV } from "../lib/config";
import { s3, s3CacheKey, s3ObjectUrl } from "../lib/s3";
import type { BunServer } from "../lib/types";
import { Color, createLogger } from "../lib/utils";

const cacheLogger = createLogger("cache", Color.cyan);

interface RenderResult {
	/** Handler returned an error response — pass it through to the client. */
	failure?: Response;
	uploaded: boolean;
}

/** Renders per object key, so concurrent requests share a single render/upload. */
const inflightRenders = new Map<string, Promise<RenderResult>>();

function redirect(location: string): Response {
	return new Response(null, { status: 302, headers: { Location: location } });
}

async function renderAndUpload<Route extends string>(
	key: string,
	handler: (request: BunRequest<Route>, server: BunServer) => Response | Promise<Response>,
	request: BunRequest<Route>,
	server: BunServer,
): Promise<RenderResult> {
	const response = await handler(request, server);
	if (!response.ok) {
		return { failure: response, uploaded: false };
	}

	const buffer = await response.arrayBuffer();
	const type = response.headers.get("Content-Type") ?? "image/webp";
	try {
		await s3.write(key, buffer, { type });
	} catch (error) {
		cacheLogger(`Upload failed: ${key}: ${error}`);
		return { uploaded: false };
	}

	cacheLogger(`Uploaded: ${key}`);
	return { uploaded: true };
}

export function s3CacheMiddleware<Route extends string>(
	prefix: string,
	handler: (request: BunRequest<Route>, server: BunServer) => Response | Promise<Response>,
	ttlSeconds: number = IMAGE_CACHE_TTL_SECONDS,
) {
	return async (request: BunRequest<Route>, server: BunServer): Promise<Response> => {
		if (IS_DEV) {
			return handler(request, server);
		}

		const key = s3CacheKey(prefix, new URL(request.url));
		const objectUrl = s3ObjectUrl(key);

		let lastModified: Date | null = null;
		try {
			lastModified = (await s3.stat(key)).lastModified;
		} catch {
			// No object yet — render synchronously below.
		}

		if (lastModified !== null && Date.now() - lastModified.getTime() < ttlSeconds * 1000) {
			cacheLogger(`Fresh: ${key}`);
			return redirect(objectUrl);
		}

		const inflight = inflightRenders.get(key);
		if (inflight !== undefined) {
			if (lastModified !== null) {
				// Stale, but already being re-rendered — serve the current object.
				cacheLogger(`Stale, revalidation in flight: ${key}`);
				return redirect(objectUrl);
			}
			const result = await inflight;
			return passThrough(result, objectUrl);
		}

		const render = renderAndUpload(key, handler, request, server);
		inflightRenders.set(
			key,
			render.finally(() => {
				inflightRenders.delete(key);
			}),
		);

		if (lastModified !== null) {
			// Stale-while-revalidate: serve the old object, refresh in the background.
			cacheLogger(`Stale, revalidating: ${key}`);
			void render.then((result) => {
				if (result.failure === undefined && !result.uploaded) {
					cacheLogger(`Revalidation failed: ${key}`);
				}
			});
			return redirect(objectUrl);
		}

		cacheLogger(`Miss: ${key}`);
		const result = await render;
		return passThrough(result, objectUrl);
	};
}

function passThrough(result: RenderResult, objectUrl: string): Response {
	if (result.failure !== undefined) {
		return result.failure;
	}
	if (result.uploaded) {
		return redirect(objectUrl);
	}
	return new Response("Failed to store image", { status: 500 });
}
