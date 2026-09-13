import { extractEmojis } from "@takumi-rs/helpers/emoji";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import { formatRubles } from "../../lib/utils";
import { renderer } from "../../renderer";
import type { DonationTheme } from "./config";
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

async function measureNodeWidth(
	node: React.ReactNode,
	style: React.CSSProperties,
): Promise<number> {
	const { node: converted, stylesheets } = await fromJsx(
		<span style={{ fontFamily: "Mulish", whiteSpace: "nowrap", ...style }}>{node}</span>,
	);
	const measured = await renderer.measure(extractEmojis(converted, "twemoji"), { stylesheets });
	return measured.width;
}

async function measureFeePaidWidth(): Promise<number> {
	return measureNodeWidth("и оплатил коммисию ❤️", {
		fontSize: FEE_PAID_FONT_SIZE,
		fontWeight: 500,
	});
}

async function measureAmountWidth(
	donationTheme: DonationTheme,
	amount: number,
	fontSize: number,
): Promise<number> {
	if (donationTheme?.Theme) {
		const { node, stylesheets } = await fromJsx(
			<donationTheme.Theme amount={amount} fontSize={fontSize} />,
		);
		const measured = await renderer.measure(extractEmojis(node, "twemoji"), { stylesheets });
		return measured.width;
	}

	return measureNodeWidth(`Занёс ${formatRubles(amount)}`, { fontSize, fontWeight: 800 });
}

export async function calculateTextLayout(
	viewModel: SupporterCardViewModel,
	donationTheme: DonationTheme,
): Promise<TextLayout> {
	let usernameFs = USERNAME_FONT_SIZE_MAX;
	let amountFs = AMOUNT_FONT_SIZE_MAX;

	while (true) {
		const [uWidth, aWidth] = await Promise.all([
			measureNodeWidth(viewModel.username, { fontSize: usernameFs, fontWeight: 700 }),
			measureAmountWidth(donationTheme, viewModel.amount, amountFs),
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
