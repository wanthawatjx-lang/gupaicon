import React from 'react';
import { Language, translations } from '../i18n';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {
  lang: Language;
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ lang, onBack }) => {
  const t = translations[lang].privacy;

  return (
    <div className="fixed inset-0 z-2000 bg-black text-white overflow-y-auto p-6 sm:p-12">
      <div className="max-w-2xl mx-auto space-y-8 pb-16">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 text-xs font-mono font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-lime-400" />
          <span>{t.backToMap}</span>
        </button>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
            {t.title}
          </h1>
          <p className="text-xs font-mono text-neutral-400">
            gupaicon (กูไปคอน) • Last updated: October 2026
          </p>
        </div>

        <div className="space-y-6 text-sm text-neutral-300 leading-relaxed font-sans">
          <section className="space-y-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400" />
              {t.heading1}
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {t.content1}
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400" />
              {t.heading2}
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {t.content2}
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400" />
              {t.heading3}
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {t.content3}
            </p>
          </section>

          <section className="space-y-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400" />
              {t.heading4}
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {t.content4} <a href="mailto:wantawachjz@gmail.com" className="text-lime-400 underline font-mono">wantawachjz@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
