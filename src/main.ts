import editorIndex from "../editor/index.html";
import { renderInviteBanner } from "./embed/guild-banner";
import { renderSupporterCard } from "./embed/supporter/supporter-card";
import { renderTitle } from "./embed/title";
import { renderUserCard } from "./embed/user-card";
import { checkRequiredEnvVars, IS_DEV, ROUTE_CACHE_TTL_SECONDS } from "./lib/config";
import { Color, createLogger } from "./lib/utils";
import { middlewares } from "./middlewares";
import { s3CacheMiddleware } from "./middlewares/cache.middleware";
import { withImageResponse } from "./middlewares/image-response.middleware";
import { requestLoggerMiddleware } from "./middlewares/logger.middleware";
import { signatureMiddleware } from "./middlewares/signature.middleware";

checkRequiredEnvVars();

const logger = createLogger("main", Color.lime);

const server = Bun.serve({
	port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
	development: IS_DEV ? { hmr: true, console: true } : false,
	routes: {
		"/editor": editorIndex,
		"/invite/:code/banner": middlewares(
			requestLoggerMiddleware,
			s3CacheMiddleware(
				"invite",
				withImageResponse(renderInviteBanner),
				ROUTE_CACHE_TTL_SECONDS.invite,
			),
		),
		"/users/:id/card": middlewares(
			requestLoggerMiddleware,
			s3CacheMiddleware("user", withImageResponse(renderUserCard), ROUTE_CACHE_TTL_SECONDS.user),
		),
		"/supporter": middlewares(
			requestLoggerMiddleware,
			signatureMiddleware,
			s3CacheMiddleware(
				"supporter",
				withImageResponse(renderSupporterCard),
				ROUTE_CACHE_TTL_SECONDS.supporter,
			),
		),
		"/title": middlewares(
			requestLoggerMiddleware,
			s3CacheMiddleware("title", withImageResponse(renderTitle)),
		),
		"/health": () => new Response("OK"),
	},
	fetch() {
		return new Response("404 Not Found", { status: 404 });
	},
});

logger(`Server running at ${server.url}`);
