import { EventStatus, ConcertEvent } from '../types/event';
import { isEventUpcoming } from './dateUtils';
import { Language } from '../i18n';

export interface StatusConfig {
  label: string;
  labelTh: string;
  labelEn: string;
  symbol: string;
  badgeClass: string;
  dotClass: string;
  textColor: string;
  pinColor: string;
}

export function normalizeStatus(status: string | undefined): 'available' | 'low' | 'soldout' | 'notopen' | 'cancelled' {
  if (!status) return 'notopen';
  if (status === 'sold_out' || status === 'soldout') return 'soldout';
  if (status === 'not_open' || status === 'notopen') return 'notopen';
  if (status === 'available') return 'available';
  if (status === 'low') return 'low';
  if (status === 'cancelled') return 'cancelled';
  return 'notopen';
}

const BASE_MAP: Record<'available' | 'low' | 'soldout' | 'notopen' | 'cancelled', StatusConfig> = {
  available: {
    label: 'Available',
    labelTh: 'ยังมีบัตร',
    labelEn: 'Available',
    symbol: '✓',
    badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50',
    dotClass: 'bg-emerald-400',
    textColor: 'text-emerald-400',
    pinColor: '#22c55e',
  },
  low: {
    label: 'Low',
    labelTh: 'เหลือน้อย',
    labelEn: 'Low',
    symbol: '◐',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    dotClass: 'bg-amber-400',
    textColor: 'text-amber-400',
    pinColor: '#eab308',
  },
  soldout: {
    label: 'Sold out',
    labelTh: 'บัตรหมด',
    labelEn: 'Sold out',
    symbol: '✕',
    badgeClass: 'bg-rose-950/80 text-rose-400 border-rose-500/50',
    dotClass: 'bg-rose-500',
    textColor: 'text-rose-400',
    pinColor: '#ef4444',
  },
  notopen: {
    label: 'Not open',
    labelTh: 'ยังไม่เปิดขาย',
    labelEn: 'Not open',
    symbol: '○',
    badgeClass: 'bg-neutral-900 text-neutral-400 border-neutral-700',
    dotClass: 'bg-neutral-500',
    textColor: 'text-neutral-400',
    pinColor: '#71717a',
  },
  cancelled: {
    label: 'Cancelled',
    labelTh: 'ยกเลิก',
    labelEn: 'Cancelled',
    symbol: '⊘',
    badgeClass: 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through',
    dotClass: 'bg-neutral-600',
    textColor: 'text-neutral-500',
    pinColor: '#52525b',
  },
};

export const STATUS_MAP: Record<string, StatusConfig> = {
  ...BASE_MAP,
  sold_out: BASE_MAP.soldout,
  not_open: BASE_MAP.notopen,
};

export function getStatusLabel(status: EventStatus | string, lang: Language): string {
  const norm = normalizeStatus(status);
  return lang === 'th' ? STATUS_MAP[norm].labelTh : STATUS_MAP[norm].labelEn;
}

export function getStatusSymbol(status: EventStatus | string): string {
  const norm = normalizeStatus(status);
  return STATUS_MAP[norm].symbol;
}

export function getStatusConfig(status: EventStatus | string): StatusConfig {
  const norm = normalizeStatus(status);
  return STATUS_MAP[norm];
}

/**
 * Calculates the most urgent status for a venue's upcoming events
 */
export function getVenueUrgentStatus(events: ConcertEvent[]): {
  status: 'available' | 'low' | 'soldout' | 'notopen' | 'cancelled' | 'none';
  color: string;
  upcomingCount: number;
  symbol: string;
} {
  const upcoming = events.filter((e) => isEventUpcoming(e.startAt));

  if (upcoming.length === 0) {
    return {
      status: 'none',
      color: '#52525b', // grey
      upcomingCount: 0,
      symbol: '',
    };
  }

  // Priority 1: soldout (แดง)
  if (upcoming.some((e) => normalizeStatus(e.status) === 'soldout')) {
    return {
      status: 'soldout',
      color: '#ef4444',
      upcomingCount: upcoming.length,
      symbol: '✕',
    };
  }

  // Priority 2: low (เหลือง)
  if (upcoming.some((e) => normalizeStatus(e.status) === 'low')) {
    return {
      status: 'low',
      color: '#eab308',
      upcomingCount: upcoming.length,
      symbol: '◐',
    };
  }

  // Priority 3: available (เขียว)
  if (upcoming.some((e) => normalizeStatus(e.status) === 'available')) {
    return {
      status: 'available',
      color: '#22c55e',
      upcomingCount: upcoming.length,
      symbol: '✓',
    };
  }

  // Priority 4: grey for notopen or cancelled
  const firstNorm = normalizeStatus(upcoming[0].status);
  return {
    status: firstNorm,
    color: '#71717a',
    upcomingCount: upcoming.length,
    symbol: STATUS_MAP[firstNorm].symbol,
  };
}
