import type { ImageLoader } from "../../lib/image-loader";
import { HttpError } from "../../lib/utils";

export const ALLOWED_AVATAR_HOSTS = ["cdn.discordapp.com", "media.discordapp.net"];

export function parseAvatarUrl(raw: string | null, imageLoader: ImageLoader): URL | null {
	if (raw === null) {
		return null;
	}

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new HttpError(400, "avatar_url is not a valid URL");
	}

	if (!imageLoader.isAllowed(url)) {
		throw new HttpError(400, "avatar_url is not allowed");
	}

	return url;
}
