import { HttpError } from "../../lib/utils";

export const MAX_USERNAME_LENGTH = 32;
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 10_000_000;

export function parseAmount(param: string | null): number {
	if (param === null) {
		throw new HttpError(400, "amount is required");
	}

	if (!/^\d+$/.test(param)) {
		throw new HttpError(400, "amount must be a positive integer");
	}

	const value = Number(param);

	if (!Number.isSafeInteger(value)) {
		throw new HttpError(400, "amount is out of range");
	}

	if (value < MIN_AMOUNT) {
		throw new HttpError(400, `amount must be at least ${MIN_AMOUNT}`);
	}

	if (value > MAX_AMOUNT) {
		throw new HttpError(400, `amount must be at most ${MAX_AMOUNT}`);
	}

	return value;
}

export function parseBoolean(param: string | null, defaultVal: boolean): boolean {
	if (param === null) {
		return defaultVal;
	}

	if (param === "1") {
		return true;
	}

	if (param === "0") {
		return false;
	}

	throw new HttpError(400, "is_fee_paid_by_user must be '1' or '0'");
}

export function parseUsername(raw: string | null): string {
	if (raw === null) {
		throw new HttpError(400, "username is required");
	}

	const value = raw.trim();

	if (value.length === 0) {
		throw new HttpError(400, "username must not be empty");
	}

	for (let i = 0; i < value.length; ) {
		const code = value.codePointAt(i);
		if (code !== undefined && (code < 0x20 || code === 0x7f)) {
			throw new HttpError(400, "username contains invalid characters");
		}
		i += code !== undefined && code > 0xffff ? 2 : 1;
	}

	const clusters = Array.from(value);

	if (clusters.length > MAX_USERNAME_LENGTH) {
		throw new HttpError(400, `username must be at most ${MAX_USERNAME_LENGTH} characters`);
	}

	return value;
}
