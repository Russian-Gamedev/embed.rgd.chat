export const amount = 777;
export const name = "jackpot";

const Text = ({ children, fontSize }: { children: string; fontSize: number }) => (
	<span
		style={{
			fontSize,
			fontWeight: 800,
			fontFamily: "Mulish",
			whiteSpace: "nowrap",
			background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
			backgroundClip: "text",
			WebkitBackgroundClip: "text",
			color: "transparent",
			WebkitTextFillColor: "transparent",
		}}
	>
		{children}
	</span>
);

export default function Theme({ fontSize }: { amount: number; fontSize: number }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
			<Text fontSize={fontSize}>Занёс</Text>
			<span style={{ fontSize: fontSize * 1.5 }}>🎰</span>
			<Text fontSize={fontSize}>₽</Text>
		</div>
	);
}
