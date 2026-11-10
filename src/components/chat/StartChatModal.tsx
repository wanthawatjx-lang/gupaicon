import React, { useState } from 'react';
import { UserProfile } from '../../types/community';
import { createPendingChat } from '../../services/chatService';
import { Language, translations } from '../../i18n';
import { MessageSquare, X, Send, AlertTriangle } from 'lucide-react';

interface StartChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  callerProfile: UserProfile;
  targetUid: string;
  targetName: string;
  targetEmoji?: string;
  lang: Language;
  onChatStarted: (chatId: string) => void;
}

export const StartChatModal: React.FC<StartChatModalProps> = ({
  isOpen,
  onClose,
  callerProfile,
  targetUid,
  targetName,
  targetEmoji = '🎸',
  lang,
  onChatStarted,
}) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang].chat;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;

    if (callerProfile.uid === targetUid) {
      setError(lang === 'th' ? 'ไม่สามารถส่งข้อความหาตนเองได้' : 'You cannot message yourself');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await createPendingChat(callerProfile, targetUid, targetName, clean);
      setText('');
      onChatStarted(res.chatId);
      onClose();
    } catch (err: any) {
      console.error('Failed to start chat:', err);
      setError(lang === 'th' ? 'ไม่สามารถส่งข้อความได้ (อาจมีการบล็อกหรือข้อผิดพลาด)' : 'Failed to send message request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-3000 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{targetEmoji}</span>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-lime-400" />
                {t.startChatTitle(targetName)}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* First message notice */}
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-300 flex items-start gap-2.5">
            <span className="text-lime-400 font-bold shrink-0">ℹ</span>
            <p className="leading-relaxed">{t.firstMessageNotice}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-neutral-300">
              {lang === 'th' ? 'ข้อความเปิดการสนทนา' : 'Opening message'}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.placeholder}
              rows={4}
              maxLength={1000}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition-colors resize-none font-sans"
            />
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
              <span>{lang === 'th' ? 'ข้อความล้วน (ไม่แปลงลิงก์อัตโนมัติ)' : 'Plain text only'}</span>
              <span>{text.length}/1000</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? t.loading : t.send}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
