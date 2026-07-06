import { Renderer } from "@takumi-rs/core";
import { Color, createLogger } from "./lib/utils";
import { registerFonts } from "./lib/register-fonts";

const logger = createLogger("renderer", Color.yellow);

export const renderer = new Renderer();

logger("Registering fonts...");
await registerFonts(renderer);
logger("Fonts registered");
