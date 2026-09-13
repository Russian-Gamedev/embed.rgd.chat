import { describe, expect, it } from "bun:test";
import { donationGrades } from "../src/embed/supporter/config";
import { renderSupporterCard } from "../src/embed/supporter/supporter-card";
import { exactDonationThemes } from "../src/embed/supporter/themes";
import { request } from "./utils";

const USERNAME = "damirlut";
const AVATAR_URL =
	"https://cdn.discordapp.com/avatars/357130048882343937/370c199a417adb97f787db65b4becbbe.webp?size=1024";

const feeVariants = [
	{ label: "", isFeePaidByUser: false },
	{ label: "-fee-paid", isFeePaidByUser: true },
];

const buildUrl = (params: Record<string, unknown>) => {
	const url = new URL("https://embed.rgd.chat");
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, String(value));
	}
	return url;
};

describe("render various grade", async () => {
	for (const grade of donationGrades) {
		for (const fee of feeVariants) {
			it(`must render ${grade.name}${fee.label}`, async () => {
				const params: Record<string, unknown> = {
					username: USERNAME,
					avatar_url: AVATAR_URL,
					amount: grade.minAmount,
				};
				if (fee.isFeePaidByUser) {
					params.is_fee_paid_by_user = 1;
				}
				const url = buildUrl(params);
				const name = `supporter/${grade.name}${fee.label}`;
				const data = await request(renderSupporterCard, { url }, name);
				expect(data.status).toBe(200);
			});
		}
	}
});

describe("render various exact theme", async () => {
	for (const theme of exactDonationThemes) {
		for (const fee of feeVariants) {
			it(`must render ${theme.name} (${theme.amount})${fee.label}`, async () => {
				const params: Record<string, unknown> = {
					username: USERNAME,
					avatar_url: AVATAR_URL,
					amount: theme.amount,
				};
				if (fee.isFeePaidByUser) {
					params.is_fee_paid_by_user = 1;
				}
				const url = buildUrl(params);
				const name = `supporter/exact/${theme.name}${fee.label}`;
				const data = await request(renderSupporterCard, { url }, name);
				expect(data.status).toBe(200);
			});
		}
	}
});

describe("avatar fallback", () => {
	it("must render blobatar when avatar_url is missing", async () => {
		const url = buildUrl({ username: USERNAME, amount: 100 });
		const data = await request(renderSupporterCard, { url }, "supporter/fallback/no-avatar");
		expect(data.status).toBe(200);
	});

	it("must render blobatar when avatar_url is broken", async () => {
		const url = buildUrl({
			username: USERNAME,
			amount: 100,
			avatar_url: "https://cdn.discordapp.com/avatars/0/missing.webp?size=1024",
		});
		const data = await request(renderSupporterCard, { url }, "supporter/fallback/broken-avatar");
		expect(data.status).toBe(200);
	});
});
