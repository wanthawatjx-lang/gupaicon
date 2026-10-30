import React, { useEffect } from 'react';
import { ConcertEvent } from '../types/event';
import { Promoter } from '../types/promoter';
import { getStatusConfig, getStatusLabel, getStatusSymbol } from '../utils/statusUtils';
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
} from 'lucide-react';

interface EventDetailSheetProps {
  event: ConcertEvent | null;
  promoter?: Promoter;
  venueName?: string;
  onClose: () => void;
  onOpenVenue?: () => void;
  lang: Language;
}

export const EventDetailSheet: React.FC<EventDetailSheetProps> = ({
  event,
  promoter,
  venueName,
  onClose,
  onOpenVenue,
  lang,
}) => {
  const t = translations[lang];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!event) return null;

  const statusConfig = getStatusConfig(event.status);
  const statusLabel = getStatusLabel(event.status, lang);
  const statusSymbol = getStatusSymbol(event.status);
  const isSample = event.title.toUpperCase().startsWith('SAMPLE');

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
          {/* Header row: Status Badge + Relative Update + Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Badge: Color + Icon/Symbol + Word */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-xs font-bold uppercase tracking-wider ${statusConfig.badgeClass}`}
              >
                <span>{statusSymbol}</span>
                <span>{statusLabel}</span>
              </span>

              {/* Status Last Updated Time (Requirement 3) */}
              <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-500" />
                <span>{formatRelativeTime(event.statusUpdatedAt, lang)}</span>
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
          </div>

          {/* Sincerity Notice (Requirement 3) */}
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

          {/* Essential Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Date & Time in Asia/Bangkok */}
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

            {/* Price Description */}
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

          {/* Promoter Info with Verified Blue Check (Requirement 3) */}
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

          {/* Action Buttons: Buy Tickets + View IG Post (Requirement 3) */}
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
        </div>
      </div>
    </>
  );
};
