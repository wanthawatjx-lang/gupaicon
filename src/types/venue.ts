export interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  igUrl: string;
  mapsUrl: string;
  createdAt?: string | number | { seconds: number; nanoseconds: number };
  updatedAt?: string | number | { seconds: number; nanoseconds: number };
}

export type VenueFormData = Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>;
