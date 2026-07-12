import { formatRubles } from "../../../lib/utils";

export const amount = 69;
export const name = "nice";

export default function Theme({ amount, fontSize }: { amount: number; fontSize: number }) {
	return (
		<span
			style={{
				fontSize,
				fontWeight: 800,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				background: "linear-gradient(135deg, #FF69B4, #FF1493)",
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
