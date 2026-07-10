import { fromJsx } from "@takumi-rs/helpers/jsx";
import { renderer } from "../../renderer";
import type { SupporterCardViewModel } from "./view-model";

export const CARD_WIDTH = 565;
export const CARD_HEIGHT = 95;
export const AVATAR_SIZE = 94;
export const CARD_RIGHT_PADDING = 24;
export const CONTENT_GAP = 20;

export const USERNAME_FONT_SIZE_MAX = 28;
export const USERNAME_FONT_SIZE_MIN = 14;
export const AMOUNT_FONT_SIZE_MAX = 34;
export const AMOUNT_FONT_SIZE_MIN = 18;
export const FEE_PAID_FONT_SIZE = 12;

const TEXT_AREA_AVAILABLE =
	CARD_WIDTH - CARD_RIGHT_PADDING - AVATAR_SIZE - CONTENT_GAP - CONTENT_GAP;

export interface TextLayout {
	readonly usernameFontSize: number;
	readonly amountFontSize: number;
	readonly showFeePaidText: boolean;
}

async function measureElementWidth(
	children: React.ReactNode,
	style: React.CSSProperties,
): Promise<number> {
	const { node, stylesheets } = await fromJsx(
		<span style={{ fontFamily: "Mulish", whiteSpace: "nowrap", ...style }}>{children}</span>,
	);
	const measured = await renderer.measure(node, { stylesheets });
	return measured.width;
}

function measureFeePaidWidth(): Promise<number> {
	return measureElementWidth("и оплатил коммисию ❤", {
		fontSize: FEE_PAID_FONT_SIZE,
		fontWeight: 500,
	});
}

export async function calculateTextLayout(viewModel: SupporterCardViewModel): Promise<TextLayout> {
	let usernameFs = USERNAME_FONT_SIZE_MAX;
	let amountFs = AMOUNT_FONT_SIZE_MAX;

	while (true) {
		const [uWidth, aWidth] = await Promise.all([
			measureElementWidth(viewModel.username, { fontSize: usernameFs, fontWeight: 700 }),
			measureElementWidth(viewModel.amountText, { fontSize: amountFs, fontWeight: 800 }),
		]);

		let totalWidth: number;

		if (viewModel.showFeePaidText) {
			const fWidth = await measureFeePaidWidth();
			totalWidth = uWidth + CONTENT_GAP + Math.max(aWidth, fWidth);
		} else {
			totalWidth = uWidth + CONTENT_GAP + aWidth;
		}

		if (totalWidth <= TEXT_AREA_AVAILABLE) {
			return {
				usernameFontSize: usernameFs,
				amountFontSize: amountFs,
				showFeePaidText: viewModel.showFeePaidText,
			};
		}

		if (usernameFs > USERNAME_FONT_SIZE_MIN || amountFs > AMOUNT_FONT_SIZE_MIN) {
			const scale = TEXT_AREA_AVAILABLE / totalWidth;
			const newUsernameFs = Math.max(USERNAME_FONT_SIZE_MIN, Math.floor(usernameFs * scale));
			const newAmountFs = Math.max(AMOUNT_FONT_SIZE_MIN, Math.floor(amountFs * scale));

			usernameFs = Math.min(usernameFs - 1, newUsernameFs);
			amountFs = Math.min(amountFs - 1, newAmountFs);
			continue;
		}

		throw new Error("Layout cannot fit: text exceeds available width at minimum font size");
	}
}
