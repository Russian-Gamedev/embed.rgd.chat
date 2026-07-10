import type { RouteHandler } from ".";

export function withImageResponse<Route extends string>(
	handler: RouteHandler<Route>,
): RouteHandler<Route> {
	return async (request, server) => {
		try {
			const response = await handler(request, server);
			if ("ready" in response && response.ready instanceof Promise) {
				await response.ready;
			}
			return response;
		} catch (error) {
			console.error(error);
			return new Response("Failed to generate image", { status: 500 });
		}
	};
}
