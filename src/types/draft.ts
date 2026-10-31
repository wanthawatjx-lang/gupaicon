export interface EventDraft {
  id: string;
  title: string;
  artists: string[];
  venueName: string;
  promoterName?: string | null;
  startAt: string;
  priceText?: string | null;
  genres: string[];
  ticketUrl?: string | null;
  sourceUrl: string;
  sourceName: string;
  confidence: number;
  notes?: string | null;
  warnings: string[];
  matchedVenueId?: string | null;
  fingerprint: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
}
