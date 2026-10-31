export type EventStatus =
  | 'available'
  | 'low'
  | 'sold_out'
  | 'not_open'
  | 'cancelled';

export type CrowdReportStatus = 'available' | 'low' | 'sold_out';

export interface ConcertEvent {
  id: string;
  title: string;
  artists: string[];
  venueId: string;
  promoterId?: string;
  startAt: string | number | { seconds: number; nanoseconds: number };
  priceText: string;
  genres: string[];
  ticketUrl?: string;
  igPostUrl?: string;
  posterUrl?: string;
  status: EventStatus;
  statusUpdatedAt: string | number | { seconds: number; nanoseconds: number };
  statusSource: 'admin' | 'organizer';
  origin?: 'manual' | 'ai';
  sourceUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CrowdReport {
  status: CrowdReportStatus;
  createdAt: any;
}

export type EventFormData = {
  title: string;
  artists: string[];
  venueId: string;
  promoterId?: string;
  startAtIso: string;
  priceText: string;
  genres: string[];
  ticketUrl?: string;
  igPostUrl?: string;
  posterUrl?: string;
  status: EventStatus;
  origin?: 'manual' | 'ai';
  sourceUrl?: string;
};

export type DateFilter = 'all' | 'today' | 'week' | 'month';
