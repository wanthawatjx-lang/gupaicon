import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types/community';
import { deleteUserProfileAndData } from '../../services/communityService';
import { ChooseProfileModal } from './ChooseProfileModal';
import { Language, translations } from '../../i18n';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface ProfilePageProps {
  user: User;
  profile: UserProfile | null;
  onProfileUpdated: (p: UserProfile | null) => void;
  onBack: () => void;
  lang: Language;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  profile,
  onProfileUpdated,
  onBack,
  lang,
}) => {
  const t = translations[lang];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProfile = async () => {
    if (!window.confirm(t.community.deleteProfileConfirm)) return;
    setIsDeleting(true);
    try {
      await deleteUserProfileAndData(user.uid);
      onProfileUpdated(null);
      onBack();
    } catch (err) {
      console.error('Failed to delete profile:', err);
      alert('Could not delete profile. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1000 bg-neutral-950 text-white flex flex-col overflow-hidden animate-in fade-in">
      {/* Header */}
      <header className="p-4 border-b border-neutral-850 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
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
        {!profile ? (
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center space-y-3">
            <p className="text-sm text-neutral-300">
              You do not have a community profile yet.
            </p>
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs uppercase tracking-wider transition-all"
            >
              {t.community.chooseNameTitle}
            </button>
          </div>
        ) : (
          <>
            {/* Identity Card */}
            <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl p-2 rounded-2xl bg-neutral-800 border border-neutral-700">
                    {profile.avatarEmoji}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {profile.displayName}
                      <span className="text-neutral-500 font-mono text-sm ml-1.5 font-normal">
                        #{profile.tag}
                      </span>
                    </h2>
                    <span className="text-xs text-lime-400 font-mono">
                      Community Member
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs font-mono text-neutral-200 transition-all cursor-pointer"
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
                  Zero PII Leakage Guarantee
                </span>
                <p>
                  {lang === 'th'
                    ? 'ระบบจัดเก็บเฉพาะชื่อแสดงผล, แท็กตัวเลข 4 หลัก, อิโมจิ และแนวเพลงที่คุณเลือกเท่านั้น จะไม่มีการเปิดเผยอีเมลหรือรูปโปรไฟล์ Google ให้ผู้อื่นเห็นในคอมมูนิตี้'
                    : 'We only store your chosen community name, 4-digit tag, avatar emoji, and music preferences. Your email and Google photo are never revealed to other users.'}
                </p>
              </div>
            </div>

            {/* Danger Zone: Delete My Profile & Posts */}
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-2.5">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Danger Zone</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {lang === 'th'
                  ? 'ลบโปรไฟล์ของคุณพร้อมกับคำขอหาเพื่อนทั้งหมดอย่างถาวร'
                  : 'Permanently remove your community profile and all buddy requests created under your account.'}
              </p>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/60 font-bold text-xs tracking-wide transition-all cursor-pointer min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : t.community.deleteProfileAndPosts}</span>
              </button>
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
        />
      )}
    </div>
  );
};
