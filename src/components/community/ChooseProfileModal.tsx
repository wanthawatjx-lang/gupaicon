import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { AVATAR_EMOJIS, UserProfile } from '../../types/community';
import { createUserProfile, updateUserProfile } from '../../services/communityService';
import { Language, translations } from '../../i18n';
import { X, Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface ChooseProfileModalProps {
  user: User;
  existingProfile?: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved: (profile: UserProfile) => void;
  lang: Language;
  availableGenres?: string[];
}

const DEFAULT_GENRES = [
  'Indie Rock', 'Shoegaze', 'Dream Pop', 'Synthpop', 'Post-Punk',
  'City Pop', 'Math Rock', 'Emo', 'Alternative', 'Lo-Fi'
];

export const ChooseProfileModal: React.FC<ChooseProfileModalProps> = ({
  user,
  existingProfile,
  isOpen,
  onClose,
  onProfileSaved,
  lang,
  availableGenres = DEFAULT_GENRES,
}) => {
  const t = translations[lang];

  const [displayName, setDisplayName] = useState(existingProfile?.displayName || '');
  const [avatarEmoji, setAvatarEmoji] = useState<string>(existingProfile?.avatarEmoji || '🎸');
  const [bio, setBio] = useState(existingProfile?.bio || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    existingProfile?.favoriteGenres || []
  );
  const [ageConfirmed, setAgeConfirmed] = useState(existingProfile?.ageConfirmed ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      if (selectedGenres.length >= 5) return;
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const validate = (): string | null => {
    const clean = displayName.trim();
    if (clean.length < 2 || clean.length > 24) {
      return lang === 'th'
        ? 'ชื่อต้องมีความยาว 2–24 ตัวอักษร'
        : 'Display name must be 2–24 characters';
    }
    if (/@/.test(clean)) {
      return lang === 'th' ? 'ชื่อต้องไม่มีเครื่องหมาย @' : 'Display name cannot contain @';
    }
    if (/(?:https?:\/\/|www\.)/i.test(clean)) {
      return lang === 'th' ? 'ชื่อต้องไม่มีลิงก์หรือ URL' : 'Display name cannot contain URLs';
    }
    if (!existingProfile && !ageConfirmed) {
      return lang === 'th'
        ? 'กรุณายืนยันว่าคุณมีอายุ 18 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครอง'
        : 'Please confirm age requirement or parental consent';
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
      if (existingProfile) {
        await updateUserProfile(user.uid, {
          displayName: displayName.trim(),
          avatarEmoji,
          bio: bio.trim(),
          favoriteGenres: selectedGenres,
        });
        const updated: UserProfile = {
          ...existingProfile,
          displayName: displayName.trim(),
          avatarEmoji,
          bio: bio.trim(),
          favoriteGenres: selectedGenres,
          updatedAt: new Date(),
        };
        onProfileSaved(updated);
      } else {
        const created = await createUserProfile(user.uid, {
          displayName: displayName.trim(),
          avatarEmoji,
          bio: bio.trim(),
          favoriteGenres: selectedGenres,
          ageConfirmed: true,
        });
        onProfileSaved(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err?.message || (lang === 'th' ? 'บันทึกโปรไฟล์ไม่สำเร็จ' : 'Failed to save profile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-850">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{avatarEmoji}</span>
              <span>{existingProfile ? t.community.editProfile : t.community.chooseNameTitle}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
              {t.community.chooseNameDesc}
            </p>
          </div>
          {existingProfile && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Avatar Emoji Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
              {t.community.avatarEmojiLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    avatarEmoji === emoji
                      ? 'bg-lime-400/20 border-2 border-lime-400 scale-105'
                      : 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
              {t.community.displayNameLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.community.displayNamePlaceholder}
                maxLength={24}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-lime-400 focus:outline-none text-white text-sm"
              />
              <span className="absolute right-3 top-3 text-[10px] font-mono text-neutral-500">
                {displayName.length}/24
              </span>
            </div>
            {existingProfile && (
              <span className="text-[11px] font-mono text-neutral-400 block">
                Tag: #{existingProfile.tag} (shown as {displayName || 'Name'}#{existingProfile.tag})
              </span>
            )}
          </div>

          {/* Short Bio (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
              {t.community.bioLabel}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Loves shoegaze gigs, usually attends shows in Thonglor / Ari..."
              maxLength={140}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-lime-400 focus:outline-none text-white text-xs resize-none"
            />
            <div className="text-right text-[10px] font-mono text-neutral-500">
              {bio.length}/140
            </div>
          </div>

          {/* Favorite Genres (Max 5) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
                {t.community.favoriteGenresLabel}
              </label>
              <span className="text-[10px] font-mono text-neutral-400">
                {selectedGenres.length}/5
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableGenres.slice(0, 12).map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleToggleGenre(genre)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-lime-400 text-black font-semibold'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age Consent Checkbox (Mandatory for first creation) */}
          {!existingProfile && (
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  required
                  className="mt-0.5 accent-lime-400 w-4 h-4 rounded cursor-pointer shrink-0"
                />
                <span className="text-xs text-neutral-300 leading-snug">
                  {t.community.ageConsentLabel}
                </span>
              </label>
            </div>
          )}

          {/* Privacy reassurance */}
          <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span>
              {lang === 'th'
                ? 'ระบบจะไม่เปิดเผยอีเมลหรือรูปบัญชี Google ของคุณ'
                : 'Your Google email and profile photo are never made public'}
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-sm tracking-wide transition-all active:scale-98 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              <span>{t.community.saveProfile}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
