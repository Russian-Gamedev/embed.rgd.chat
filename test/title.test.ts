import { describe, expect, it } from "bun:test";
import { renderTitle } from "../src/embed/title";
import { request } from "./utils";

type QueryValue = string | number | Array<string | number>;

function titleUrl(query: Record<string, QueryValue>): URL {
	const url = new URL("http://localhost/title");
	for (const [key, value] of Object.entries(query)) {
		for (const item of Array.isArray(value) ? value : [value]) {
			url.searchParams.append(key, String(item));
		}
	}
	return url;
}

describe("title", () => {
	it("must render single-line title", async () => {
		const name = "title-latin";
		const data = await request(renderTitle, { url: titleUrl({ text: "Russian Gamedev" }) }, name);
		expect(data.ok).toBe(true);
	});

	it("must render cyrillic title", async () => {
		const name = "title-cyrillic";
		const data = await request(renderTitle, { url: titleUrl({ text: "Русский Геймдев" }) }, name);
		expect(data.ok).toBe(true);
	});

	it("must render multiline title with per-line colors", async () => {
		const name = "title-multiline";
		const data = await request(
			renderTitle,
			{
				url: titleUrl({
					text: ["Russian", "Gamedev"],
					fill: "#ffffff,#5b647d",
					stroke: "#5b647d,#ffd700",
				}),
			},
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must shrink long title", async () => {
		const name = "title-long";
		const data = await request(
			renderTitle,
			{ url: titleUrl({ text: "Очень длинный заголовок стрима про разработку игр" }) },
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must render custom colors", async () => {
		const name = "title-colors";
		const data = await request(
			renderTitle,
			{ url: titleUrl({ text: "Russian Gamedev", fill: "#5b647d", stroke: "#ffd700" }) },
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must render color background", async () => {
		const name = "title-background-color";
		const data = await request(
			renderTitle,
			{ url: titleUrl({ text: "Russian Gamedev", background: "#5b647d" }) },
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must render image background with blur and overlay", async () => {
		const name = "title-background-image";
		const data = await request(
			renderTitle,
			{
				url: titleUrl({
					text: "Russian Gamedev",
					background: "https://assets.rgd.chat/images/yal.jpg",
					blur: 8,
					overlay: "#10141850",
				}),
			},
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must render custom output size", async () => {
		const name = "title-size";
		const data = await request(
			renderTitle,
			{ url: titleUrl({ text: "Russian Gamedev", width: 1600, height: 252 }) },
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must render discord title format", async () => {
		const name = "title-discord";
		const data = await request(
			renderTitle,
			{ url: titleUrl({ text: "Правила", format: "discord" }) },
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must render discord title format level 2", async () => {
		const name = "title-discord-level2";
		const data = await request(
			renderTitle,
			{ url: titleUrl({ text: "Правила", format: "discord", level: 2 }) },
			name,
		);
		expect(data.ok).toBe(true);
	});

	it("must render yal background with overlay and custom height", async () => {
		const name = "title-overlay";
		const data = await request(
			renderTitle,
			{
				url: titleUrl({
					text: "Russian Gamedev",
					background: "https://assets.rgd.chat/images/yal.jpg",
					overlay: "#7692c71a",
					height: 500,
				}),
			},
			name,
		);
		expect(data.ok).toBe(true);
	});
});
