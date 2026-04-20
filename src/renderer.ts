import { Renderer } from "@takumi-rs/core";
import type { fromJsx } from "@takumi-rs/helpers/jsx";
import path from "path";
import { Color, createLogger } from "./utils";

export interface ImageRendererNode {
  node: Awaited<ReturnType<typeof fromJsx>>;
  height: number;
  width: number;
}
const fonts = ["Ginto Regular.ttf", "Mulish-Medium.ttf"];

const logger = createLogger("renderer", Color.yellow);

const loadedFonts = await Promise.all(
  fonts.map(async (fontPath) => {
    logger(`Loading font: ${fontPath}`);
    const data = await Bun.file(
      path.resolve("assets/fonts", fontPath),
    ).arrayBuffer();
    const name = path
      .basename(fontPath, path.extname(fontPath))
      /// split by space or hyphen and take first part
      .split(/[- ]/)[0];
    return { name, data };
  }),
);

export const renderer = new Renderer({ fonts: loadedFonts });
