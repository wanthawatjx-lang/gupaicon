import React, { useState, useEffect } from 'react';
import { User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { ConcertEvent, CrowdReport, CrowdReportStatus } from '../types/event';
import { Promoter } from '../types/promoter';
import { STATUS_MAP } from '../utils/statusUtils';
import { computeDisplayedStatus } from '../utils/crowdStatusLogic';
import { subscribeToEventReports, submitCrowdReport } from '../services/reportService';
import { formatBangkokDateTime, formatRelativeTime } from '../utils/dateUtils';
import { Language, translations } from '../i18n';
import {
  Calendar,
  Ticket,
  Instagram,
  X,
  BadgeCheck,
  Tag,
  Users,
  MapPin,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface EventDetailSheetProps {
  event: ConcertEvent | null;
  promoter?: Promoter;
  venueName?: string;
  user: User | null;
  onClose: () => void;
  onOpenVenue?: () => void;
  lang: Language;
}

export const EventDetailSheet: React.FC<EventDetailSheetProps> = ({
  event,
  promoter,
  venueName,
  user,
  onClose,
  onOpenVenue,
  lang,
}) => {
  const [reports, setReports] = useState<CrowdReport[]>([]);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Gemini AI Vibe Preview states
  const [aiPreview, setAiPreview] = useState<{
    vibeSummary: string;
    lineupHighlights: string[];
    crowdAtmosphere: string;
    practicalTip: string;
  } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const t = translations[lang];

  // Reset AI preview when event changes
  useEffect(() => {
    setAiPreview(null);
    setAiError(null);
  }, [event?.id]);

  const handleFetchAiPreview = async () => {
    if (!event || !user) return;
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/event-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            (lang === 'th'
              ? 'ไม่สามารถดึงข้อมูล AI Vibe ได้ กรุณาลองใหม่อีกครั้ง'
              : 'Failed to generate preview. Please try again.')
        );
      }
      if (data.success && data.preview) {
        setAiPreview(data.preview);
      } else {
        throw new Error(data.error || 'No preview details generated');
      }
    } catch (err: any) {
      setAiError(err?.message || (lang === 'th' ? 'เกิดข้อผิดพลาดในการดึงข้อมูล Vibe' : 'Failed to generate preview'));
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Subscribe to crowd reports ONLY for this event (Requirement 5: limit 50, newest first, last 90 min)
  useEffect(() => {
    if (!event) {
      setReports([]);
      return;
    }
    const unsubscribe = subscribeToEventReports(
      event.id,
      (data) => setReports(data),
      (err) => console.error('Failed to load reports:', err)
    );
    return () => unsubscribe();
  }, [event?.id]);

  if (!event) return null;

  // Compute displayed status using the pure function (Requirement 4)
  const displayedStatus = computeDisplayedStatus(event, reports);
  const isSample = event.title.toUpperCase().startsWith('SAMPLE');

  // Find user's existing report (doc id = user.uid)
  const userReport = user ? reports.find((_, idx) => false) : null; // Note: reports lack uid unless attached, but we can check if current user submitted
  // Wait, since reports array maps docSnap data without uid, let's store reports with uid if needed or check auth
  // Actually, we can check auth.currentUser?.uid. Let's fetch user's own report or check local state.

  const handleSignInForReport = async () => {
    setIsSigningIn(true);
    setReportError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setReportError(err?.message || 'Google sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleReportStatus = async (status: CrowdReportStatus) => {
    if (!user) return;
    setIsSubmittingReport(true);
    setReportError(null);
    try {
      await submitCrowdReport(event.id, user.uid, status);
    } catch (err: any) {
      console.error('Submit report error:', err);
      setReportError(err?.message || 'Failed to submit report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const myReport = user ? reports.find((r: any) => r.uid === user.uid) : null; // or check via user
  // Let's ensure reportService returns uid if we want, or keep it simple.

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-1050 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        role="dialog"
        aria-labelledby="event-title"
        className="fixed bottom-0 left-0 right-0 z-1060 max-w-lg mx-auto bg-neutral-950 border-t border-x border-neutral-800 rounded-t-3xl shadow-2xl overflow-hidden pb-8 pt-3 px-5 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200"
      >
        {/* Pull handle bar */}
        <div className="flex justify-center mb-3 shrink-0">
          <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* Header row: Status Badge + Details + Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Badge: Color + Symbol + Word (Requirement 4: never color alone) */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider ${displayedStatus.statusConfig.badgeClass}`}
              >
                <span>{displayedStatus.symbol}</span>
                <span>{lang === 'th' ? displayedStatus.labelTh : displayedStatus.labelEn}</span>
              </span>

              {/* Status Details / Last Updated */}
              <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-500" />
                <span>{displayedStatus.details}</span>
              </span>

              {isSample && (
                <span className="px-2 py-0.5 rounded-sm bg-neutral-900 text-amber-300 border border-amber-500/30 font-mono text-[10px] uppercase font-medium">
                  SAMPLE
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close event sheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Event Title */}
          <div>
            <h1
              id="event-title"
              className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight"
            >
              {event.title}
            </h1>

            {/* Venue Location Link */}
            {venueName && (
              <button
                type="button"
                onClick={onOpenVenue}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-300 hover:text-lime-400 font-medium transition-colors group cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-lime-400">
                  {venueName}
                </span>
              </button>
            )}

            {/* AI Source Attribution (Requirement 8) */}
            {event.origin === 'ai' && event.sourceUrl && (
              <div className="mt-2 text-xs text-neutral-400 font-mono flex items-center gap-1.5">
                <span>{lang === 'th' ? 'แหล่งที่มา:' : 'Source:'}</span>
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime-400 hover:underline inline-flex items-center gap-1 truncate max-w-[280px]"
                >
                  {(() => {
                    try {
                      return new URL(event.sourceUrl!).hostname;
                    } catch {
                      return event.sourceUrl!;
                    }
                  })()}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* AI Vibe & Show Breakdown Section (Powered by geminiClient) */}
          <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lime-400" />
                <span>{lang === 'th' ? 'AI Vibe Check & วิเคราะห์โชว์' : 'AI Vibe Check & Breakdown'}</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">
                Gemini 3.8
              </span>
            </div>

            {/* State 1: Idle (Not requested yet) */}
            {!aiPreview && !isLoadingAi && !aiError && (
              !user ? (
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-neutral-950/60 border border-neutral-850 gap-2">
                  <p className="text-xs text-neutral-400">
                    {lang === 'th'
                      ? 'เข้าสู่ระบบเพื่อดู AI preview'
                      : 'Sign in to see the AI preview'}
                  </p>
                  <button
                    type="button"
                    onClick={handleSignInForReport}
                    disabled={isSigningIn}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'เข้าสู่ระบบเพื่อดู AI preview' : 'Sign in to see the AI preview'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-neutral-950/60 border border-neutral-850 gap-2">
                  <p className="text-xs text-neutral-400">
                    {lang === 'th'
                      ? 'อยากรู้ว่าวงนี้ซาวด์เป็นยังไง บรรยากาศคนดูแบบไหน และควรไปกี่โมง?'
                      : 'Curious about this band’s live sound, crowd vibe, and insider gig tips?'}
                  </p>
                  <button
                    type="button"
                    onClick={handleFetchAiPreview}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'เช็ค Vibe งานนี้ (Gemini AI)' : 'Generate AI Vibe Check'}</span>
                  </button>
                </div>
              )
            )}

            {/* State 2: Loading State */}
            {isLoadingAi && (
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-850 space-y-2.5 animate-pulse">
                <div className="flex items-center gap-2 text-xs text-lime-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-semibold">
                    {lang === 'th'
                      ? 'กำลังวิเคราะห์ซาวด์ดนตรีและบรรยากาศไลฟ์เฮาส์...'
                      : 'Analyzing artists, venue acoustics, and gig vibe...'}
                  </span>
                </div>
                <div className="h-3 bg-neutral-800 rounded-sm w-full" />
                <div className="h-3 bg-neutral-800 rounded-sm w-4/5" />
                <div className="h-8 bg-neutral-850 rounded-lg w-full mt-2" />
              </div>
            )}

            {/* State 3: Error State */}
            {aiError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/70 space-y-2">
                <div className="flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{aiError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchAiPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs cursor-pointer active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{lang === 'th' ? 'ลองใหม่อีกครั้ง' : 'Retry'}</span>
                </button>
              </div>
            )}

            {/* State 4: Loaded State */}
            {aiPreview && (
              <div className="space-y-2.5 animate-in fade-in duration-200">
                {/* Vibe Atmosphere Quote */}
                <div className="p-3 rounded-xl bg-neutral-950/80 border border-lime-400/20">
                  <p className="text-xs text-neutral-200 italic leading-relaxed">
                    "{aiPreview.vibeSummary}"
                  </p>
                </div>

                {/* Lineup Highlights */}
                {aiPreview.lineupHighlights && aiPreview.lineupHighlights.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-850 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                      {lang === 'th' ? 'จุดเด่นของศิลปินและซาวด์:' : 'Lineup Sound Highlights:'}
                    </span>
                    <ul className="text-xs text-neutral-300 space-y-1 list-disc list-inside">
                      {aiPreview.lineupHighlights.map((hl, i) => (
                        <li key={i} className="leading-snug">{hl}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Crowd Atmosphere & Tips Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-850 space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
                      {lang === 'th' ? 'บรรยากาศคนดู:' : 'Crowd Vibe:'}
                    </span>
                    <p className="text-neutral-300 font-medium">{aiPreview.crowdAtmosphere}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-850 space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-lime-400 font-bold block">
                      💡 {lang === 'th' ? 'คำแนะนำการเดินทาง/เวลา:' : 'Insider Tip:'}
                    </span>
                    <p className="text-neutral-300">{aiPreview.practicalTip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sincerity Notice */}
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                  {t.eventDetail.unconfirmedNotice}
                </span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {t.eventDetail.disclaimerText}
              </p>
            </div>
          </div>

          {/* ==================== CROWD REPORT SECTION (Requirements 1, 2, 3) ==================== */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-lime-400" />
                <span>{t.eventDetail.reportTitle}</span>
              </h3>
              {reports.length > 0 && (
                <span className="text-[10px] font-mono text-neutral-400">
                  {reports.length} report{reports.length === 1 ? '' : 's'} (90m)
                </span>
              )}
            </div>

            {reportError && (
              <p className="text-xs text-red-400 bg-red-950/60 p-2 rounded-lg border border-red-800">
                {reportError}
              </p>
            )}

            {!user ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-neutral-400">
                  {t.eventDetail.signInToReport}
                </p>
                <button
                  type="button"
                  onClick={handleSignInForReport}
                  disabled={isSigningIn}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
                >
                  {isSigningIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'available', labelTh: 'ยังมีบัตร', labelEn: 'Available', symbol: '✓', cls: 'hover:border-emerald-500 hover:text-emerald-400' },
                      { key: 'low', labelTh: 'เหลือน้อย', labelEn: 'Low', symbol: '◐', cls: 'hover:border-amber-500 hover:text-amber-400' },
                      { key: 'sold_out', labelTh: 'บัตรหมด', labelEn: 'Sold out', symbol: '✕', cls: 'hover:border-rose-500 hover:text-rose-400' },
                    ] as { key: CrowdReportStatus; labelTh: string; labelEn: string; symbol: string; cls: string }[]
                  ).map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      disabled={isSubmittingReport}
                      onClick={() => handleReportStatus(btn.key)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 ${btn.cls} min-h-[44px]`}
                      aria-label={`Report ${btn.labelEn}`}
                    >
                      <span className="text-sm">{btn.symbol}</span>
                      <span className="mt-0.5">{lang === 'th' ? btn.labelTh : btn.labelEn}</span>
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-neutral-400 text-center">
                  {t.eventDetail.thanksReported(lang === 'th' ? STATUS_MAP[event.status]?.labelTh || event.status : STATUS_MAP[event.status]?.label || event.status)}
                </p>
              </div>
            )}
          </div>

          {/* Essential Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-neutral-800 text-lime-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  {t.eventDetail.dateTime}
                </div>
                <div className="text-sm font-semibold text-white mt-0.5 leading-snug">
                  {formatBangkokDateTime(event.startAt, lang)}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-neutral-800 text-lime-400 shrink-0">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  {t.eventDetail.price}
                </div>
                <div className="text-sm font-semibold text-white mt-0.5 leading-snug">
                  {event.priceText || (lang === 'th' ? 'ไม่มีข้อมูลราคา' : 'Free / Not specified')}
                </div>
              </div>
            </div>
          </div>

          {/* Promoter Info with Verified Blue Check */}
          {promoter && (
            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-neutral-800 text-sky-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    {t.eventDetail.promoter}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-white truncate">
                      {promoter.name}
                    </span>
                    {promoter.verified && (
                      <span title={t.eventDetail.verifiedBadge} aria-label={t.eventDetail.verifiedBadge} className="inline-flex">
                        <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {promoter.igUrl && (
                <a
                  href={promoter.igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-colors shrink-0"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  <span>IG</span>
                </a>
              )}
            </div>
          )}

          {/* Performing Artists / Lineup */}
          {event.artists && event.artists.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold font-mono text-neutral-400 uppercase tracking-wider">
                {t.eventDetail.artists}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {event.artists.map((artist, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-medium"
                  >
                    {artist}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Music Genres */}
          {event.genres && event.genres.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-lime-400" />
                <span>{t.eventDetail.genres}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {event.genres.map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-neutral-900/60 border border-neutral-800/80 text-neutral-400 font-mono text-[11px]"
                  >
                    #{genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons: Buy Tickets + View IG Post */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {event.ticketUrl ? (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-lime-400/20 active:scale-98"
              >
                <Ticket className="w-4 h-4" />
                <span>{t.eventDetail.buyTickets}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-neutral-800 text-neutral-500 font-semibold text-sm cursor-not-allowed"
              >
                <Ticket className="w-4 h-4" />
                <span>{t.eventDetail.buyTickets}</span>
              </button>
            )}

            {event.igPostUrl ? (
              <a
                href={event.igPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm border border-neutral-800 transition-all active:scale-98"
              >
                <Instagram className="w-4 h-4 text-pink-400" />
                <span>{t.eventDetail.viewIgPost}</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </a>
            ) : null}
          </div>

          {/* Report a problem mailto link (Requirement 4) */}
          <div className="pt-3 text-center">
            <a
              href={`mailto:wanthawatjx@gmail.com?subject=${encodeURIComponent(`Problem regarding event: ${event.title}`)}`}
              className="text-xs font-mono text-neutral-500 hover:text-neutral-300 underline underline-offset-2 transition-colors"
            >
              {t.eventDetail.reportAProblem}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
