import React from 'react';
import { Shield, Radio, List, Globe } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({
  venuesCount,
  eventsCount,
  lang,
  onToggleLang,
  onOpenAdmin,
  onToggleList,
  isListOpen,
  isAdminSignedIn = false,
}) => {
  const t = translations[lang];

  return (
    <header className="absolute top-0 left-0 right-0 z-500 pointer-events-none p-3 sm:p-4">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2 pointer-events-auto">
        {/* Brand / Logo Card */}
        <div className="flex items-center gap-2.5 bg-neutral-950/90 border border-neutral-800/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-lime-400 text-black font-bold shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold tracking-tight text-white text-sm sm:text-base font-mono">
                {t.app.title}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
            </div>
            <p className="text-[10px] text-neutral-400 tracking-wider font-medium mt-0.5 truncate max-w-[140px] sm:max-w-none">
              {t.app.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Language Switcher (TH / EN) */}
          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-mono font-bold bg-neutral-950/90 text-neutral-200 hover:text-white border border-neutral-800/90 hover:border-neutral-700 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-lime-400" />
            <span className={lang === 'th' ? 'text-lime-400' : 'text-neutral-400'}>TH</span>
            <span className="text-neutral-600">/</span>
            <span className={lang === 'en' ? 'text-lime-400' : 'text-neutral-400'}>EN</span>
          </button>

          {/* Venue & Event List Toggle */}
          <button
            type="button"
            onClick={onToggleList}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg border active:scale-95 ${
              isListOpen
                ? 'bg-lime-400 text-black border-lime-400 font-bold'
                : 'bg-neutral-950/90 text-neutral-200 hover:text-white border-neutral-800/90 hover:bg-neutral-900'
            }`}
            title={t.app.venuesCount(venuesCount)}
          >
            <List className="w-3.5 h-3.5" />
            <span>{venuesCount}</span>
          </button>

          {/* Admin Access Button (English UI) */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-mono backdrop-blur-md transition-all cursor-pointer shadow-lg border active:scale-95 ${
              isAdminSignedIn
                ? 'bg-neutral-900 text-lime-400 border-lime-400/80 font-bold'
                : 'bg-neutral-950/90 text-neutral-400 hover:text-white border-neutral-800/90 hover:border-neutral-700'
            }`}
            title="Admin Console"
          >
            <Shield className={`w-3.5 h-3.5 ${isAdminSignedIn ? 'text-lime-400' : 'text-neutral-400'}`} />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
