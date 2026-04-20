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
