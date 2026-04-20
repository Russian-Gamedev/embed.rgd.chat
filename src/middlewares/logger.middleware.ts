import type { BunRequest } from "bun";
import type { RouteHandler } from ".";
import type { BunServer } from "../types";
import { createLogger, Color } from "../utils";

const requestLogger = createLogger("request", Color.blue);

export function requestLoggerMiddleware<Route extends string>(
  handler: RouteHandler<Route>,
): RouteHandler<Route> {
  return async (
    request: BunRequest<Route>,
    server: BunServer,
  ): Promise<Response> => {
    const start = performance.now();
    const { method } = request;
    const { pathname } = new URL(request.url);
    const ip = server.requestIP(request)?.address ?? "unknown";

    try {
      const response = await handler(request, server);

      const ms = (performance.now() - start).toFixed(1);
      requestLogger(
        `${method} ${pathname} - ${response.status} | ${ms}ms | ${ip}`,
      );

      return response;
    } catch (err) {
      const ms = (performance.now() - start).toFixed(1);
      requestLogger(
        `${method} ${pathname} - ERROR | ${ms}ms | ${ip}`,
      );
      throw err;
    }
  };
}
