import { formatRubles } from "../../../lib/utils";

export const amount = 42000;
export const name = "answer";

export default function Theme({ amount, fontSize }: { amount: number; fontSize: number }) {
	return (
		<span
			style={{
				fontSize,
				fontWeight: 800,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				background: "linear-gradient(135deg, #00FFFF, #8A2BE2, #4B0082)",
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
