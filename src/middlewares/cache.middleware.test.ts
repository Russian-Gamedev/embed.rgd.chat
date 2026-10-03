import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { BunRequest } from "bun";
import { s3, s3CacheKey } from "../lib/s3";
import type { BunServer } from "../lib/types";

const objects = new Map<string, Date>();
let uploads = 0;
let renders = 0;
let failUpload = false;

// Only config is module-mocked: with real values IS_DEV would be true in tests
// and the middleware would bypass the cache entirely. The module mock leaks
// across test files, but no other test imports config transitively.
mock.module("../lib/config", () => ({
	IS_PROD: true,
	IS_DEV: false,
	IMAGE_CACHE_TTL_SECONDS: 900,
	S3_PUBLIC_URL: "https://cdn.test",
	SECRET_KEY: "test",
	checkRequiredEnvVars: () => {},
}));

const { s3CacheMiddleware } = await import("./cache.middleware");

// The S3 client's stat/write are patched on the shared instance and restored
// via plain properties, which does not leak into other test files.
const client = s3 as unknown as {
	stat: (key: string) => Promise<{ lastModified: Date }>;
	write: (key: string) => Promise<void>;
};
const originalStat = client.stat;
const originalWrite = client.write;

client.stat = async (key: string) => {
	const lastModified = objects.get(key);
	if (lastModified === undefined) {
		throw new Error("NoSuchKey");
	}
	return { lastModified };
};
client.write = async (key: string) => {
	if (failUpload) {
		throw new Error("S3 unavailable");
	}
	uploads += 1;
	objects.set(key, new Date());
};

afterAll(() => {
	client.stat = originalStat;
	client.write = originalWrite;
});

function keyFor(id: string): string {
	return s3CacheKey("title", new URL(`https://server/x?id=${id}`));
}

function makeRequest(id: string): BunRequest<"/:id"> {
	return { url: `https://server/x?id=${id}` } as unknown as BunRequest<"/:id">;
}

const server = {} as BunServer;

function okHandler(): Response {
	renders += 1;
	return new Response("image-bytes", { status: 200, headers: { "Content-Type": "image/webp" } });
}

async function waitForRenders(count: number): Promise<void> {
	for (let i = 0; i < 200; i++) {
		if (renders >= count) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error(`Expected ${count} renders, got ${renders}`);
}

beforeEach(() => {
	objects.clear();
	uploads = 0;
	renders = 0;
	failUpload = false;
});

describe("s3CacheMiddleware", () => {
	test("cold miss: renders, uploads, redirects", async () => {
		const middleware = s3CacheMiddleware("title", okHandler);
		const response = await middleware(makeRequest("a"), server);

		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe(`https://cdn.test/${keyFor("a")}`);
		expect(renders).toBe(1);
		expect(uploads).toBe(1);
	});

	test("fresh object: redirects without rendering", async () => {
		objects.set(keyFor("b"), new Date());
		const middleware = s3CacheMiddleware("title", okHandler);
		const response = await middleware(makeRequest("b"), server);

		expect(response.status).toBe(302);
		expect(renders).toBe(0);
		expect(uploads).toBe(0);
	});

	test("stale object: redirects immediately, re-renders in background", async () => {
		objects.set(keyFor("c"), new Date(Date.now() - 901_000));
		const middleware = s3CacheMiddleware("title", okHandler);
		const response = await middleware(makeRequest("c"), server);

		expect(response.status).toBe(302);
		// The redirect does not wait for the re-render to finish uploading.
		await waitForRenders(1);
		expect(uploads).toBe(1);
	});

	test("concurrent stale requests trigger a single render", async () => {
		objects.set(keyFor("d"), new Date(Date.now() - 901_000));
		const middleware = s3CacheMiddleware("title", okHandler);
		const [first, second] = await Promise.all([
			middleware(makeRequest("d"), server),
			middleware(makeRequest("d"), server),
		]);

		expect(first.status).toBe(302);
		expect(second.status).toBe(302);
		await waitForRenders(1);
		expect(renders).toBe(1);
		expect(uploads).toBe(1);
	});

	test("failed render passes through on cold miss", async () => {
		const middleware = s3CacheMiddleware("title", () => new Response("nope", { status: 400 }));
		const response = await middleware(makeRequest("e"), server);

		expect(response.status).toBe(400);
		expect(uploads).toBe(0);
	});

	test("failed upload returns 500 on cold miss", async () => {
		failUpload = true;
		const middleware = s3CacheMiddleware("title", okHandler);
		const response = await middleware(makeRequest("f"), server);

		expect(response.status).toBe(500);
	});

	test("custom ttl shorter than default: fresh object becomes stale", async () => {
		objects.set(keyFor("s"), new Date(Date.now() - 120_000)); // age 2 min, default ttl 15 min
		const middleware = s3CacheMiddleware("title", okHandler, 60);
		const response = await middleware(makeRequest("s"), server);

		expect(response.status).toBe(302);
		await waitForRenders(1);
		expect(uploads).toBe(1);
	});

	test("custom ttl longer than default: stale object stays fresh", async () => {
		objects.set(keyFor("l"), new Date(Date.now() - 901_000)); // age 15 min, custom ttl 1 hour
		const middleware = s3CacheMiddleware("title", okHandler, 60 * 60);
		const response = await middleware(makeRequest("l"), server);

		expect(response.status).toBe(302);
		expect(renders).toBe(0);
		expect(uploads).toBe(0);
	});
});
