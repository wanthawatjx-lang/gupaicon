import React from 'react';
import { Language, translations } from '../i18n';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  lang: Language;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, onOpenPrivacy }) => {
  const t = translations[lang].footer;

  return (
    <footer className="absolute bottom-2.5 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md z-400 pointer-events-auto">
      <div className="px-3 py-2 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 backdrop-blur-md shadow-xl text-center space-y-0.5">
        <p className="text-[11px] text-neutral-300 leading-snug">
          {t.disclaimer}
        </p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="min-h-[36px] px-2 py-1 text-[11px] font-mono text-lime-400 hover:text-lime-300 hover:underline inline-flex items-center gap-1 cursor-pointer rounded-lg"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{t.privacyLink}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
