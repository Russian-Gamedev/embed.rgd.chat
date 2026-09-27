import { describe, expect, it } from "bun:test";
import {
	DISCORD_TITLE_FORMAT,
	MAX_BLUR,
	MAX_SIZE,
	MAX_TITLE_LENGTH,
	MAX_TITLE_LINES,
	parseTitleBackground,
	parseTitleBlur,
	parseTitleColors,
	parseTitleFormat,
	parseTitleLevel,
	parseTitleLines,
	parseTitleOverlay,
	parseTitleSize,
} from "./title";

describe("parseTitleLines", () => {
	it("returns a single trimmed line", () => {
		expect(parseTitleLines(["  Russian Gamedev "])).toEqual(["Russian Gamedev"]);
	});

	it("splits repeated params into lines", () => {
		expect(parseTitleLines(["Russian", "Gamedev"])).toEqual(["Russian", "Gamedev"]);
	});

	it("splits newlines inside a param into lines", () => {
		expect(parseTitleLines(["Russian\nGamedev"])).toEqual(["Russian", "Gamedev"]);
	});

	it("drops empty lines", () => {
		expect(parseTitleLines(["", "  ", "Russian\n\nGamedev"])).toEqual(["Russian", "Gamedev"]);
	});

	it("rejects missing text", () => {
		expect(() => parseTitleLines([])).toThrow(/required/);
		expect(() => parseTitleLines(["   "])).toThrow(/required/);
	});

	it("rejects too many lines", () => {
		expect(() => parseTitleLines(Array.from({ length: MAX_TITLE_LINES + 1 }, () => "a"))).toThrow(
			/At most/,
		);
	});

	it("rejects too long lines", () => {
		expect(() => parseTitleLines(["a".repeat(MAX_TITLE_LENGTH + 1)])).toThrow(/at most/);
	});

	it("accepts max-length lines", () => {
		const line = "a".repeat(MAX_TITLE_LENGTH);
		expect(parseTitleLines([line])).toEqual([line]);
	});
});

describe("parseTitleColors", () => {
	it("returns fallbacks when param missing", () => {
		expect(parseTitleColors(null, 2, "#ffffff", "fill")).toEqual(["#ffffff", "#ffffff"]);
	});

	it("repeats a single color for every line", () => {
		expect(parseTitleColors("#5b647d", 3, "#ffffff", "fill")).toEqual([
			"#5b647d",
			"#5b647d",
			"#5b647d",
		]);
	});

	it("accepts one color per line", () => {
		expect(parseTitleColors("#fff, #000", 2, "#ffffff", "fill")).toEqual(["#fff", "#000"]);
	});

	it("rejects a count mismatch", () => {
		expect(() => parseTitleColors("#fff,#000", 3, "#ffffff", "fill")).toThrow(/1 or 3/);
	});

	it("rejects non-hex colors", () => {
		expect(() => parseTitleColors("red", 1, "#ffffff", "fill")).toThrow(/Invalid fill/);
		expect(() => parseTitleColors("#12345", 1, "#ffffff", "fill")).toThrow(/Invalid fill/);
	});
});

describe("parseTitleBlur", () => {
	it("defaults when missing", () => {
		expect(parseTitleBlur(null)).toBe(4);
	});

	it("accepts bounds", () => {
		expect(parseTitleBlur("0")).toBe(0);
		expect(parseTitleBlur(String(MAX_BLUR))).toBe(MAX_BLUR);
	});

	it("rejects out-of-range and non-integer values", () => {
		expect(() => parseTitleBlur("-1")).toThrow(/between 0 and/);
		expect(() => parseTitleBlur(String(MAX_BLUR + 1))).toThrow(/between 0 and/);
		expect(() => parseTitleBlur("4.5")).toThrow(/between 0 and/);
		expect(() => parseTitleBlur("abc")).toThrow(/between 0 and/);
	});
});

describe("parseTitleFormat", () => {
	it("returns null when missing", () => {
		expect(parseTitleFormat(null)).toBeNull();
		expect(parseTitleFormat("  ")).toBeNull();
	});

	it("accepts the discord preset", () => {
		expect(parseTitleFormat("discord")).toBe("discord");
		expect(parseTitleFormat(" Discord ")).toBe("discord");
	});

	it("rejects unknown formats", () => {
		expect(() => parseTitleFormat("telegram")).toThrow(/Unknown format/);
	});
});

