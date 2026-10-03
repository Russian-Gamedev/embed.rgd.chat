import { extractEmojis } from "@takumi-rs/helpers/emoji";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import ImageResponse from "@takumi-rs/image-response";
import type { BunRequest } from "bun";
import { createCache } from "../lib/cache/cache";
import { ImageLoader } from "../lib/image-loader";
import type { BunServer } from "../lib/types";
import { Color, createLogger, HttpError, JsonResponse } from "../lib/utils";
import { renderer } from "../renderer";

const logger = createLogger("title", Color.green);

// Geometry ported from the original logo SVG (520×82 canvas, viewBox 1511.4419×337.08478):
// font size 164.741 × group scale 1.9935 × viewBox fit 0.2433 ≈ 80px,
// stroke width 8.2484 × same chain = 4px,
// transform = outer rotate(3.6445°) ∘ text matrix(0.92341819, -0.07950592, -0.05504014, 1.0876719).
export const TITLE_WIDTH = 520;
export const TITLE_HEIGHT = 82;
export const TITLE_FONT_SIZE = 80;
export const TITLE_STROKE_WIDTH = 4;
export const MAX_TITLE_LENGTH = 64;
export const MAX_TITLE_LINES = 4;

const DEVICE_PIXEL_RATIO = 2;
const FIT_MARGIN = 0.96;
const MIN_FONT_SIZE = 16;

export const DEFAULT_FILL = "#ffffff";
export const DEFAULT_STROKE = "#5b647d";
export const DEFAULT_BLUR = 4;
export const MAX_BLUR = 32;
export const MIN_SIZE = 16;
export const MAX_SIZE = 4096;
// Discord server title images (1600×252 each):
// level 1  https://cdn.discordapp.com/attachments/504706488368103435/937767919717351464/0-logo.png  — centered full-width logo
// level 2  https://cdn.discordapp.com/attachments/504706488368103435/937767920447156356/1-rules.png — left-aligned, rest of the canvas stays empty
export const DISCORD_TITLE_FORMAT = {
	name: "discord",
	width: 1600,
	height: 252,
	levels: {
		1: { align: "center", leftMarginRatio: 0, fontRatio: 1 },
		2: { align: "left", leftMarginRatio: 0.015625, fontRatio: 0.7 },
	},
} as const;
const TITLE_TRANSFORM = "rotate(-1.276deg) skewX(-7.817deg) scale(0.926834, 1.078886)";
const TITLE_SCALE_X = 0.926834;
// Glyph descenders paint below the line box (lineHeight 1), clipping at the canvas edge;
// shift the whole text block up by this many design px.
export const TITLE_TEXT_RISE = 2;
const TITLE_FONT_FAMILY = "Open Sans Condensed";

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const backgroundImageCache = createCache<Promise<ArrayBuffer>>(600_000);
const backgroundImageLoader = new ImageLoader({
	allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
	cache: backgroundImageCache,
});

export type TitleBackground =
	| { type: "color"; color: string }
	| { type: "image"; url: URL; blur: number };

export interface TitleSize {
	width: number;
	height: number;
}

interface TitleLine {
	text: string;
	fontSize: number;
	fill: string;
	stroke: string;
	margin: string;
	rotate: number;
}

interface TitleProps {
	lines: TitleLine[];
	background: TitleBackground | null;
	overlay: string | null;
	align: "center" | "left";
	leftMargin: number;
	rise: number;
	/** Per-line margins are present: rows pack with their margins and the block centers. */
	packed: boolean;
}

function TitleText({ text, fontSize, fill, stroke }: TitleLine) {
	const strokeWidth = (fontSize / TITLE_FONT_SIZE) * TITLE_STROKE_WIDTH;

	const textStyle = {
		fontFamily: TITLE_FONT_FAMILY,
		fontWeight: 700,
		fontSize,
		lineHeight: 1,
		whiteSpace: "nowrap",
	} as const;

	return (
		<div style={{ position: "relative", display: "flex" }}>
			<span
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					...textStyle,
					color: stroke,
					WebkitTextStroke: `${strokeWidth}px ${stroke}`,
				}}
			>
				{text}
			</span>
			<span style={{ position: "relative", ...textStyle, color: fill }}>{text}</span>
		</div>
	);
}

