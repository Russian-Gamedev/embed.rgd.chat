import type { BunRequest, RedisClient } from "bun";
import { Color, createLogger } from "./utils";
import { IS_DEV } from "./config";

const logger = createLogger("cache", Color.cyan);

export function redisCacheMiddleware(redis: RedisClient, ttl: number = 60) {
  return <Route extends string>(
    prefix: string,
    handler: (request: BunRequest<Route>) => Response | Promise<Response>,
  ) => {
    return async (request: BunRequest<Route>): Promise<Response> => {
      const cacheKey = `cache:${prefix}:${new URL(request.url).pathname}`;

      const cached = await redis.getBuffer(cacheKey);
      if (cached) {
        if (IS_DEV) logger(`Cache hit: ${cacheKey}`);
        return new Response(cached, {
          headers: { "Content-Type": "image/webp" },
        });
      }

      if (IS_DEV) logger(`Cache miss: ${cacheKey}`);
      const response = await handler(request);

      if (response.ok) {
        const buffer = await response.clone().arrayBuffer();
        redis
          .setex(cacheKey, ttl, Buffer.from(buffer))
          .catch((err: unknown) => {
            console.error("Failed to cache response:", err);
          });
      }

      return response;
    };
  };
}
