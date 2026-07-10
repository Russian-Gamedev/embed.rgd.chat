import path from "node:path";
import type { Renderer } from "@takumi-rs/core";
import { googleFonts } from "@takumi-rs/helpers";
import { Color, createLogger } from "./utils";

const logger = createLogger("fonts", Color.yellow);

export async function registerFonts(renderer: Renderer) {
	const localFonts = ["Ginto Regular.ttf"];

	await Promise.all(
		localFonts.map(async (fontPath) => {
			logger(`Loading local font: ${fontPath}`);
			const data = await Bun.file(path.resolve("assets/fonts", fontPath)).arrayBuffer();
			const name = path.basename(fontPath, path.extname(fontPath)).split(/[- ]/)[0];
			await renderer.registerFont({ name, data });
		}),
	);

	logger("Loading Google Font: Mulish");
	const mulishFonts = await googleFonts({
		families: [
			{
				name: "Mulish",
				weight: [200, 300, 400, 500, 600, 700, 800, 900],
				style: ["normal", "italic"],
			},
		],
		display: "swap",
	});

	await Promise.all(mulishFonts.map((font) => renderer.registerFont(font)));
	logger(`Registered ${mulishFonts.length} Mulish subsets`);
}
