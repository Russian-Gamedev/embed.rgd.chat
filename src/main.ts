import { renderInviteBanner } from "./embed/guild-banner";
import { renderSupporterCard } from "./embed/supporter/supporter-card";
import { renderUserCard } from "./embed/user-card";
import { checkRequiredEnvVars } from "./lib/config";
import { connectRedis } from "./lib/redis";
import { Color, createLogger } from "./lib/utils";
import { middlewares } from "./middlewares";
import { redisCacheMiddleware } from "./middlewares/cache.middleware";
import { withImageResponse } from "./middlewares/image-response.middleware";
import { requestLoggerMiddleware } from "./middlewares/logger.middleware";

checkRequiredEnvVars();

const logger = createLogger("main", Color.lime);

await connectRedis();

const RedisMiddleware = redisCacheMiddleware();

const server = Bun.serve({
	port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
	routes: {
		"/invite/:code/banner": middlewares(
			requestLoggerMiddleware,
			RedisMiddleware("invite", withImageResponse(renderInviteBanner)),
		),
		"/users/:id/card": middlewares(
			requestLoggerMiddleware,
			RedisMiddleware("user", withImageResponse(renderUserCard)),
		),
		"/supporter": middlewares(
			requestLoggerMiddleware,
			withImageResponse(renderSupporterCard),
		),
		"/health": () => new Response("OK"),
	},
	fetch() {
		return new Response("404 Not Found", { status: 404 });
	},
});

logger(`Server running at ${server.url}`);
