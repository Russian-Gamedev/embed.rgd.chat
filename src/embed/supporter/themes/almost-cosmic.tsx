import { formatRubles } from "../../../lib/utils";

export const amount = 9999;
export const name = "almost-cosmic";

export default function Theme({ amount, fontSize }: { amount: number; fontSize: number }) {
	return (
		<span
			style={{
				fontSize,
				fontWeight: 800,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				background: "linear-gradient(135deg, #FF00CC, #3333FF, #00F5FF)",
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
