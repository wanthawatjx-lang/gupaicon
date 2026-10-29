import { EventStatus, ConcertEvent } from '../types/event';
import { isEventUpcoming } from './dateUtils';

export interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  textColor: string;
  pinColor: string;
}

export const STATUS_MAP: Record<EventStatus, StatusConfig> = {
  available: {
    label: 'Available',
    badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50',
    dotClass: 'bg-emerald-400',
    textColor: 'text-emerald-400',
    pinColor: '#22c55e',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    dotClass: 'bg-amber-400',
    textColor: 'text-amber-400',
    pinColor: '#eab308',
  },
  sold_out: {
    label: 'Sold out',
    badgeClass: 'bg-rose-950/80 text-rose-400 border-rose-500/50',
    dotClass: 'bg-rose-500',
    textColor: 'text-rose-400',
    pinColor: '#ef4444',
  },
  not_open: {
    label: 'Not open',
    badgeClass: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    dotClass: 'bg-neutral-500',
    textColor: 'text-neutral-400',
    pinColor: '#71717a',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-neutral-900 text-neutral-500 border-neutral-800 line-through',
    dotClass: 'bg-neutral-600',
    textColor: 'text-neutral-500',
    pinColor: '#52525b',
  },
};

/**
 * Calculates the most urgent status for a venue's upcoming events
 * Priority order:
 * 1. 'low' -> yellow (urgent! last chance tickets)
 * 2. 'available' -> green (tickets ready)
 * 3. 'sold_out' -> red (all shows full)
 * 4. 'not_open' / 'cancelled' -> slate/grey
 * If no upcoming events -> 'none' (grey pin)
 */
export function getVenueUrgentStatus(events: ConcertEvent[]): {
  status: EventStatus | 'none';
  color: string;
  upcomingCount: number;
} {
  const upcoming = events.filter((e) => isEventUpcoming(e.startAt));

  if (upcoming.length === 0) {
    return {
      status: 'none',
      color: '#52525b', // grey
      upcomingCount: 0,
    };
  }

  // Priority 1: Any event is Low on tickets
  if (upcoming.some((e) => e.status === 'low')) {
    return {
      status: 'low',
      color: '#eab308', // yellow
      upcomingCount: upcoming.length,
    };
  }

  // Priority 2: Any event has tickets Available
  if (upcoming.some((e) => e.status === 'available')) {
    return {
      status: 'available',
      color: '#22c55e', // green
      upcomingCount: upcoming.length,
    };
  }

  // Priority 3: Sold out events
  if (upcoming.some((e) => e.status === 'sold_out')) {
    return {
      status: 'sold_out',
      color: '#ef4444', // red
      upcomingCount: upcoming.length,
    };
  }

  // Priority 4: Not open or Cancelled
  return {
    status: upcoming[0].status,
    color: '#71717a', // grey
    upcomingCount: upcoming.length,
  };
}
