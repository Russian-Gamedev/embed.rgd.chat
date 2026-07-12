import type { FC } from "react";
import AlmostCosmicTheme, {
	amount as almostCosmicAmount,
	name as almostCosmicName,
} from "./almost-cosmic";
import AnswerTheme, { amount as answerAmount, name as answerName } from "./answer";
import InfernalTheme, {
	amount as infernalAmount,
	cardBackground as infernalCardBackground,
	name as infernalName,
} from "./infernal";
import JackpotTheme, { amount as jackpotAmount, name as jackpotName } from "./jackpot";
import NiceTheme, { amount as niceAmount, name as niceName } from "./nice";
import NotFoundTheme, { amount as notFoundAmount, name as notFoundName } from "./not-found";

export interface ExactDonationTheme {
	amount: number;
	name: string;
	Theme: FC<{ amount: number; fontSize: number }>;
	cardBackground?: Record<string, string>;
	CardOverlay?: () => JSX.Element;
}

export const exactDonationThemes: ExactDonationTheme[] = [
	{ amount: niceAmount, name: niceName, Theme: NiceTheme },
	{ amount: notFoundAmount, name: notFoundName, Theme: NotFoundTheme },
	{
		amount: infernalAmount,
		name: infernalName,
		Theme: InfernalTheme,
		cardBackground: infernalCardBackground,
	},
	{ amount: jackpotAmount, name: jackpotName, Theme: JackpotTheme },
	{ amount: almostCosmicAmount, name: almostCosmicName, Theme: AlmostCosmicTheme },
	{ amount: answerAmount, name: answerName, Theme: AnswerTheme },
];

export const exactDonationThemeByAmount: Record<number, ExactDonationTheme> = {
	[niceAmount]: { amount: niceAmount, name: niceName, Theme: NiceTheme },
	[notFoundAmount]: { amount: notFoundAmount, name: notFoundName, Theme: NotFoundTheme },
	[infernalAmount]: {
		amount: infernalAmount,
		name: infernalName,
		Theme: InfernalTheme,
		cardBackground: infernalCardBackground,
	},
	[jackpotAmount]: { amount: jackpotAmount, name: jackpotName, Theme: JackpotTheme },
	[almostCosmicAmount]: {
		amount: almostCosmicAmount,
		name: almostCosmicName,
		Theme: AlmostCosmicTheme,
	},
	[answerAmount]: { amount: answerAmount, name: answerName, Theme: AnswerTheme },
};
