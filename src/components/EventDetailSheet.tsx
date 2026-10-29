import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { ConcertEvent } from '../types/event';
import { Promoter } from '../types/promoter';
import {
  CrowdReport,
  CrowdReportStatus,
  computeDisplayedStatus,
} from '../utils/crowdStatusLogic';
import {
  subscribeToEventReports,
  submitCrowdReport,
} from '../services/reportService';
import { formatBangkokDateTime, formatRelativeTime } from '../utils/dateUtils';
import {
  Calendar,
  Ticket,
  Instagram,
  X,
  BadgeCheck,
  Tag,
  Users,
  MapPin,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
  Check,
  Radio,
} from 'lucide-react';

interface EventDetailSheetProps {
  event: ConcertEvent | null;
  promoter?: Promoter;
  venueName?: string;
  user: User | null;
  onClose: () => void;
  onOpenVenue?: () => void;
}

export const EventDetailSheet: React.FC<EventDetailSheetProps> = ({
  event,
  promoter,
  venueName,
  user,
  onClose,
  onOpenVenue,
}) => {
  const [reports, setReports] = useState<CrowdReport[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Requirement 5: Only subscribe to reports for THIS open event
  useEffect(() => {
    if (!event) {
      setReports([]);
      setReportFeedback(null);
      return;
    }

    setReportFeedback(null);
    const unsubscribe = subscribeToEventReports(
      event.id,
      (loadedReports) => {
        setReports(loadedReports);
      },
      (err) => {
        console.warn('Crowd reports note:', err);
      }
    );

    return () => unsubscribe();
  }, [event?.id]);

  if (!event) return null;

  // Requirement 4: Compute displayed ticket status on client
  const computedStatus = computeDisplayedStatus(event, reports);
  const isSample = event.title.toUpperCase().startsWith('SAMPLE');

  // Check if current user has already submitted a report for this event
  const userExistingReport = user ? reports.find((r) => r.id === user.uid) : null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleReport = async (status: CrowdReportStatus) => {
    if (!user) {
      await handleSignIn();
      return;
    }

    setIsSubmittingReport(true);
    setReportFeedback(null);
    try {
      await submitCrowdReport(event.id, user.uid, status);
      const label = status === 'available' ? 'Available' : status === 'low' ? 'Low' : 'Sold out';
      setReportFeedback(`Thanks, you reported: ${label}`);
    } catch (err: any) {
      console.error('Submit report error:', err);
      setReportFeedback('Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

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
          {/* Header row: Computed Status Badge + Relative Update + Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Dynamic Status Badge (Requirement 4) */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-xs font-bold uppercase tracking-wider ${computedStatus.statusConfig.badgeClass}`}
              >
                {computedStatus.badgeType === 'admin_verified' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : computedStatus.badgeType === 'organizer_verified' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                ) : computedStatus.badgeType === 'crowd_confirmed' ? (
                  <Users className="w-3.5 h-3.5 text-lime-400" />
                ) : computedStatus.badgeType === 'unconfirmed' ? (
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${computedStatus.statusConfig.dotClass} animate-pulse`} />
                )}
                <span>{computedStatus.label}</span>
              </span>

              {/* Status Details / Sub-label */}
              <span className="text-[11px] font-mono text-neutral-400">
                {computedStatus.details}
              </span>

              {isSample && (
                <span className="px-2 py-0.5 rounded-sm bg-neutral-900 text-amber-300 border border-amber-500/30 font-mono text-[10px] uppercase font-medium">
                  Sample
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

          {/* Secondary note if crowd reports are newer (e.g. Organizer says: X updated N min ago) */}
          {computedStatus.secondaryNote && (
            <div className="text-xs font-mono text-sky-300 bg-sky-950/40 border border-sky-800/40 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>{computedStatus.secondaryNote}</span>
            </div>
          )}

          {/* Optional Poster Header Banner */}
          {event.posterUrl && (
            <div className="relative w-full h-44 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-md">
              <img
                src={event.posterUrl}
                alt={`${event.title} poster`}
                className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />
            </div>
          )}

          {/* Event Title */}
          <div>
            <h2
              id="event-title"
              className="text-2xl font-bold tracking-tight text-white leading-tight font-display"
            >
              {event.title}
            </h2>

            {/* Venue Tag */}
            {venueName && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenVenue) onOpenVenue();
                }}
                className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-lime-400 hover:text-lime-300 hover:underline transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-medium">Hosted at {venueName}</span>
              </button>
            )}
          </div>

          {/* Date & Time (Asia/Bangkok) */}
          <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-neutral-800 text-lime-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-0.5">
                Date & Time (Bangkok)
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {formatBangkokDateTime(event.startAt)}
              </div>
            </div>
          </div>

          {/* Artists / Lineup */}
          {event.artists.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                <Users className="w-3.5 h-3.5 text-lime-400" />
                <span>Lineup</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {event.artists.map((artist, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-semibold text-neutral-200"
                  >
                    {artist}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Promoter & Price Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Promoter */}
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/70">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Promoter</span>
                {promoter && (
                  <a
                    href={`#/promoter/${promoter.id}`}
                    onClick={() => onClose()}
                    className="text-[10px] text-lime-400 hover:underline"
                  >
                    View Page →
                  </a>
                )}
              </div>
              {promoter ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`#/promoter/${promoter.id}`}
                    onClick={() => onClose()}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-white hover:text-lime-300 transition-colors group"
                  >
                    <span className="truncate">{promoter.name}</span>
                    {promoter.verified && (
                      <span title="Verified Promoter" className="inline-flex items-center">
                        <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                      </span>
                    )}
                  </a>
                  {promoter.igUrl && (
                    <a
                      href={promoter.igUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-500 hover:text-pink-400 transition-colors ml-1"
                      title="Promoter Instagram"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-xs text-neutral-400">Independent Organizer</span>
              )}
            </div>

            {/* Price */}
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/70">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                Tickets / Price
              </div>
              <div className="text-sm font-bold text-lime-400 truncate">
                {event.priceText || 'Check ticket link'}
              </div>
            </div>
          </div>

          {/* Genres */}
          {event.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Tag className="w-3.5 h-3.5 text-neutral-500 mr-1" />
              {event.genres.map((genre, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-400 border border-neutral-800 text-xs font-mono"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* ===================================================================== */}
          {/* CROWD-REPORTED TICKET STATUS SECTION (Requirements 1, 2, 3)          */}
          {/* ===================================================================== */}
          <div className="mt-4 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-lime-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Report Ticket Status
                </h3>
              </div>

              {reports.length > 0 && (
                <span className="text-[11px] font-mono text-neutral-400">
                  {reports.length} {reports.length === 1 ? 'report' : 'reports'}
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              At the venue or checking tickets? Share the live status to help other indie gig-goers.
            </p>

            {/* User Existing Report Banner */}
            {user && (userExistingReport || reportFeedback) && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-lime-400/40 text-xs flex items-center justify-between gap-2 text-lime-300 font-mono animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>
                    {reportFeedback ||
                      `Thanks, you reported: ${
                        userExistingReport?.status === 'available'
                          ? 'Available'
                          : userExistingReport?.status === 'low'
                          ? 'Low'
                          : 'Sold out'
                      } (${formatRelativeTime(userExistingReport?.createdAt)})`}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400">Tap below to change</span>
              </div>
            )}

            {/* If NOT signed in: Sign in to report button (Requirement 1 & 3) */}
            {!user ? (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Sign in with Google to report</span>
              </button>
            ) : (
              /* If signed in: Three Big Buttons (Requirement 3: Available / Low / Sold out) */
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* Available */}
                <button
                  type="button"
                  onClick={() => handleReport('available')}
                  disabled={isSubmittingReport}
                  className={`py-3 px-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                    userExistingReport?.status === 'available'
                      ? 'bg-emerald-950 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                      : 'bg-neutral-950 border-neutral-800 text-emerald-400 hover:border-emerald-500/70 hover:bg-neutral-900 active:scale-95'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Available</span>
                </button>

                {/* Low */}
                <button
                  type="button"
                  onClick={() => handleReport('low')}
                  disabled={isSubmittingReport}
                  className={`py-3 px-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                    userExistingReport?.status === 'low'
                      ? 'bg-amber-950 border-amber-400 text-amber-200 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                      : 'bg-neutral-950 border-neutral-800 text-amber-400 hover:border-amber-500/70 hover:bg-neutral-900 active:scale-95'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Low</span>
                </button>

                {/* Sold out */}
                <button
                  type="button"
                  onClick={() => handleReport('sold_out')}
                  disabled={isSubmittingReport}
                  className={`py-3 px-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                    userExistingReport?.status === 'sold_out'
                      ? 'bg-rose-950 border-rose-400 text-rose-200 ring-2 ring-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                      : 'bg-neutral-950 border-neutral-800 text-rose-400 hover:border-rose-500/70 hover:bg-neutral-900 active:scale-95'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span>Sold Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons (Buy tickets & View IG post) */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-900 shrink-0 mt-2">
          {/* Buy Tickets Button */}
          <a
            href={event.ticketUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-lime-950/40"
          >
            <Ticket className="w-4 h-4" />
            <span>Buy Tickets</span>
          </a>

          {/* View IG Post Button */}
          <a
            href={event.igPostUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-white font-semibold text-sm hover:border-pink-500/50 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            <Instagram className="w-4 h-4 text-pink-400" />
            <span>View IG Post</span>
          </a>
        </div>
      </div>
    </>
  );
};
