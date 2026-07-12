import { describe, expect, it } from "bun:test";
import { donationGrades } from "../src/embed/supporter/config";
import { renderSupporterCard } from "../src/embed/supporter/supporter-card";
import { exactDonationThemes } from "../src/embed/supporter/themes";
import { request } from "./utils";

const buildUrl = (params: Record<string, unknown>) => {
	const url = new URL("https://embed.rgd.chat");
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, String(value));
	}
	return url;
};

describe("render various grade", async () => {
	for (const grade of donationGrades) {
		it(`must render ${grade.name}`, async () => {
			const params = {
				username: "damirlut",
				avatar_url:
					"https://cdn.discordapp.com/avatars/357130048882343937/370c199a417adb97f787db65b4becbbe.webp?size=1024",
				amount: grade.minAmount,
			};
			const url = buildUrl(params);
			const name = `supporter/${grade.name}`;
			const data = await request(renderSupporterCard, { url }, name);
			expect(data.status).toBe(200);
		});
	}
});

describe("render various exact theme", async () => {
	for (const theme of exactDonationThemes) {
		it(`must render ${theme.name} (${theme.amount})`, async () => {
			const params = {
				username: "damirlut",
				avatar_url:
					"https://cdn.discordapp.com/avatars/357130048882343937/370c199a417adb97f787db65b4becbbe.webp?size=1024",
				amount: theme.amount,
			};
			const url = buildUrl(params);
			const name = `supporter/exact/${theme.name}`;
			const data = await request(renderSupporterCard, { url }, name);
			expect(data.status).toBe(200);
		});
	}
});
