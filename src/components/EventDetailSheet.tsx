import React, { useEffect } from 'react';
import { ConcertEvent } from '../types/event';
import { Promoter } from '../types/promoter';
import { STATUS_MAP } from '../utils/statusUtils';
import { formatBangkokDateTime, formatRelativeTime } from '../utils/dateUtils';
import { Language, translations } from '../i18n/translations';
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

  const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.not_open;
  const localizedStatusLabel = t.status[event.status] || statusInfo.label;
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
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-xs font-bold uppercase tracking-wider ${statusInfo.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                <span>{localizedStatusLabel}</span>
              </span>

              {/* Status Last Updated Time (Requirement 2 & 3) */}
              <span className="text-[11px] font-mono text-neutral-400">
                {formatRelativeTime(event.statusUpdatedAt, lang)}
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
              aria-label={t.eventDetail.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
                <span className="font-medium">
                  {lang === 'th' ? `จัดที่ ${venueName}` : `Hosted at ${venueName}`}
                </span>
              </button>
            )}
          </div>

          {/* Date & Time (Asia/Bangkok) (Requirement 3) */}
          <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-neutral-800 text-lime-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-0.5">
                {t.eventDetail.dateTime} (Asia/Bangkok)
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {formatBangkokDateTime(event.startAt, lang)}
              </div>
            </div>
          </div>

          {/* Artists / Lineup (Requirement 3) */}
          {event.artists.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                <Users className="w-3.5 h-3.5 text-lime-400" />
                <span>{t.eventDetail.artists}</span>
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

          {/* Promoter & Price Grid (Requirement 3) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Promoter: name with verified check linking to promoter igUrl */}
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/70">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                {t.eventDetail.promoter}
              </div>
              {promoter ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={promoter.igUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-white hover:text-lime-300 transition-colors group"
                    title={promoter.igUrl ? `Visit @${promoter.name} on Instagram` : promoter.name}
                  >
                    <span className="truncate">{promoter.name}</span>
                    {promoter.verified && (
                      <span title={t.eventDetail.verifiedBadge} className="inline-flex items-center">
                        <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                      </span>
                    )}
                    {promoter.igUrl && (
                      <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-lime-400 ml-0.5" />
                    )}
                  </a>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">Independent Organizer</span>
              )}
            </div>

            {/* Price */}
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/70">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                {t.eventDetail.price}
              </div>
              <div className="text-sm font-bold text-lime-400 truncate">
                {event.priceText || (lang === 'th' ? 'ตรวจสอบลิงก์บัตร' : 'Check ticket link')}
              </div>
            </div>
          </div>

          {/* Genres (Requirement 3) */}
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
        </div>

        {/* Action Buttons (Requirement 3: Buy tickets and View IG post, open in new tab, no embeds) */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-900 shrink-0 mt-2">
          {/* Buy Tickets Button */}
          <a
            href={event.ticketUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-lime-950/40"
          >
            <Ticket className="w-4 h-4" />
            <span>{t.eventDetail.buyTickets}</span>
          </a>

          {/* View IG Post Button */}
          <a
            href={event.igPostUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-white font-semibold text-sm hover:border-pink-500/50 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            <Instagram className="w-4 h-4 text-pink-400" />
            <span>{t.eventDetail.viewIgPost}</span>
          </a>
        </div>
      </div>
    </>
  );
};
