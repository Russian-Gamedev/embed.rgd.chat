import { SECRET_KEY } from "../lib/config";
import { verifySignedUrl } from "../lib/signature";
import { JsonResponse } from "../lib/utils";
import type { MiddlewareWrap } from ".";

export const signatureMiddleware: MiddlewareWrap = (handler) => {
	return async (request, _server) => {
		const url = new URL(request.url);

		if (!verifySignedUrl({ url, secret: SECRET_KEY })) {
			return new JsonResponse({ error: "Invalid or expired signature" }, { status: 403 });
		}

		return handler(request, _server);
	};
};
