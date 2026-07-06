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
	avatar_url: string;
	about: string | null;
	banner: string | null;
	banner_alt: string | null;
	banner_color: string;
	birth_date: string | null;
	first_joined_at: string;
	last_active_at: string;
	active_streak: number;
	max_active_streak: number;
	tags: UserTag[];
};

export type UserTag = {
	background: string;
	color: string;
	name: string;
	description: string;
};
