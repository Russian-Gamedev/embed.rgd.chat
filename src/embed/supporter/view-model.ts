import type { ImageLoader } from "../../lib/image-loader";
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
	readonly amount: number;
	readonly avatarSrc: string;
	readonly showFeePaidText: boolean;
}

/** Query params parseSupporterCardInput reads; the S3 cache key is built from these only. */
export const QUERY_PARAMS: ReadonlySet<string> = new Set([
	"username",
	"amount",
	"avatar_url",
	"is_fee_paid_by_user",
]);

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
		amount: input.amount,
		avatarSrc,
		showFeePaidText: input.isFeePaidByUser,
	};
}
