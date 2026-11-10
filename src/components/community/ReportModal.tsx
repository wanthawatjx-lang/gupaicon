import React, { useState } from 'react';
import { ReportReason } from '../../types/community';
import { submitContentReport } from '../../services/communityService';
import { Language, translations } from '../../i18n';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  reporterUid?: string;
  targetType: 'post' | 'comment' | 'chat';
  targetPath?: string;
  targetId?: string;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSubmit?: (reason: ReportReason) => Promise<void>;
}

const REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'inappropriate',
  'scalping',
  'scam',
  'other',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  reporterUid,
  targetType,
  targetPath,
  targetId,
  isOpen,
  onClose,
  lang,
  onSubmit,
}) => {
  const t = translations[lang];
  const [selectedReason, setSelectedReason] = useState<ReportReason>('inappropriate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (onSubmit) {
        await onSubmit(selectedReason);
      } else if (reporterUid && targetPath) {
        await submitContentReport(reporterUid, targetType as 'post' | 'comment', targetPath, selectedReason);
      }
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Report submission failed:', err);
      setError(err?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1150 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t.community.reportTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-4 rounded-xl bg-lime-950/40 border border-lime-500/30 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-lime-400 mx-auto" />
            <p className="text-xs text-lime-300 font-medium">
              {t.community.reportSuccess}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-xs text-red-400 bg-red-950/60 p-2 rounded-lg border border-red-800">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
                {t.community.reportReasonLabel}
              </label>
              <div className="space-y-1.5">
                {REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedReason === r
                        ? 'bg-neutral-900 border-amber-400 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={selectedReason === r}
                      onChange={() => setSelectedReason(r)}
                      className="accent-amber-400"
                    />
                    <span>{t.community.reasons[r]}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? '...' : t.community.report}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
