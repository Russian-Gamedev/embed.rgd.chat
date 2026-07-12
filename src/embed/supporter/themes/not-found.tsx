export const amount = 404;
export const name = "not-found";

export default function Theme({ amount, fontSize }: { amount: number; fontSize: number }) {
	const numberText = amount.toLocaleString("ru-RU");

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
			<span style={{ fontSize, fontWeight: 800, fontFamily: "Mulish", color: "#f2f3f5" }}>
				Занёс
			</span>
			<span
				style={{
					fontSize,
					fontWeight: 800,
					fontFamily: "Mulish",
					whiteSpace: "nowrap",
					position: "relative",
					color: "#f2f3f5",
					transform: "skewX(-0.5deg)",
					textShadow: "2px 0 0 #ff0040, -2px 0 0 #00ffff, 4px 1px 0 #ff0040, -3px -1px 0 #00ffff",
				}}
			>
				{numberText}
			</span>
			<span style={{ fontSize, fontWeight: 800, fontFamily: "Mulish", color: "#f2f3f5" }}>₽</span>
		</div>
	);
}
