import { RedisClient } from "bun";
import { renderInviteBanner } from "./embed/guild-banner";
import { Color, createLogger } from "./utils";
import { redisCacheMiddleware } from "./middleware";
import { checkRequiredEnvVars } from "./config";

checkRequiredEnvVars();

const logger = createLogger("main", Color.lime);

const redis = new RedisClient();
logger("Connecting to Redis...");
await redis.connect();
logger("Connected to Redis!");

const RedisMiddleware = redisCacheMiddleware(redis);

const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  routes: {
    "/invite/:code/banner": RedisMiddleware("invite", renderInviteBanner),
    "/health": () => new Response("OK"),
  },
  fetch(req) {
    return new Response("404 Not Found", { status: 404 });
  },
});

logger(`Server running at http://localhost:${server.port}`);
