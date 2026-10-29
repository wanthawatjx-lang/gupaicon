import React, { useMemo } from 'react';
import { Promoter } from '../types/promoter';
import { ConcertEvent } from '../types/event';
import { Venue } from '../types/venue';
import { STATUS_MAP } from '../utils/statusUtils';
import {
  formatBangkokDateTime,
  formatRelativeTime,
  isEventUpcoming,
  parseTimestampToDate,
} from '../utils/dateUtils';
import {
  ArrowLeft,
  BadgeCheck,
  Instagram,
  Calendar,
  MapPin,
  Music2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface PromoterPageProps {
  promoterId: string;
  promoters: Promoter[];
  events: ConcertEvent[];
  venues: Venue[];
  onSelectEvent: (event: ConcertEvent) => void;
  onBack: () => void;
}

export const PromoterPage: React.FC<PromoterPageProps> = ({
  promoterId,
  promoters,
  events,
  venues,
  onSelectEvent,
  onBack,
}) => {
  const promoter = useMemo(
    () => promoters.find((p) => p.id === promoterId),
    [promoters, promoterId]
  );

  const venueMap = useMemo(() => {
    const map = new Map<string, string>();
    venues.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [venues]);

  // Filter events belonging to this promoter
  const promoterEvents = useMemo(() => {
    return events.filter((e) => e.promoterId === promoterId);
  }, [events, promoterId]);

  const upcomingEvents = useMemo(() => {
    return promoterEvents
      .filter((e) => isEventUpcoming(e.startAt))
      .sort(
        (a, b) =>
          parseTimestampToDate(a.startAt).getTime() -
          parseTimestampToDate(b.startAt).getTime()
      );
  }, [promoterEvents]);

  const pastEvents = useMemo(() => {
    return promoterEvents
      .filter((e) => !isEventUpcoming(e.startAt))
      .sort(
        (a, b) =>
          parseTimestampToDate(b.startAt).getTime() -
          parseTimestampToDate(a.startAt).getTime()
      );
  }, [promoterEvents]);

  if (!promoter) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-neutral-600 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Promoter Not Found</h2>
        <p className="text-xs text-neutral-400 mb-6 max-w-xs">
          The requested promoter could not be found or has been removed.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono font-bold hover:bg-neutral-850 cursor-pointer"
        >
          ← Return to Map
        </button>
      </div>
    );
  }

  const isSample = promoter.name.toUpperCase().startsWith('SAMPLE');

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col pb-16">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Map</span>
        </button>

        <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
          Promoter Profile
        </span>
      </header>

      {/* Hero Banner / Details */}
      <div className="max-w-xl mx-auto w-full px-5 pt-6 pb-6">
        <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800/90 shadow-2xl relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 blur-3xl rounded-full pointer-events-none" />

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {promoter.verified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/70 text-sky-300 border border-sky-500/30 font-mono text-xs font-bold uppercase tracking-wider">
                <BadgeCheck className="w-4 h-4 text-sky-400" />
                <span>Verified Organizer</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono text-xs">
                Community Organizer
              </span>
            )}

            {isSample && (
              <span className="px-2 py-0.5 rounded-sm bg-neutral-900 text-amber-300 border border-amber-500/30 font-mono text-[10px] uppercase font-medium">
                Sample Data
              </span>
            )}
          </div>

          {/* Promoter Name */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
              {promoter.name}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              Bangkok & Rangsit Indie Gig Curator
            </p>
          </div>

          {/* Links & Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {promoter.igUrl && (
              <a
                href={promoter.igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white font-semibold text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-md"
              >
                <Instagram className="w-4 h-4" />
                <span>Official Instagram</span>
              </a>
            )}

            <div className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
              <strong className="text-white font-bold">{upcomingEvents.length}</strong> upcoming show{upcomingEvents.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Upcoming Concerts */}
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-lime-400" />
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Upcoming Concerts
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-neutral-950 border border-dashed border-neutral-800 text-neutral-500 text-xs font-mono">
              No upcoming concerts currently listed for this promoter.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.not_open;
                const venueName = venueMap.get(event.venueId) || 'Bangkok Venue';

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="w-full text-left p-4 rounded-2xl bg-neutral-950 hover:bg-neutral-900/90 border border-neutral-800/80 hover:border-lime-400/50 transition-all flex items-start justify-between gap-3 group cursor-pointer shadow-lg"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Date & relative update */}
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-lime-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatBangkokDateTime(event.startAt)}
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="text-[11px] text-neutral-400">
                          {formatRelativeTime(event.statusUpdatedAt)}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h3 className="text-base font-bold text-white group-hover:text-lime-300 transition-colors line-clamp-1 font-display">
                        {event.title}
                      </h3>

                      {/* Venue & Artists */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <span className="inline-flex items-center gap-1 text-neutral-300">
                          <MapPin className="w-3 h-3 text-neutral-500" />
                          <span>{venueName}</span>
                        </span>
                        {event.artists.length > 0 && (
                          <span className="text-neutral-400">
                            • {event.artists.slice(0, 2).join(', ')}
                            {event.artists.length > 2 ? '...' : ''}
                          </span>
                        )}
                        {event.priceText && (
                          <span className="font-mono text-lime-400 font-semibold">
                            • {event.priceText}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge & arrow */}
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
        </section>

        {/* Past Concerts */}
        {pastEvents.length > 0 && (
          <section className="mt-10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
                Past Concerts Archive
              </h2>
              <span className="text-xs font-mono text-neutral-600">
                {pastEvents.length} archived
              </span>
            </div>

            <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
              {pastEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-900 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-neutral-300">{event.title}</span>
                    <span className="text-neutral-500 font-mono ml-2">
                      ({formatBangkokDateTime(event.startAt)})
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase">
                    Past
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
