import type { FC } from "react";
import { exactDonationThemeByAmount } from "./themes";
import CosmicGradeTheme from "./themes/cosmic-grade";

export interface DonationGrade {
	minAmount: number;
	name: string;
	gradient: string;
	Theme?: FC<{ amount: number; fontSize: number }>;
	cardBackground?: Record<string, string>;
	CardOverlay?: () => JSX.Element;
}

export const donationGrades: DonationGrade[] = [
	{
		minAmount: 10_000,
		name: "cosmic",
		gradient: "linear-gradient(135deg, #FF00CC, #3333FF, #00F5FF)",
		Theme: CosmicGradeTheme,
	},
	{
		minAmount: 5_000,
		name: "diamond",
		gradient: "linear-gradient(135deg, #00C6FF, #B2FEFA)",
	},
	{
		minAmount: 2_500,
		name: "amethyst",
		gradient: "linear-gradient(135deg, #7F00FF, #E100FF)",
	},
	{
		minAmount: 1_000,
		name: "ruby",
		gradient: "linear-gradient(135deg, #FF416C, #FF1744)",
	},
	{
		minAmount: 500,
		name: "amber",
		gradient: "linear-gradient(135deg, #FF5F00, #FFB000)",
	},
	{
		minAmount: 250,
		name: "gold",
		gradient: "linear-gradient(135deg, #FFB300, #FFF176)",
	},
	{
		minAmount: 100,
		name: "silver",
		gradient: "linear-gradient(135deg, #8E9EAB, #EEF2F3)",
	},
	{
		minAmount: 50,
		name: "bronze",
		gradient: "linear-gradient(135deg, #B87333, #F0A45D)",
	},
];

export function getDonationTheme(amount: number) {
	const exactTheme = exactDonationThemeByAmount[amount];

	if (exactTheme) {
		return {
			type: "event" as const,
			name: exactTheme.name,
			Theme: exactTheme.Theme,
			cardBackground: exactTheme.cardBackground,
			CardOverlay: exactTheme.CardOverlay,
		};
	}

	const grade = donationGrades.find(({ minAmount }) => amount >= minAmount);

	return grade
		? {
				type: "grade" as const,
				...grade,
			}
		: null;
}
