import type { BunRequest } from "bun";
import { IMAGE_CACHE_TTL_SECONDS, IS_DEV } from "../lib/config";
import { redis } from "../lib/redis";
import type { BunServer } from "../lib/types";
import { Color, createLogger } from "../lib/utils";

const cacheLogger = createLogger("cache", Color.cyan);

export function redisCacheMiddleware() {
	return <Route extends string>(
		prefix: string,
		handler: (request: BunRequest<Route>, server: BunServer) => Response | Promise<Response>,
	) => {
		return async (request: BunRequest<Route>, server: BunServer): Promise<Response> => {
			if (IS_DEV) {
				return handler(request, server);
			}

			const cacheKey = `cache:${prefix}:${new URL(request.url).pathname}`;
			const typeKey = `${cacheKey}:type`;
			const [cached, type] = await Promise.all([redis.getBuffer(cacheKey), redis.get(typeKey)]);
			if (cached && type) {
				cacheLogger(`Cache hit: ${cacheKey}`);
				return new Response(cached, {
					headers: { "Content-Type": type },
				});
			}

			cacheLogger(`Cache miss: ${cacheKey}`);
			const response = await handler(request, server);

			if (response.ok) {
				const buffer = await response.clone().arrayBuffer();
				const contentType = response.headers.get("Content-Type") || "image/webp";
				Promise.all([
					redis.setex(cacheKey, IMAGE_CACHE_TTL_SECONDS, Buffer.from(buffer)),
					redis.setex(typeKey, IMAGE_CACHE_TTL_SECONDS, contentType),
				]).catch((err: unknown) => {
					console.error("Failed to cache response:", err);
				});
			}

			return response;
		};
	};
}
