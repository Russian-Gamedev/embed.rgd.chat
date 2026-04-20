import type { BunRequest } from "bun";
import { createLogger, Color } from "../utils";
import { redis } from "../redis";
import { IMAGE_CACHE_TTL_SECONDS } from "../config";
import type { BunServer } from "../types";

const cacheLogger = createLogger("cache", Color.cyan);

export function redisCacheMiddleware() {
  return <Route extends string>(
    prefix: string,
    handler: (
      request: BunRequest<Route>,
      server: BunServer,
    ) => Response | Promise<Response>,
  ) => {
    return async (
      request: BunRequest<Route>,
      server: BunServer,
    ): Promise<Response> => {
      const cacheKey = `cache:${prefix}:${new URL(request.url).pathname}`;
      const cached = await redis.getBuffer(cacheKey);
      if (cached) {
        cacheLogger(`Cache hit: ${cacheKey}`);
        return new Response(cached, {
          headers: { "Content-Type": "image/webp" },
        });
      }

      cacheLogger(`Cache miss: ${cacheKey}`);
      const response = await handler(request, server);

      if (response.ok) {
        const buffer = await response.clone().arrayBuffer();
        redis
          .setex(cacheKey, IMAGE_CACHE_TTL_SECONDS, Buffer.from(buffer))
          .catch((err: unknown) => {
            console.error("Failed to cache response:", err);
          });
      }

      return response;
    };
  };
}
