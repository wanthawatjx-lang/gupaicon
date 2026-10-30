import React, { useState, useEffect, useRef } from 'react';
import { Venue } from '../types/venue';
import { ConcertEvent } from '../types/event';
import { getStatusConfig, getStatusLabel, getStatusSymbol } from '../utils/statusUtils';
import {
  formatBangkokDateTime,
  isEventUpcoming,
  parseTimestampToDate,
} from '../utils/dateUtils';
import { Language, translations } from '../i18n';
import {
  MapPin,
  Instagram,
  ExternalLink,
  X,
  Edit3,
  Calendar,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Music2,
} from 'lucide-react';

interface VenueBottomSheetProps {
  venue: Venue | null;
  events?: ConcertEvent[];
  onSelectEvent?: (event: ConcertEvent) => void;
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (venue: Venue) => void;
  lang: Language;
}

type SnapLevel = 'peek' | 'half' | 'full';

export const VenueBottomSheet: React.FC<VenueBottomSheetProps> = ({
  venue,
  events = [],
  onSelectEvent,
  onClose,
  isAdmin = false,
  onEdit,
  lang,
}) => {
  const [snapLevel, setSnapLevel] = useState<SnapLevel>('half');
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);
  const t = translations[lang];

  // Reset to 'half' whenever a new venue is opened
  useEffect(() => {
    if (venue) {
      setSnapLevel('half');
    }
  }, [venue?.id]);

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

  // Filter upcoming events for this venue, sorted chronologically (Requirement 3)
  const venueEvents = events
    .filter((e) => e.venueId === venue.id && isEventUpcoming(e.startAt))
    .sort(
      (a, b) =>
        parseTimestampToDate(a.startAt).getTime() -
        parseTimestampToDate(b.startAt).getTime()
    );

  // Height class mapping for 3 snap levels
  const heightClasses = {
    peek: 'h-[130px]',
    half: 'h-[50vh]',
    full: 'h-[88vh]',
  };

  const cycleSnap = () => {
    if (snapLevel === 'peek') setSnapLevel('half');
    else if (snapLevel === 'half') setSnapLevel('full');
    else setSnapLevel('half');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };

  const handleTouchEnd = () => {
    const delta = touchDeltaY.current;
    if (delta < -40) {
      // Swipe up -> expand
      if (snapLevel === 'peek') setSnapLevel('half');
      else if (snapLevel === 'half') setSnapLevel('full');
    } else if (delta > 40) {
      // Swipe down -> collapse
      if (snapLevel === 'full') setSnapLevel('half');
      else if (snapLevel === 'half') setSnapLevel('peek');
      else onClose();
    }
    touchDeltaY.current = 0;
  };

  return (
    <>
      {/* Backdrop: only visible on half and full */}
      {snapLevel !== 'peek' && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-1000 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sheet Container with 3 snap levels */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-labelledby="sheet-venue-title"
        className={`fixed bottom-0 left-0 right-0 z-1001 max-w-lg mx-auto bg-neutral-950 border-t border-x border-neutral-800 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out ${heightClasses[snapLevel]}`}
      >
        {/* Pull handle bar - draggable */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={cycleSnap}
          className="flex flex-col items-center pt-2.5 pb-2 shrink-0 cursor-pointer select-none group"
          title={t.venueSheet.dragToExpand}
          aria-label={t.venueSheet.dragToExpand}
        >
          <div className="w-12 h-1.5 bg-neutral-700 group-hover:bg-neutral-500 rounded-full transition-colors" />
          <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-1">
            {snapLevel === 'full' ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
            <span>{snapLevel === 'peek' ? t.venueSheet.dragToExpand : ''}</span>
          </div>
        </div>

        {/* Header content: always visible in peek, half, full */}
        <div className="px-5 pb-3 shrink-0 border-b border-neutral-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-lime-400 text-black font-mono text-[11px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  Livehouse
                </span>
                {isSample && (
                  <span className="px-1.5 py-0.2 rounded-sm bg-neutral-900 text-amber-300 border border-amber-400/30 font-mono text-[10px] uppercase font-medium">
                    SAMPLE
                  </span>
                )}
              </div>
              <h2
                id="sheet-venue-title"
                className="text-lg font-bold text-white tracking-tight truncate leading-tight"
              >
                {venue.name}
              </h2>
              <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0 text-neutral-500" />
                <span className="truncate">{venue.address}</span>
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isAdmin && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(venue)}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                  aria-label="Edit venue"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Container (Visible in half & full) */}
        {snapLevel !== 'peek' && (
          <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
            {/* Quick Actions (Maps & IG) */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={venue.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 transition-all text-xs font-medium active:scale-98 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.venueSheet.openInMaps}</span>
              </a>

              <a
                href={venue.igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 transition-all text-xs font-medium active:scale-98 shadow-sm"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <span>{t.venueSheet.instagram}</span>
              </a>
            </div>

            {/* Upcoming Shows Section */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold font-mono tracking-wider text-neutral-300 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-lime-400" />
                  <span>{t.venueSheet.upcomingEvents}</span>
                </h3>
                <span className="text-[11px] font-mono text-neutral-500">
                  {venueEvents.length} {t.app.eventsCount(venueEvents.length)}
                </span>
              </div>

              {venueEvents.length === 0 ? (
                <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 text-center space-y-1.5">
                  <Music2 className="w-7 h-7 text-neutral-600 mx-auto stroke-[1.5]" />
                  <p className="text-sm text-neutral-300 font-medium">
                    {t.venueSheet.noUpcomingEventsHere}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {lang === 'th'
                      ? 'โปรดติดตามการอัปเดตงานใหม่ทาง IG ของร้าน'
                      : 'Follow the venue on Instagram for upcoming show announcements.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {venueEvents.map((evt) => {
                    const statusConfig = getStatusConfig(evt.status);
                    const statusLabel = getStatusLabel(evt.status, lang);
                    const statusSymbol = getStatusSymbol(evt.status);

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => onSelectEvent?.(evt)}
                        className="w-full text-left p-3.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800/90 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-center justify-between gap-3 group cursor-pointer active:scale-99 shadow-sm"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Date and Bangkok Time */}
                          <div className="text-[11px] font-mono font-medium text-lime-400">
                            {formatBangkokDateTime(evt.startAt, lang)}
                          </div>

                          {/* Event Title */}
                          <div className="text-sm font-bold text-white group-hover:text-lime-300 transition-colors truncate">
                            {evt.title}
                          </div>

                          {/* Artists & Price */}
                          <div className="text-xs text-neutral-400 truncate flex items-center gap-2">
                            <span className="truncate">
                              {evt.artists.join(', ')}
                            </span>
                            {evt.priceText && (
                              <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                                • {evt.priceText}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge: Color + Icon/Symbol + Text */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[11px] font-bold whitespace-nowrap ${statusConfig.badgeClass}`}
                          >
                            <span>{statusSymbol}</span>
                            <span>{statusLabel}</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
