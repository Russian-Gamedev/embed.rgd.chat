import { readFileSync } from "node:fs";
import image from "../../../../assets/backgrounds/cosmic.webp";
import { formatRubles } from "../../../lib/utils";

const base64 = readFileSync(image).toString("base64");
const imageDataUrl = `data:image/webp;base64,${base64}`;

export default function CosmicGradeTheme({
	amount,
	fontSize,
}: {
	amount: number;
	fontSize: number;
}) {
	return (
		<span
			style={{
				fontSize,
				fontWeight: 800,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				backgroundImage: `url("${imageDataUrl}")`,
				backgroundSize: "100%",
				backgroundPosition: "center",
				backgroundClip: "text",
				WebkitBackgroundClip: "text",
				color: "transparent",
				WebkitTextFillColor: "transparent",
			}}
		>
			Занёс {formatRubles(amount)}
		</span>
	);
}
