export type SourceType = 'search_query' | 'ticket_page' | 'venue_site';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  value: string;
  venueId?: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export type SourceFormData = {
  name: string;
  type: SourceType;
  value: string;
  venueId?: string;
  active: boolean;
};
