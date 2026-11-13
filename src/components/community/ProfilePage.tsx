import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types/community';
import { deleteUserProfileAndData, checkIsBanned } from '../../services/communityService';
import { ChooseProfileModal } from './ChooseProfileModal';
import { Language, translations } from '../../i18n';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Ban,
} from 'lucide-react';

interface ProfilePageProps {
  user: User;
  profile: UserProfile | null;
  onProfileUpdated: (p: UserProfile | null) => void;
  onBack: () => void;
  lang: Language;
  availableGenres?: string[];
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  profile,
  onProfileUpdated,
  onBack,
  lang,
  availableGenres,
}) => {
  const t = translations[lang];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    checkIsBanned(user.uid).then(setIsBanned).catch(() => {});
  }, [user.uid]);

  const handleDeleteProfile = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteUserProfileAndData(user.uid);
      onProfileUpdated(null);
      onBack();
    } catch (err) {
      console.error('Failed to delete profile:', err);
      setDeleteError(
        lang === 'th'
          ? 'ไม่สามารถลบโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง'
          : 'Could not delete profile. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1000 bg-neutral-950 text-white flex flex-col overflow-hidden animate-in fade-in">
      {/* Header */}
      <header className="p-3 sm:p-4 border-b border-neutral-850 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t.community.backToMap}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-white">
            {t.community.profileTitle}
          </h1>
        </div>
      </header>

      {/* Profile Body */}
      <main className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-5">
        {isBanned && (
          <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-700/60 flex items-center gap-2.5 text-xs text-red-300">
            <Ban className="w-4 h-4 text-red-400 shrink-0" />
            <span>{t.community.bannedMessage}</span>
          </div>
        )}

        {!profile ? (
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center space-y-3">
            <p className="text-sm text-neutral-300">
              {t.community.noProfileYet}
            </p>
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {t.community.chooseNameTitle}
            </button>
          </div>
        ) : (
          <>
            {/* Identity Card */}
            <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-4xl p-2 rounded-2xl bg-neutral-800 border border-neutral-700 shrink-0">
                    {profile.avatarEmoji}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">
                      {profile.displayName}
                      <span className="text-neutral-400 font-mono text-sm ml-1.5 font-normal">
                        #{profile.tag}
                      </span>
                    </h2>
                    <span className="text-xs text-lime-400 font-mono">
                      {t.community.memberBadge}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs font-mono text-neutral-200 transition-all cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t.community.editProfile}</span>
                </button>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850 text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </div>
              )}

              {/* Favorite Genres */}
              {profile.favoriteGenres.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider font-bold block">
                    {t.community.favoriteGenresLabel}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.favoriteGenres.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-[11px]"
                      >
                        #{g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-850 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-400 leading-relaxed space-y-1">
                <span className="font-bold text-neutral-200 block">
                  {t.community.privacyGuaranteeTitle}
                </span>
                <p>
                  {t.community.privacyGuaranteeBody}
                </p>
              </div>
            </div>

            {/* Danger Zone: Delete My Profile & Posts */}
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-3">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t.community.dangerZoneTitle}</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {t.community.dangerZoneDesc}
              </p>

              {deleteError && (
                <p className="text-xs text-red-300 bg-red-950/60 p-2 rounded-lg border border-red-800">
                  {deleteError}
                </p>
              )}

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/60 font-bold text-xs tracking-wide transition-all cursor-pointer min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.community.deleteProfileAndPosts}</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/80 space-y-2.5">
                  <p className="text-xs text-red-200 leading-snug">
                    {t.community.deleteProfileConfirm}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold cursor-pointer"
                    >
                      {t.community.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      disabled={isDeleting}
                      className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? '...' : t.community.deletePost}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <ChooseProfileModal
          user={user}
          existingProfile={profile}
          isOpen={true}
          onClose={() => setIsEditOpen(false)}
          onProfileSaved={(updated) => {
            onProfileUpdated(updated);
            setIsEditOpen(false);
          }}
          lang={lang}
          availableGenres={availableGenres && availableGenres.length > 0 ? availableGenres : undefined}
        />
      )}
    </div>
  );
};