function BackgroundColor({ color }: { color: string }) {
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				backgroundColor: color,
			}}
		/>
	);
}

function BackgroundImage({
	src,
	blur,
	overlay,
}: {
	src: string;
	blur: number;
	overlay: string | null;
}) {
	// Scale up so the blur doesn't bleed transparency in from the edges.
	const scale = 1 + (blur * 2) / TITLE_HEIGHT;

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				overflow: "hidden",
				// takumi drops `filter` on percent-sized imgs inside absolute wrappers,
				// so the blur has to live on the wrapper itself
				filter: `blur(${blur}px)`,
			}}
		>
			<img
				src={src}
				alt=""
				style={{
					width: "100%",
					height: "100%",
					objectFit: "cover",
					transform: `scale(${scale})`,
				}}
			/>
			{overlay && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: overlay,
					}}
				/>
			)}
		</div>
	);
}

function Title({ lines, background, overlay, align, leftMargin, rise, packed }: TitleProps) {
	const isLeft = align === "left";

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				position: "relative",
				display: "flex",
				overflow: "hidden",
			}}
		>
			{background?.type === "color" && <BackgroundColor color={background.color} />}
			{background?.type === "image" && (
				<BackgroundImage src={background.url.toString()} blur={background.blur} overlay={overlay} />
			)}
			<div
				style={{
					position: "relative",
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: isLeft ? "flex-start" : "center",
					// with per-line margins the block is packed and centered instead of spreading
					justifyContent: packed ? "center" : undefined,
					marginLeft: leftMargin,
					// Pivot on the left edge so the tilt never pushes the left-aligned text down.
					transformOrigin: isLeft ? "left center" : "center",
					transform: `translateY(${-rise}px) ${TITLE_TRANSFORM}`,
				}}
			>
				{lines.map((line) => (
					// biome-ignore lint/correctness/useJsxKeyInIterable: static list, never reordered
					<div
						style={{
							flex: packed ? undefined : 1,
							margin: line.margin,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							transform: line.rotate === 0 ? undefined : `rotate(${line.rotate}deg)`,
						}}
					>
						<TitleText {...line} />
					</div>
				))}
			</div>
		</div>
	);
}

async function measureTitleWidth(text: string, fontSize: number): Promise<number> {
	const { node, stylesheets } = await fromJsx(
		<span
			style={{
				fontFamily: TITLE_FONT_FAMILY,
				fontWeight: 700,
				fontSize,
				lineHeight: 1,
				whiteSpace: "nowrap",
			}}
		>
			{text}
		</span>,
	);
	const measured = await renderer.measure(extractEmojis(node, "twemoji"), { stylesheets });
	return measured.width;
}

/** Largest size ≤ start at which the text still fits the design width. */
async function fitFontSize(text: string, start: number): Promise<number> {
	let fontSize = start;

	while (true) {
		const width = (await measureTitleWidth(text, fontSize)) * TITLE_SCALE_X;
		const available = TITLE_WIDTH * FIT_MARGIN;

		if (width <= available) {
			return fontSize;
		}

		const next = Math.floor(fontSize * (available / width));
		if (next < MIN_FONT_SIZE || next >= fontSize) {
			throw new HttpError(400, "Title text is too long");
		}
		fontSize = next;
	}
}

