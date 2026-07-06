import path from "node:path";
import { Renderer } from "@takumi-rs/core";
import { Color, createLogger } from "./utils";

const fonts = ["Ginto Regular.ttf", "Mulish-Medium.ttf"];

const logger = createLogger("renderer", Color.yellow);

export const renderer = new Renderer();

await Promise.all(
	fonts.map(async (fontPath) => {
		logger(`Loading font: ${fontPath}`);
		const data = await Bun.file(path.resolve("assets/fonts", fontPath)).arrayBuffer();
		const name = path
			.basename(fontPath, path.extname(fontPath))
			/// split by space or hyphen and take first part
			.split(/[- ]/)[0];
		await renderer.registerFont({ name, data });
	}),
);
