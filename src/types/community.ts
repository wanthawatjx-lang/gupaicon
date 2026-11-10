export type BuddyPostKind = 'looking_for_buddy' | 'have_extra_ticket' | 'need_ticket';
export type BuddyPostStatus = 'open' | 'closed';

export const AVATAR_EMOJIS = [
  '🎸', '🥁', '🎤', '🎷', '🎹', '🎧', '⚡', '📻', '🎟️', '🕶️', '🤘', '🐱', '🦊', '🐻', '👽', '🚀'
] as const;

export type AvatarEmoji = typeof AVATAR_EMOJIS[number];

export interface UserProfile {
  uid: string;
  displayName: string;
  tag: string;
  avatarEmoji: string;
  bio?: string;
  favoriteGenres: string[];
  ageConfirmed: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface BuddyPost {
  id: string; // {eventId}_{authorUid}
  eventId: string;
  authorUid: string;
  authorName: string; // displayName#tag
  avatarEmoji?: string;
  kind: BuddyPostKind;
  body: string;
  meetUpNote?: string;
  status: BuddyPostStatus;
  createdAt: any;
  updatedAt: any;
}

export interface BuddyComment {
  id: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdAt: any;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'scalping'
  | 'scam'
  | 'other';

export interface ContentReport {
  id: string;
  reporterUid: string;
  targetType: 'post' | 'comment' | 'chat';
  targetPath: string;
  chatId?: string;
  excerpt?: string;
  reason: ReportReason;
  createdAt: any;
}

export interface UserBan {
  uid: string;
  reason?: string;
  bannedAt: any;
  bannedBy?: string;
}
