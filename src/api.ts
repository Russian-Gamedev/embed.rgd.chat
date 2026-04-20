import type { InviteInfo } from "./types";

type RequestInitExtended = RequestInit & {
  params?: Record<string, unknown>;
};

export class API {
  public static readonly baseUrl = (() => {
    const url = process.env.API_BASE_URL;
    if (!url) throw new Error("API_BASE_URL environment variable is required");
    return url;
  })();

  static async getInviteInfo(code: string) {
    return this.request<InviteInfo>(`/discord/invite/${code}`);
  }

  static async request<T>(path: string, options: RequestInitExtended = {}) {
    const url = new URL(path, this.baseUrl);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.append(key, String(value));
      }
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }
    return response.json() as Promise<T>;
  }
}