describe("parseTitleLevel", () => {
	it("defaults to 2 when missing", () => {
		expect(parseTitleLevel(null)).toBe(2);
		expect(parseTitleLevel("  ")).toBe(2);
	});

	it("accepts known levels", () => {
		expect(parseTitleLevel("1")).toBe(1);
		expect(parseTitleLevel("2")).toBe(2);
	});

	it("rejects unknown levels", () => {
		expect(() => parseTitleLevel("3")).toThrow(/level expects/);
		expect(() => parseTitleLevel("abc")).toThrow(/level expects/);
	});
});

describe("parseTitleSize", () => {
	it("defaults to the 2x logo strip per line", () => {
		expect(parseTitleSize(null, null, 1, null)).toEqual({ width: 1040, height: 164 });
		expect(parseTitleSize(null, null, 2, null)).toEqual({ width: 1040, height: 328 });
	});

	it("derives height from width when only width is given", () => {
		expect(parseTitleSize("1600", null, 1, null)).toEqual({ width: 1600, height: 252 });
	});

	it("derives width from height when only height is given", () => {
		expect(parseTitleSize(null, "500", 1, null)).toEqual({ width: 3171, height: 500 });
	});

	it("uses the preset defaults", () => {
		expect(parseTitleSize(null, null, 1, DISCORD_TITLE_FORMAT)).toEqual({
			width: DISCORD_TITLE_FORMAT.width,
			height: DISCORD_TITLE_FORMAT.height,
		});
	});

	it("lets explicit values override the preset", () => {
		expect(parseTitleSize("800", "100", 1, DISCORD_TITLE_FORMAT)).toEqual({
			width: 800,
			height: 100,
		});
	});

	it("rejects out-of-range and non-integer sizes", () => {
		expect(() => parseTitleSize("0", null, 1, null)).toThrow(/width expects/);
		expect(() => parseTitleSize(String(MAX_SIZE + 1), null, 1, null)).toThrow(/width expects/);
		expect(() => parseTitleSize(null, "4.5", 1, null)).toThrow(/height expects/);
		expect(() => parseTitleSize(null, "abc", 1, null)).toThrow(/height expects/);
		expect(parseTitleSize(String(MAX_SIZE), String(MAX_SIZE), 1, null)).toEqual({
			width: MAX_SIZE,
			height: MAX_SIZE,
		});
	});
});

describe("parseTitleOverlay", () => {
	const imageBackground = {
		type: "image" as const,
		url: new URL("https://rgd.chat/bg.png"),
		blur: 4,
	};

	it("returns null when missing", () => {
		expect(parseTitleOverlay(null, imageBackground)).toBeNull();
		expect(parseTitleOverlay("  ", imageBackground)).toBeNull();
	});

	it("parses a hex color over an image background", () => {
		expect(parseTitleOverlay("#10141880", imageBackground)).toBe("#10141880");
	});

	it("requires an image background", () => {
		expect(() => parseTitleOverlay("#ffffff", null)).toThrow(/requires an image background/);
		expect(() => parseTitleOverlay("#ffffff", { type: "color", color: "#ffffff" })).toThrow(
			/requires an image background/,
		);
	});

	it("rejects non-hex colors", () => {
		expect(() => parseTitleOverlay("black", imageBackground)).toThrow(/Invalid overlay/);
	});
});

describe("parseTitleBackground", () => {
	it("returns null when missing", () => {
		expect(parseTitleBackground(null, null)).toBeNull();
		expect(parseTitleBackground("  ", null)).toBeNull();
	});

	it("parses a hex color and ignores blur", () => {
		expect(parseTitleBackground("#5b647d", "8")).toEqual({ type: "color", color: "#5b647d" });
	});

	it("rejects invalid colors", () => {
		expect(() => parseTitleBackground("#12345", null)).toThrow(/Invalid background color/);
	});

	it("parses an https image URL with blur", () => {
		expect(parseTitleBackground("https://rgd.chat/bg.png", "8")).toEqual({
			type: "image",
			url: new URL("https://rgd.chat/bg.png"),
			blur: 8,
		});
	});

	it("rejects non-https image URLs", () => {
		expect(() => parseTitleBackground("http://rgd.chat/bg.png", null)).toThrow(/https/);
		expect(() => parseTitleBackground("ftp://rgd.chat/bg.png", null)).toThrow(/https/);
	});

	it("rejects invalid URLs", () => {
		expect(() => parseTitleBackground("not a url", null)).toThrow(/valid URL/);
	});
});
