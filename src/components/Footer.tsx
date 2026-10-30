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
    <footer className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md z-400 pointer-events-auto">
      <div className="p-2.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 backdrop-blur-md shadow-xl text-center space-y-1">
        <p className="text-[11px] text-neutral-400 leading-tight">
          {t.disclaimer}
        </p>
        <div>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-[10px] font-mono text-lime-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>{t.privacyLink}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
