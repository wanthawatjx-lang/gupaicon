import React, { useEffect, useRef } from 'react';
import { Venue } from '../types/venue';
import { ConcertEvent } from '../types/event';
import { STATUS_MAP } from '../utils/statusUtils';
import { formatBangkokDateTime, formatRelativeTime, isEventUpcoming, parseTimestampToDate } from '../utils/dateUtils';
import {
  MapPin,
  Instagram,
  ExternalLink,
  X,
  Edit3,
  Compass,
  Calendar,
  ChevronRight,
  Music2,
  Ticket,
} from 'lucide-react';

interface VenueBottomSheetProps {
  venue: Venue | null;
  events?: ConcertEvent[];
  onSelectEvent?: (event: ConcertEvent) => void;
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (venue: Venue) => void;
}

export const VenueBottomSheet: React.FC<VenueBottomSheetProps> = ({
  venue,
  events = [],
  onSelectEvent,
  onClose,
  isAdmin = false,
  onEdit,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!venue) return null;

  const isSample = venue.name.toUpperCase().startsWith('SAMPLE');

  // Filter upcoming events for this venue, sorted by date (Requirement 2)
  const venueEvents = events
    .filter((e) => e.venueId === venue.id && isEventUpcoming(e.startAt))
    .sort((a, b) => parseTimestampToDate(a.startAt).getTime() - parseTimestampToDate(b.startAt).getTime());

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-1000 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-labelledby="sheet-venue-title"
        className="fixed bottom-0 left-0 right-0 z-1001 max-w-lg mx-auto bg-neutral-950 border-t border-x border-neutral-800 rounded-t-3xl shadow-2xl overflow-hidden pb-6 pt-3 px-5 max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-200"
      >
        {/* Pull handle bar */}
        <div className="flex justify-center mb-2 shrink-0">
          <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* Top bar with tags and close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-lime-400 text-black font-mono text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                Livehouse
              </span>
              {isSample && (
                <span className="px-2 py-0.5 rounded-sm bg-neutral-800 text-amber-300 border border-amber-400/30 font-mono text-[10px] uppercase font-medium">
                  Sample Data
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(venue)}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Edit Venue"
                  aria-label="Edit Venue"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Close bottom sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Venue Title */}
          <div>
            <h2
              id="sheet-venue-title"
              className="text-2xl font-bold tracking-tight text-white leading-tight font-display"
            >
              {venue.name}
            </h2>
            <div className="flex items-start gap-2 text-neutral-300 text-sm mt-1.5 leading-snug">
              <MapPin className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
              <span>{venue.address}</span>
            </div>
          </div>

          {/* Coordinates Pill */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400 bg-neutral-900/90 border border-neutral-800/80 px-3 py-1.5 rounded-md w-fit">
            <Compass className="w-3.5 h-3.5 text-neutral-500" />
            <span>
              {venue.lat.toFixed(4)}° N, {venue.lng.toFixed(4)}° E
            </span>
          </div>

          {/* Action Buttons (Large Touch Targets for mobile 390px) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Maps Link */}
            <a
              href={venue.mapsUrl || `https://maps.google.com/?q=${venue.lat},${venue.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Maps</span>
            </a>

            {/* Instagram Link */}
            <a
              href={venue.igUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </a>
          </div>

          {/* Upcoming Events List (Requirement 2) */}
          <div className="pt-3 border-t border-neutral-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-lime-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-200">
                  Upcoming Concerts
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                {venueEvents.length} {venueEvents.length === 1 ? 'show' : 'shows'}
              </span>
            </div>

            {venueEvents.length === 0 ? (
              <div className="p-5 text-center rounded-xl bg-neutral-900/40 border border-dashed border-neutral-800 text-neutral-500 text-xs">
                No upcoming concerts scheduled at this venue.
              </div>
            ) : (
              <div className="space-y-2.5">
                {venueEvents.map((event) => {
                  const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.not_open;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent && onSelectEvent(event)}
                      className="w-full text-left p-3.5 rounded-xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-lime-400/50 transition-all flex items-start justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Date/Time and relative update */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-lime-400">
                          <span className="flex items-center gap-1 font-semibold">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatBangkokDateTime(event.startAt)}
                          </span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-[11px] text-neutral-400">
                            {formatRelativeTime(event.statusUpdatedAt)}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-white group-hover:text-lime-300 transition-colors line-clamp-1">
                          {event.title}
                        </h4>

                        {/* Artists & Price */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                          {event.artists.length > 0 && (
                            <span className="truncate max-w-[200px]">
                              {event.artists.slice(0, 2).join(', ')}
                              {event.artists.length > 2 ? '...' : ''}
                            </span>
                          )}
                          {event.priceText && (
                            <span className="font-mono text-neutral-300">
                              • {event.priceText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge & Chevron */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold uppercase tracking-wider ${statusInfo.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-lime-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