/** Per-line font size; a single value applies to every line. */
export function parseTitleFontSize(raw: string | null, count: number): number[] | null {
	if (raw === null || raw.trim() === "") {
		return null;
	}

	const parts = raw.split(",").map((part) => part.trim());
	const sizes = parts.length === 1 ? Array.from({ length: count }, () => parts[0] ?? "") : parts;
	if (sizes.length !== count) {
		throw new HttpError(400, `font_size expects 1 or ${count} comma-separated sizes`);
	}
	for (const size of sizes) {
		const value = Number(size);
		if (!Number.isInteger(value) || value < 8 || value > 400) {
			throw new HttpError(400, "font_size expects integers between 8 and 400");
		}
	}
	return sizes.map((size) => Number(size));
}

export interface TitleMargin {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

/** Per-line margins; semicolon-separated lines, each a 1-4 integer CSS shorthand. */
export function parseTitleMargins(raw: string | null, count: number): TitleMargin[] | null {
	if (raw === null || raw.trim() === "") {
		return null;
	}

	const parts = raw.split(";").map((part) => part.trim());
	const margins = parts.length === 1 ? Array.from({ length: count }, () => parts[0] ?? "") : parts;
	if (margins.length !== count) {
		throw new HttpError(400, `margin expects 1 or ${count} semicolon-separated values`);
	}
	return margins.map(parseMarginShorthand);
}

function parseMarginShorthand(part: string): TitleMargin {
	const values = part
		.split(/[\s,]+/)
		.filter((value) => value !== "")
		.map((value) => Number(value));
	if (
		values.length < 1 ||
		values.length > 4 ||
		values.some((value) => !Number.isInteger(value) || value < -500 || value > 500)
	) {
		throw new HttpError(400, "margin expects 1-4 integers between -500 and 500 per line");
	}
	// CSS shorthand expansion: all / vertical horizontal / top horizontal bottom / t r b l
	const top = values[0] ?? 0;
	const right = values[1] ?? top;
	const bottom = values[2] ?? top;
	const left = values[3] ?? right;
	return { top, right, bottom, left };
}

function formatTitleMargin(margin: TitleMargin | undefined): string {
	return margin === undefined
		? "0px"
		: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`;
}

/** Per-line extra rotation in degrees; a single value applies to every line. */
export function parseTitleRotate(raw: string | null, count: number): number[] | null {
	if (raw === null || raw.trim() === "") {
		return null;
	}

	const parts = raw.split(",").map((part) => part.trim());
	const angles = parts.length === 1 ? Array.from({ length: count }, () => parts[0] ?? "") : parts;
	if (angles.length !== count) {
		throw new HttpError(400, `rotate expects 1 or ${count} comma-separated angles`);
	}
	for (const angle of angles) {
		const value = Number(angle);
		if (!Number.isFinite(value) || Math.abs(value) > 45) {
			throw new HttpError(400, "rotate expects numbers between -45 and 45");
		}
	}
	return angles.map((angle) => Number(angle));
}

export function parseTitleLines(texts: string[]): string[] {
	const lines = texts
		.flatMap((text) => text.split("\n"))
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		throw new HttpError(400, "Title text is required");
	}
	if (lines.length > MAX_TITLE_LINES) {
		throw new HttpError(400, `At most ${MAX_TITLE_LINES} title lines are allowed`);
	}
	for (const line of lines) {
		if (line.length > MAX_TITLE_LENGTH) {
			throw new HttpError(400, `Title line must be at most ${MAX_TITLE_LENGTH} characters`);
		}
	}

	return lines;
}

export function parseTitleColors(
	raw: string | null,
	count: number,
	fallback: string,
	name: string,
): string[] {
	if (raw === null || raw.trim() === "") {
		return Array.from({ length: count }, () => fallback);
	}

	const parts = raw.split(",").map((part) => part.trim());
	const colors = parts.length === 1 ? Array.from({ length: count }, () => parts[0] ?? "") : parts;

	if (colors.length !== count) {
		throw new HttpError(400, `${name} expects 1 or ${count} comma-separated colors`);
	}
	for (const color of colors) {
		if (!HEX_COLOR.test(color)) {
			throw new HttpError(400, `Invalid ${name} color: expected a hex color like ${fallback}`);
		}
	}

	return colors;
}

export function parseTitleBlur(raw: string | null): number {
	if (raw === null || raw.trim() === "") {
		return DEFAULT_BLUR;
	}

	const blur = Number(raw);
	if (!Number.isInteger(blur) || blur < 0 || blur > MAX_BLUR) {
		throw new HttpError(400, `blur expects an integer between 0 and ${MAX_BLUR}`);
	}
	return blur;
}

export function parseTitleBackground(
	raw: string | null,
	blur: string | null,
): TitleBackground | null {
	if (raw === null || raw.trim() === "") {
		return null;
	}

	const value = raw.trim();

	if (value.startsWith("#")) {
		if (!HEX_COLOR.test(value)) {
			throw new HttpError(400, "Invalid background color: expected a hex color");
		}
		return { type: "color", color: value };
	}

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new HttpError(400, "background is not a valid URL");
	}
	if (!backgroundImageLoader.isAllowed(url)) {
		throw new HttpError(400, "Background image URL must use https");
	}

	return { type: "image", url, blur: parseTitleBlur(blur) };
}

export function parseTitleOverlay(
	raw: string | null,
	background: TitleBackground | null,
): string | null {
	if (raw === null || raw.trim() === "") {
		return null;
	}
	if (background?.type !== "image") {
		throw new HttpError(400, "overlay requires an image background");
	}

	const color = raw.trim();
	if (!HEX_COLOR.test(color)) {
		throw new HttpError(400, "Invalid overlay color: expected a hex color");
	}
	return color;
}

export function parseTitleFormat(raw: string | null): string | null {
	if (raw === null || raw.trim() === "") {
		return null;
	}

	const format = raw.trim().toLowerCase();
	if (format !== DISCORD_TITLE_FORMAT.name) {
		throw new HttpError(400, `Unknown format: expected "${DISCORD_TITLE_FORMAT.name}"`);
	}
	return format;
}

export function parseTitleLevel(raw: string | null): keyof typeof DISCORD_TITLE_FORMAT.levels {
	if (raw === null || raw.trim() === "") {
		return 2;
	}

	const level = Number(raw);
	if (!Number.isInteger(level) || !(level in DISCORD_TITLE_FORMAT.levels)) {
		const levels = Object.keys(DISCORD_TITLE_FORMAT.levels).join(", ");
		throw new HttpError(400, `level expects one of: ${levels}`);
	}
	return level as 1 | 2;
}

function parseSize(raw: string | null, name: string, fallback: number): number {
	if (raw === null || raw.trim() === "") {
		return fallback;
	}

	const value = Number(raw);
	if (!Number.isInteger(value) || value < MIN_SIZE || value > MAX_SIZE) {
		throw new HttpError(400, `${name} expects an integer between ${MIN_SIZE} and ${MAX_SIZE}`);
	}
	return value;
}

export function parseTitleSize(
	widthRaw: string | null,
	heightRaw: string | null,
	lines: number,
	preset: TitleSize | null,
): TitleSize {
	const aspect = TITLE_WIDTH / (TITLE_HEIGHT * lines);
	const _hasWidth = widthRaw !== null && widthRaw.trim() !== "";
	const hasHeight = heightRaw !== null && heightRaw.trim() !== "";

	const width = parseSize(
		widthRaw,
		"width",
		hasHeight
			? Math.round(Number(heightRaw) * aspect)
			: (preset?.width ?? TITLE_WIDTH * DEVICE_PIXEL_RATIO),
	);
	const height = parseSize(heightRaw, "height", preset?.height ?? Math.round(width / aspect));

	return { width, height };
}

async function resolveTitleBackground(
	background: TitleBackground | null,
): Promise<TitleBackground | null> {
	if (background?.type !== "image") {
		return background;
	}

	try {
		// Pre-populate the cache shared with ImageResponse so takumi never fetches itself.
		await backgroundImageLoader.load(background.url);
	} catch {
		throw new HttpError(400, "Failed to load background image");
	}

	return background;
}

/** Query params renderTitle reads; the S3 cache key is built from these only. */
export const QUERY_PARAMS: ReadonlySet<string> = new Set([
	"text",
	"fill",
	"stroke",
	"format",
	"background",
	"blur",
	"overlay",
	"width",
	"height",
	"font_size",
	"margin",
	"rotate",
	"level",
]);

export async function renderTitle(request: BunRequest, _server: BunServer) {
	try {
		const url = new URL(request.url);
		const texts = parseTitleLines(url.searchParams.getAll("text"));
		const fill = parseTitleColors(url.searchParams.get("fill"), texts.length, DEFAULT_FILL, "fill");
		const stroke = parseTitleColors(
			url.searchParams.get("stroke"),
			texts.length,
			DEFAULT_STROKE,
			"stroke",
		);
		const format = parseTitleFormat(url.searchParams.get("format"));
		const background = parseTitleBackground(
			url.searchParams.get("background"),
			url.searchParams.get("blur"),
		);
		if (format !== null && background !== null) {
			throw new HttpError(400, "Background is not allowed in the discord title format");
		}
		const overlay = parseTitleOverlay(url.searchParams.get("overlay"), background);
		const resolvedBackground = await resolveTitleBackground(background);
		const size = parseTitleSize(
			url.searchParams.get("width"),
			url.searchParams.get("height"),
			texts.length,
			format === null ? null : DISCORD_TITLE_FORMAT,
		);
		const fontSize = parseTitleFontSize(url.searchParams.get("font_size"), texts.length);
		const margins = parseTitleMargins(url.searchParams.get("margin"), texts.length);
		const rotate = parseTitleRotate(url.searchParams.get("rotate"), texts.length);
		const fontSizes = await Promise.all(
			texts.map((text, index) => fitFontSize(text, fontSize?.[index] ?? TITLE_FONT_SIZE)),
		);

		// Layout space is size / devicePixelRatio; design units are TITLE_WIDTH wide.
		const scale = size.width / DEVICE_PIXEL_RATIO / TITLE_WIDTH;

		const level = parseTitleLevel(url.searchParams.get("level"));
		const discordStyle = format === null ? null : DISCORD_TITLE_FORMAT.levels[level];
		const align = discordStyle?.align ?? "center";
		const leftMargin =
			align === "left"
				? Math.round((size.width / DEVICE_PIXEL_RATIO) * (discordStyle?.leftMarginRatio ?? 0))
				: 0;
		const lines: TitleLine[] = texts.map((text, index) => ({
			text,
			fontSize: (fontSizes[index] ?? TITLE_FONT_SIZE) * scale * (discordStyle?.fontRatio ?? 1),
			fill: fill[index] ?? DEFAULT_FILL,
			stroke: stroke[index] ?? DEFAULT_STROKE,
			margin: formatTitleMargin(margins?.[index]),
			rotate: rotate?.[index] ?? 0,
		}));

		return new ImageResponse(
			<Title
				lines={lines}
				background={resolvedBackground}
				overlay={overlay}
				align={align}
				leftMargin={leftMargin}
				rise={TITLE_TEXT_RISE * scale}
				packed={margins !== null}
			/>,
			{
				width: size.width,
				height: size.height,
				format: "webp",
				renderer,
				images: { fetchCache: backgroundImageCache },
				onError: (error: unknown) => {
					logger("Render failed: %o", error);
				},
				devicePixelRatio: DEVICE_PIXEL_RATIO,
			},
		);
	} catch (error: unknown) {
		if (error instanceof HttpError) {
			return new JsonResponse({ error: error.message }, { status: error.statusCode });
		}

		throw error;
	}
}
