import type { BunRequest } from "bun";
import type { BunServer } from "../src/lib/types";
import type { RouteHandler } from "../src/middlewares";

type RequestOptions = {
	params?: Record<string, string>;
	url?: URL;
};

export async function request(
	func: RouteHandler,
	options: RequestOptions,
	name: string,
): Promise<Response> {
	const req = options as unknown as BunRequest;

	const response = await func(req, {} as BunServer);
	const type = response.headers.get("content-type")?.split("/")?.at(-1);

	if (type === "json") {
		/// error
		const json = await response.json();
		throw json;
	}

	const image = await response.arrayBuffer();

	const path = `./temp/${name}.${type}`;

	await Bun.write(path, image);

	return response;
}
