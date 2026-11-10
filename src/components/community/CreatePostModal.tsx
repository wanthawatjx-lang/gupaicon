import React, { useState } from 'react';
import { UserProfile, BuddyPostKind } from '../../types/community';
import { createBuddyPost } from '../../services/communityService';
import { Language, translations } from '../../i18n';
import { X, Send, AlertCircle } from 'lucide-react';

interface CreatePostModalProps {
  eventId: string;
  eventTitle: string;
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  lang: Language;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  eventId,
  eventTitle,
  profile,
  isOpen,
  onClose,
  onPostCreated,
  lang,
}) => {
  const t = translations[lang];

  const [kind, setKind] = useState<BuddyPostKind>('looking_for_buddy');
  const [body, setBody] = useState('');
  const [meetUpNote, setMeetUpNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = (): string | null => {
    const clean = body.trim();
    if (clean.length < 1 || clean.length > 500) {
      return lang === 'th'
        ? 'ข้อความต้องมีความยาวระหว่าง 1–500 ตัวอักษร'
        : 'Message must be between 1 and 500 characters';
    }
    if (/(?:https?:\/\/|www\.)/i.test(clean)) {
      return lang === 'th'
        ? 'ไม่อนุญาตให้ใส่ลิงก์ในข้อความเพื่อความปลอดภัย'
        : 'Links and URLs are not permitted for safety';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const authorName = `${profile.displayName}#${profile.tag}`;
      await createBuddyPost({
        eventId,
        authorUid: profile.uid,
        authorName,
        avatarEmoji: profile.avatarEmoji,
        kind,
        body: body.trim(),
        meetUpNote: meetUpNote.trim() || undefined,
      });
      onPostCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create buddy post:', err);
      setError(err?.message || (lang === 'th' ? 'สร้างโพสต์ไม่สำเร็จ' : 'Failed to publish post'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1150 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{profile.avatarEmoji}</span>
              <span>{t.community.writePostTitle}</span>
            </h2>
            <p className="text-xs text-lime-400 font-medium truncate max-w-[280px]">
              {eventTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kind selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider block">
              {t.community.postKindLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'looking_for_buddy', label: t.community.kinds.looking_for_buddy },
                  { key: 'have_extra_ticket', label: t.community.kinds.have_extra_ticket },
                  { key: 'need_ticket', label: t.community.kinds.need_ticket },
                ] as { key: BuddyPostKind; label: string }[]
              ).map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setKind(k.key)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer min-h-[44px] ${
                    kind === k.key
                      ? 'bg-lime-400 text-black border-lime-400 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-850'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider block">
              {t.community.postContentLabel}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.community.postContentPlaceholder}
              rows={4}
              maxLength={500}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-lime-400 focus:outline-none text-white text-xs resize-none"
            />
            <div className="text-right text-[10px] font-mono text-neutral-500">
              {body.length}/500
            </div>
          </div>

          {/* Meetup note */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider block">
              {t.community.meetUpNoteLabel}
            </label>
            <input
              type="text"
              value={meetUpNote}
              onChange={(e) => setMeetUpNote(e.target.value)}
              placeholder={t.community.meetUpNotePlaceholder}
              maxLength={120}
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-lime-400 focus:outline-none text-white text-xs"
            />
          </div>

          {/* Posting As Chip */}
          <div className="text-[11px] font-mono text-neutral-400">
            Posting as: <span className="text-white font-bold">{profile.avatarEmoji} {profile.displayName}#{profile.tag}</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs uppercase tracking-wider transition-all active:scale-98 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.community.publishPost}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
