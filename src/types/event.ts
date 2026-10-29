export type EventStatus = 'not_open' | 'available' | 'low' | 'sold_out' | 'cancelled';

export interface ConcertEvent {
  id: string;
  title: string;
  artists: string[];
  venueId: string;
  promoterId: string;
  startAt: string | number | { seconds: number; nanoseconds: number };
  priceText: string;
  genres: string[];
  ticketUrl: string;
  igPostUrl: string;
  posterUrl?: string;
  status: EventStatus;
  statusUpdatedAt: string | number | { seconds: number; nanoseconds: number };
  statusSource: 'admin';
  createdAt?: any;
  updatedAt?: any;
}

export type EventFormData = {
  title: string;
  artists: string[];
  venueId: string;
  promoterId: string;
  startAtIso: string;
  priceText: string;
  genres: string[];
  ticketUrl: string;
  igPostUrl: string;
  posterUrl?: string;
  status: EventStatus;
};

export type DateFilter = 'all' | 'today' | 'week' | 'month';
