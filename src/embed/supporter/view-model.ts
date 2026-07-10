import type { ImageLoader } from "../../lib/image-loader";
import { formatRubles } from "../../lib/utils";
import { parseAvatarUrl } from "./avatar";
import { parseAmount, parseBoolean, parseUsername } from "./validation";

export interface SupporterCardInput {
	readonly username: string;
	readonly amount: number;
	readonly avatarUrl: URL | null;
	readonly isFeePaidByUser: boolean;
}

export interface SupporterCardViewModel {
	readonly username: string;
	readonly amountText: string;
	readonly avatarSrc: string;
	readonly showFeePaidText: boolean;
}

export function parseSupporterCardInput(url: URL, imageLoader: ImageLoader): SupporterCardInput {
	const username = parseUsername(url.searchParams.get("username"));
	const amount = parseAmount(url.searchParams.get("amount"));
	const avatarUrl = parseAvatarUrl(url.searchParams.get("avatar_url"), imageLoader);
	const isFeePaidByUser = parseBoolean(url.searchParams.get("is_fee_paid_by_user"), false);

	return { username, amount, avatarUrl, isFeePaidByUser };
}

export function createSupporterCardViewModel(
	input: SupporterCardInput,
	avatarSrc: string,
): SupporterCardViewModel {
	return {
		username: input.username,
		amountText: `Занёс ${formatRubles(input.amount)}`,
		avatarSrc,
		showFeePaidText: input.isFeePaidByUser,
	};
}
