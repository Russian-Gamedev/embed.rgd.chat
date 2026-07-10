import { Renderer } from "@takumi-rs/core";
import { registerFonts } from "./lib/register-fonts";
import { Color, createLogger } from "./lib/utils";

const logger = createLogger("renderer", Color.yellow);

export const renderer = new Renderer();

logger("Registering fonts...");
await registerFonts(renderer);
logger("Fonts registered");
