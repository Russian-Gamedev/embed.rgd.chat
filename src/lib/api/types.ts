export interface InviteInfo {
	code: string;
	title: string;
	description: string | null;
	memberCount: number;
	presenceCount: number;
	expiresAt: string | null;
	url: string;
	icon_url: string;
	banner_url: string | null;
}

export type User = {
	id: string;
	username: string;
	nickname: string | null;
	avatarUrl: string;
	about: string | null;
	banner: string | null;
	bannerAlt: string | null;
	bannerColor: string;
	birthDate: string | null;
	firstJoinedAt: string;
	lastActiveAt: string;
	activeStreak: number;
	maxActiveStreak: number;
	tags: UserTag[];
};

export type UserTag = {
	background: string;
	color: string;
	name: string;
	description: string;
};
