import type { BunRequest } from "bun";
import type { BunServer } from "../types";

export type RouteHandler<Route extends string = string> = (
  request: BunRequest<Route>,
  server: BunServer,
) => Response | Promise<Response>;

export type MiddlewareWrap<Route extends string = string> = (
  handler: RouteHandler<Route>,
) => RouteHandler<Route>;

/**
 * Compose middleware wrappers around a final route handler.
 * Last argument is the handler; all preceding arguments are wrappers.
 * Execution order: left-to-right (first wrapper is outermost).
 */
export function middlewares<Route extends string>(
  ...args: [...MiddlewareWrap<Route>[], RouteHandler<Route>]
): RouteHandler<Route> {
  const handler = args[args.length - 1] as RouteHandler<Route>;
  const wrappers = args.slice(0, -1) as MiddlewareWrap<Route>[];
  return wrappers.reduceRight((h, m) => m(h), handler);
}
