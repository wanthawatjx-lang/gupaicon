import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types/community';
import { fetchUserProfile } from '../../services/communityService';
import { Language, translations } from '../../i18n';
import { X, MessageSquare, UserX, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';

interface UserProfileModalProps {
  targetUid: string;
  fallbackName?: string;
  fallbackEmoji?: string;
  viewerUser: User | null;
  viewerProfile?: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (targetUid: string, targetName: string, targetEmoji?: string) => void;
  onBlockUser?: (targetUid: string) => void;
  lang: Language;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  targetUid,
  fallbackName,
  fallbackEmoji = '🎸',
  viewerUser,
  viewerProfile,
  isOpen,
  onClose,
  onStartChat,
  onBlockUser,
  lang,
}) => {
  const t = translations[lang];
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !targetUid) return;
    if (!viewerUser) {
      setLoading(false);
      setTargetProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchUserProfile(targetUid)
      .then((p) => {
        if (!cancelled) setTargetProfile(p);
      })
      .catch((err) => {
        console.warn('Failed to fetch user profile:', err);
        if (!cancelled) setError(t.community.profileNotFound);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, targetUid, viewerUser?.uid]);

  if (!isOpen) return null;

  const isSelf = viewerUser?.uid === targetUid;
  const canMessage = Boolean(viewerUser && viewerProfile?.ageConfirmed && !isSelf);
  const displayTitle = targetProfile
    ? `${targetProfile.displayName}#${targetProfile.tag}`
    : fallbackName || 'Concert Fan';
  const emoji = targetProfile?.avatarEmoji || fallbackEmoji;

  return (
    <div className="fixed inset-0 z-1150 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-850">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl p-2 rounded-2xl bg-neutral-900 border border-neutral-800 shrink-0">
              {emoji}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">
                {displayTitle}
              </h2>
              <span className="text-[11px] font-mono text-lime-400">
                {t.community.viewProfile}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {!viewerUser ? (
            <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 text-xs text-neutral-300 text-center">
              {t.chat.signInToMessage}
            </div>
          ) : loading ? (
            <div className="py-6 flex flex-col items-center gap-2 text-neutral-400 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
              <span>{t.chat.loading}</span>
            </div>
          ) : error || !targetProfile ? (
            <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0" />
              <span>{error || t.community.profileNotFound}</span>
            </div>
          ) : (
            <>
              {targetProfile.bio && (
                <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-850 text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed select-text">
                  {targetProfile.bio}
                </div>
              )}

              {targetProfile.favoriteGenres.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider font-bold block">
                    {t.community.favoriteGenresLabel}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {targetProfile.favoriteGenres.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[11px]"
                      >
                        #{g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>
                  {lang === 'th'
                    ? 'ไม่เปิดเผยอีเมลหรือรูปโปรไฟล์ Google'
                    : 'Email and Google photo are never exposed'}
                </span>
              </div>
            </>
          )}

          {/* Actions */}
          {!isSelf && (
            <div className="space-y-2 pt-1 border-t border-neutral-850">
              {onStartChat && (
                <button
                  type="button"
                  disabled={!canMessage || (!loading && !targetProfile && Boolean(viewerUser))}
                  onClick={() => {
                    if (!canMessage) return;
                    onStartChat(targetUid, displayTitle, emoji);
                    onClose();
                  }}
                  title={!canMessage ? t.chat.signInToMessage : t.chat.messageButton}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t.chat.messageButton}</span>
                </button>
              )}

              {!canMessage && (
                <p className="text-[11px] font-mono text-neutral-400 text-center">
                  {t.chat.signInToMessage}
                </p>
              )}

              {viewerUser && onBlockUser && (
                <button
                  type="button"
                  onClick={() => {
                    onBlockUser(targetUid);
                    onClose();
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-red-400 border border-neutral-800 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>{t.community.block}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
