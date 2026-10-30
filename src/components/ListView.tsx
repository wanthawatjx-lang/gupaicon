import React from 'react';
import { ConcertEvent } from '../types/event';
import { Venue } from '../types/venue';
import { Promoter } from '../types/promoter';
import { getStatusConfig, getStatusLabel, getStatusSymbol } from '../utils/statusUtils';
import { formatBangkokDateTime, formatRelativeTime, parseTimestampToDate } from '../utils/dateUtils';
import { Language, translations } from '../i18n';
import {
  Calendar,
  MapPin,
  Ticket,
  Clock,
  RotateCcw,
  Music2,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react';

interface ListViewProps {
  events: ConcertEvent[];
  venues: Venue[];
  promoters: Promoter[];
  loading?: boolean;
  onSelectEvent: (event: ConcertEvent) => void;
  onClearFilters: () => void;
  lang: Language;
}

export const ListView: React.FC<ListViewProps> = ({
  events,
  venues,
  promoters,
  loading = false,
  onSelectEvent,
  onClearFilters,
  lang,
}) => {
  const t = translations[lang];

  // Sort chronologically
  const sortedEvents = [...events].sort(
    (a, b) =>
      parseTimestampToDate(a.startAt).getTime() -
      parseTimestampToDate(b.startAt).getTime()
  );

  return (
    <div className="w-full h-full pt-32 pb-24 px-4 overflow-y-auto max-w-2xl mx-auto">
      {/* Skeleton Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-neutral-800 rounded w-1/3" />
                <div className="h-5 bg-neutral-800 rounded-md w-24" />
              </div>
              <div className="h-6 bg-neutral-800 rounded w-3/4" />
              <div className="h-4 bg-neutral-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedEvents.length === 0 && (
        <div className="py-16 px-6 text-center space-y-4 rounded-3xl bg-neutral-950/80 border border-neutral-800/80 mt-4 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
            <Music2 className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {t.filters.noEventsInPeriod}
            </h3>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              {t.filters.noEventsFound}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs tracking-wide transition-all active:scale-95 cursor-pointer shadow-lg shadow-lime-400/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.filters.clearFilters}</span>
          </button>
        </div>
      )}

      {/* Events List */}
      {!loading && sortedEvents.length > 0 && (
        <div className="space-y-3">
          {sortedEvents.map((evt) => {
            const venue = venues.find((v) => v.id === evt.venueId);
            const promoter = promoters.find((p) => p.id === evt.promoterId);
            const statusConfig = getStatusConfig(evt.status);
            const statusLabel = getStatusLabel(evt.status, lang);
            const statusSymbol = getStatusSymbol(evt.status);
            const isSample = evt.title.toUpperCase().startsWith('SAMPLE');

            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => onSelectEvent(evt)}
                className="w-full text-left p-4 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900/90 border border-neutral-800/80 hover:border-neutral-700 transition-all group flex flex-col gap-2.5 cursor-pointer active:scale-99 shadow-lg backdrop-blur-md"
              >
                {/* Top Row: Date & Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono font-semibold text-lime-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatBangkokDateTime(evt.startAt, lang)}</span>
                  </div>

                  {/* Status Badge: Color + Symbol + Word */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-mono text-[11px] font-bold shrink-0 ${statusConfig.badgeClass}`}
                  >
                    <span>{statusSymbol}</span>
                    <span>{statusLabel}</span>
                  </span>
                </div>

                {/* Event Title */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-lime-300 transition-colors leading-snug">
                        {evt.title}
                      </h3>
                      {isSample && (
                        <span className="px-1.5 py-0.2 rounded-sm bg-neutral-900 text-amber-300 border border-amber-500/30 font-mono text-[9px] uppercase font-medium shrink-0">
                          SAMPLE
                        </span>
                      )}
                    </div>

                    {/* Performing Artists */}
                    {evt.artists && evt.artists.length > 0 && (
                      <p className="text-xs text-neutral-300 font-medium truncate">
                        {evt.artists.join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors shrink-0 mt-1" />
                </div>

                {/* Footer details: Venue, Price, Relative Update */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-900 text-xs text-neutral-400">
                  <div className="flex items-center gap-3 truncate">
                    {venue && (
                      <span className="flex items-center gap-1 text-neutral-300 truncate">
                        <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span className="truncate">{venue.name}</span>
                      </span>
                    )}

                    {evt.priceText && (
                      <span className="flex items-center gap-1 text-neutral-400 font-mono text-[11px] shrink-0">
                        <Ticket className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span>{evt.priceText}</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-neutral-600" />
                    <span>{formatRelativeTime(evt.statusUpdatedAt, lang)}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
