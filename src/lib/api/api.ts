import type { InviteInfo, User } from "./types";

type RequestInitExtended = RequestInit & {
	params?: Record<string, unknown>;
};

const baseUrl = (() => {
	const url = process.env.API_BASE_URL;
	if (!url) {
		throw new Error("API_BASE_URL environment variable is required");
	}
	return url;
})();

async function request<T>(path: string, options: RequestInitExtended = {}) {
	const url = new URL(path, baseUrl);
	if (options.params) {
		for (const [key, value] of Object.entries(options.params)) {
			url.searchParams.append(key, String(value));
		}
	}
	const response = await fetch(url.toString(), options);
	if (!response.ok) {
		throw new Error(`API request failed: ${response.status} ${response.statusText}`);
	}
	return response.json() as Promise<T>;
}

export const API = {
	async getInviteInfo(code: string) {
		return request<InviteInfo>(`/discord/invite/${code}`);
	},
	async getUser(id: string) {
		return request<User>(`/users/${id}`);
	},
};
