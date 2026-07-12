import { readFileSync } from "node:fs";
import path from "node:path";

const imagePath = path.resolve(import.meta.dir, "../../../../assets/backgrounds/infernal.webp");
const base64 = readFileSync(imagePath).toString("base64");
const imageDataUrl = `data:image/webp;base64,${base64}`;

export const amount = 666;
export const name = "infernal";

export const cardBackground: Record<string, string> = {
	backgroundImage: `url("${imageDataUrl}")`,
	backgroundSize: "cover",
	backgroundPosition: "top",
};

export default function Theme({ amount, fontSize }: { amount: number; fontSize: number }) {
	return (
		<span
			style={{
				fontSize,
				fontWeight: 800,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				color: "#FFD700",
				textShadow: "0 0 12px rgba(255, 100, 0, 0.6)",
			}}
		>
			Занёс {amount.toLocaleString("ru-RU")} ₽
		</span>
	);
}
