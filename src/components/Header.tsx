import React from 'react';
import { Shield, Radio, List, Globe, Users, MessageSquare } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface HeaderProps {
  venuesCount: number;
  eventsCount: number;
  lang: Language;
  onToggleLang: () => void;
  onOpenAdmin: () => void;
  onToggleList: () => void;
  isListOpen: boolean;
  isAdminSignedIn?: boolean;
  onOpenBuddies?: () => void;
  onOpenProfile?: () => void;
  onOpenMessages?: () => void;
  hasUnreadMessages?: boolean;
  profileEmoji?: string;
  isSignedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  venuesCount,
  lang,
  onToggleLang,
  onOpenAdmin,
  onToggleList,
  isListOpen,
  isAdminSignedIn = false,
  onOpenBuddies,
  onOpenProfile,
  onOpenMessages,
  hasUnreadMessages = false,
  profileEmoji,
  isSignedIn = false,
}) => {
  const t = translations[lang];

  return (
    <header className="absolute top-0 left-0 right-0 z-500 pointer-events-none p-2.5 sm:p-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Brand / Logo Card */}
        <div className="flex items-center gap-2 bg-neutral-950/95 border border-neutral-800/90 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl shadow-xl min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-lime-400 text-black font-bold shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold tracking-tight text-white text-xs sm:text-base font-mono truncate">
                {t.app.title}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping shrink-0" />
            </div>
            <p className="hidden sm:block text-[10px] text-neutral-400 tracking-wider font-medium mt-0.5 truncate">
              {t.app.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls (all >= 44px touch target height) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Language Switcher (TH / EN) */}
          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center justify-center gap-1 min-h-[44px] px-2 sm:px-2.5 rounded-xl text-xs font-mono font-bold bg-neutral-950/95 text-neutral-200 hover:text-white border border-neutral-800/90 hover:border-neutral-700 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title={t.app.toggleLangLabel}
            aria-label={t.app.toggleLangLabel}
          >
            <Globe className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span className={lang === 'th' ? 'text-lime-400' : 'text-neutral-400'}>TH</span>
            <span className="text-neutral-600">/</span>
            <span className={lang === 'en' ? 'text-lime-400' : 'text-neutral-400'}>EN</span>
          </button>

          {/* Venue List Drawer Toggle */}
          <button
            type="button"
            onClick={onToggleList}
            className={`flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-2.5 rounded-xl text-xs font-mono font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg border active:scale-95 ${
              isListOpen
                ? 'bg-lime-400 text-black border-lime-400 font-bold'
                : 'bg-neutral-950/95 text-neutral-200 hover:text-white border-neutral-800/90 hover:bg-neutral-900'
            }`}
            title={t.app.venuesCount(venuesCount)}
            aria-label={t.app.venuesCount(venuesCount)}
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span>{venuesCount}</span>
          </button>

          {/* Find a Concert Buddy Board Button */}
          <button
            type="button"
            onClick={onOpenBuddies}
            className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 rounded-xl text-xs font-mono font-bold bg-neutral-950/95 text-neutral-200 hover:text-white border border-neutral-800/90 hover:border-lime-400 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title={t.community.findBuddy}
            aria-label={t.community.findBuddy}
          >
            <Users className="w-4 h-4 text-lime-400 shrink-0" />
            <span className="hidden sm:inline">{t.app.buddiesShort}</span>
          </button>

          {/* Messages Button (DMs) */}
          {isSignedIn && (
            <button
              type="button"
              onClick={onOpenMessages}
              className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-neutral-950/95 border border-neutral-800/90 hover:border-lime-400 text-neutral-200 hover:text-white text-sm backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
              title={t.app.messagesLabel}
              aria-label={t.app.messagesLabel}
            >
              <MessageSquare className="w-4 h-4 text-lime-400" />
              {hasUnreadMessages && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-lime-400 ring-2 ring-black animate-pulse" />
              )}
            </button>
          )}

          {/* User Profile Button */}
          {isSignedIn && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-neutral-950/95 border border-neutral-800/90 hover:border-lime-400 text-sm backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
              title={t.app.myProfileLabel}
              aria-label={t.app.myProfileLabel}
            >
              <span>{profileEmoji || '👤'}</span>
            </button>
          )}

          {/* Admin Access Button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-2 sm:px-2.5 rounded-xl text-xs font-mono backdrop-blur-md transition-all cursor-pointer shadow-lg border active:scale-95 ${
              isAdminSignedIn
                ? 'bg-neutral-900 text-lime-400 border-lime-400/80 font-bold'
                : 'bg-neutral-950/95 text-neutral-300 hover:text-white border-neutral-800/90 hover:border-neutral-700'
            }`}
            title={t.app.admin}
            aria-label={t.app.admin}
          >
            <Shield className={`w-4 h-4 ${isAdminSignedIn ? 'text-lime-400' : 'text-neutral-300'}`} />
            <span className="hidden sm:inline">{t.app.admin}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
