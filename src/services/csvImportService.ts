import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  limit,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Venue } from '../types/venue';
import { Promoter } from '../types/promoter';
import { ConcertEvent, EventStatus } from '../types/event';

// Robust RFC 4180 CSV Parser handling quoted fields, commas, line breaks, and UTF-8 BOM
export function parseCSV(text: string): string[][] {
  if (!text) return [];
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nextC = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (nextC === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (c === '\r' && nextC === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else if (c === '\n' || c === '\r') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += c;
      }
    }
  }
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export interface VenuePreviewRow {
  rowNumber: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  igUrl: string;
  mapsUrl: string;
  status: 'ok' | 'duplicate' | 'error';
  reason?: string;
}

export interface EventPreviewRow {
  rowNumber: number;
  title: string;
  artists: string[];
  venueName: string;
  promoterName: string;
  startAtIso: string;
  startAtDate: Date | null;
  priceText: string;
  genres: string[];
  ticketUrl: string;
  igPostUrl: string;
  eventStatus: EventStatus;
  status: 'ok' | 'duplicate' | 'error';
  reason?: string;
}

const LAT_MIN = 13.40;
const LAT_MAX = 14.30;
const LNG_MIN = 100.20;
const LNG_MAX = 100.95;

const VALID_STATUSES: EventStatus[] = ['available', 'low', 'sold_out', 'not_open', 'cancelled'];

export function validateVenuesCSV(
  parsedRows: string[][],
  existingVenues: Venue[]
): { rows: VenuePreviewRow[]; validCount: number; duplicateCount: number; errorCount: number } {
  if (parsedRows.length < 2) {
    return { rows: [], validCount: 0, duplicateCount: 0, errorCount: 0 };
  }

  const dataRows = parsedRows.slice(1, 501);
  const existingNames = new Set(existingVenues.map((v) => v.name.trim().toLowerCase()));
  const seenInFile = new Set<string>();

  const previewRows: VenuePreviewRow[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  dataRows.forEach((cols, idx) => {
    const rowNumber = idx + 2;
    const name = (cols[0] || '').trim();
    const latStr = (cols[1] || '').trim();
    const lngStr = (cols[2] || '').trim();
    const address = (cols[3] || '').trim();
    const igUrl = (cols[4] || '').trim();
    const mapsUrl = (cols[5] || '').trim();

    let status: 'ok' | 'duplicate' | 'error' = 'ok';
    let reason = '';

    const lat = Number(latStr);
    const lng = Number(lngStr);

    if (!name || name.length < 2 || name.length > 100) {
      status = 'error';
      reason = 'Name must be 2 to 100 characters.';
    } else if (isNaN(lat) || lat < LAT_MIN || lat > LAT_MAX || isNaN(lng) || lng < LNG_MIN || lng > LNG_MAX) {
      status = 'error';
      reason = `Coordinates out of bounds (Lat ${LAT_MIN}-${LAT_MAX}, Lng ${LNG_MIN}-${LNG_MAX}). Never guess coordinates.`;
    } else if (!address || address.length < 2 || address.length > 250) {
      status = 'error';
      reason = 'Address must be 2 to 250 characters.';
    } else if (!mapsUrl || !mapsUrl.startsWith('https://')) {
      status = 'error';
      reason = 'mapsUrl is required and must start with https://.';
    } else if (igUrl && !igUrl.startsWith('https://')) {
      status = 'error';
      reason = 'igUrl must start with https:// if provided.';
    } else {
      const lowerName = name.toLowerCase();
      if (existingNames.has(lowerName) || seenInFile.has(lowerName)) {
        status = 'duplicate';
        reason = 'Venue name already exists.';
        duplicateCount++;
      } else {
        seenInFile.add(lowerName);
        validCount++;
      }
    }

    if (status === 'error') {
      errorCount++;
    }

    previewRows.push({
      rowNumber,
      name,
      lat: isNaN(lat) ? 0 : lat,
      lng: isNaN(lng) ? 0 : lng,
      address,
      igUrl,
      mapsUrl,
      status,
      reason,
    });
  });

  return { rows: previewRows, validCount, duplicateCount, errorCount };
}

export function validateEventsCSV(
  parsedRows: string[][],
  existingVenues: Venue[],
  existingPromoters: Promoter[],
  existingEvents: ConcertEvent[]
): {
  rows: EventPreviewRow[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  newPromotersMap: Map<string, string>;
} {
  if (parsedRows.length < 2) {
    return { rows: [], validCount: 0, duplicateCount: 0, errorCount: 0, newPromotersMap: new Map() };
  }

  const dataRows = parsedRows.slice(1, 501);
  const venueMap = new Map<string, Venue>();
  existingVenues.forEach((v) => venueMap.set(v.name.trim().toLowerCase(), v));

  const promoterMap = new Map<string, Promoter>();
  existingPromoters.forEach((p) => promoterMap.set(p.name.trim().toLowerCase(), p));

  const existingEventSignatures = new Set(
    existingEvents.map((e) => {
      const vName = (existingVenues.find((v) => v.id === e.venueId)?.name || '').trim().toLowerCase();
      let timeMs = 0;
      const sa: any = e.startAt;
      if (sa && typeof sa.toMillis === 'function') {
        timeMs = sa.toMillis();
      } else if (sa && typeof sa.seconds === 'number') {
        timeMs = sa.seconds * 1000;
      } else if (sa) {
        const d = new Date(sa);
        timeMs = isNaN(d.getTime()) ? 0 : d.getTime();
      }
      return `${e.title.trim().toLowerCase()}_${vName}_${timeMs}`;
    })
  );

  const previewRows: EventPreviewRow[] = [];
  const newPromotersMap = new Map<string, string>();
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  const nowMs = Date.now();

  dataRows.forEach((cols, idx) => {
    const rowNumber = idx + 2;
    const title = (cols[0] || '').trim();
    const artistsRaw = (cols[1] || '').trim();
    const venueName = (cols[2] || '').trim();
    const promoterName = (cols[3] || '').trim();
    const startAtStr = (cols[4] || '').trim();
    const priceText = (cols[5] || '').trim() || '350 THB';
    const genresRaw = (cols[6] || '').trim();
    const ticketUrl = (cols[7] || '').trim();
    const igPostUrl = (cols[8] || '').trim();
    const statusRaw = (cols[9] || '').trim().toLowerCase();

    let status: 'ok' | 'duplicate' | 'error' = 'ok';
    let reason = '';

    const artists = artistsRaw ? artistsRaw.split('|').map((a) => a.trim()).filter(Boolean) : [];
    const genres = genresRaw ? genresRaw.split('|').map((g) => g.trim()).filter(Boolean) : [];
    const eventStatus: EventStatus = VALID_STATUSES.includes(statusRaw as EventStatus)
      ? (statusRaw as EventStatus)
      : 'not_open';

    let startAtDate: Date | null = null;
    let startAtIso = '';
    if (startAtStr) {
      const isoFormat = startAtStr.replace(' ', 'T') + ':00+07:00';
      const parsed = new Date(isoFormat);
      if (!isNaN(parsed.getTime())) {
        startAtDate = parsed;
        startAtIso = isoFormat;
      }
    }

    if (!title || title.length > 120) {
      status = 'error';
      reason = 'Title is required (max 120 characters).';
    } else if (artists.length === 0 || artists.length > 20) {
      status = 'error';
      reason = 'At least 1 artist required (max 20, separated by |).';
    } else if (!venueName) {
      status = 'error';
      reason = 'venueName is required.';
    } else if (!venueMap.has(venueName.toLowerCase())) {
      status = 'error';
      reason = `Venue "${venueName}" does not exist in database. Import venue first.`;
    } else if (!startAtDate || isNaN(startAtDate.getTime())) {
      status = 'error';
      reason = 'Invalid startAt format (expected YYYY-MM-DD HH:mm in Bangkok time).';
    } else if (startAtDate.getTime() < nowMs) {
      status = 'error';
      reason = 'Event startAt cannot be in the past.';
    } else if (ticketUrl && !ticketUrl.startsWith('https://')) {
      status = 'error';
      reason = 'ticketUrl must start with https:// if provided.';
    } else if (igPostUrl && !igPostUrl.startsWith('https://')) {
      status = 'error';
      reason = 'igPostUrl must start with https:// if provided.';
    } else if (genres.length > 8) {
      status = 'error';
      reason = 'Maximum 8 genres allowed.';
    } else {
      const matchedVenue = venueMap.get(venueName.toLowerCase());
      const timeMs = startAtDate.getTime();
      const signature = `${title.toLowerCase()}_${venueName.toLowerCase()}_${timeMs}`;

      if (existingEventSignatures.has(signature)) {
        status = 'duplicate';
        reason = 'Event already exists (same title, venue, and start time).';
        duplicateCount++;
      } else {
        existingEventSignatures.add(signature);
        validCount++;
      }

      if (promoterName) {
        const pKey = promoterName.toLowerCase();
        if (!promoterMap.has(pKey) && !newPromotersMap.has(pKey)) {
          const newPromId = `promoter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          newPromotersMap.set(pKey, newPromId);
        }
      }
    }

    if (status === 'error') {
      errorCount++;
    }

    previewRows.push({
      rowNumber,
      title,
      artists,
      venueName,
      promoterName,
      startAtIso,
      startAtDate,
      priceText,
      genres,
      ticketUrl,
      igPostUrl,
      eventStatus,
      status,
      reason,
    });
  });

  return { rows: previewRows, validCount, duplicateCount, errorCount, newPromotersMap };
}

export async function executeVenuesImport(
  validRows: VenuePreviewRow[],
  onProgress: (current: number, total: number) => void
): Promise<number> {
  let imported = 0;
  const batches: VenuePreviewRow[][] = [];
  for (let i = 0; i < validRows.length; i += 400) {
    batches.push(validRows.slice(i, i + 400));
  }

  for (const batchRows of batches) {
    const batch = writeBatch(db);
    for (const row of batchRows) {
      const docId = `venue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, 'venues', docId);
      batch.set(docRef, {
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        address: row.address,
        igUrl: row.igUrl || '',
        mapsUrl: row.mapsUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      imported++;
    }
    await batch.commit();
    onProgress(imported, validRows.length);
  }
  return imported;
}

export async function executeEventsImport(
  validRows: EventPreviewRow[],
  existingVenues: Venue[],
  existingPromoters: Promoter[],
  newPromotersMap: Map<string, string>,
  onProgress: (current: number, total: number) => void
): Promise<{ eventsImported: number; promotersCreated: number }> {
  const venueMap = new Map<string, Venue>();
  existingVenues.forEach((v) => venueMap.set(v.name.trim().toLowerCase(), v));

  const batchPromoters = writeBatch(db);
  let promotersCreated = 0;
  const createdPromoterIds = new Map<string, string>();
  existingPromoters.forEach((p) => createdPromoterIds.set(p.name.toLowerCase(), p.id));

  for (const [pNameLower, pId] of newPromotersMap.entries()) {
    if (!createdPromoterIds.has(pNameLower)) {
      const matchingRow = validRows.find((r) => r.promoterName.toLowerCase() === pNameLower);
      const actualName = matchingRow ? matchingRow.promoterName : pNameLower;
      const pRef = doc(db, 'promoters', pId);
      batchPromoters.set(pRef, {
        name: actualName,
        verified: false,
        igUrl: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      createdPromoterIds.set(pNameLower, pId);
      promotersCreated++;
    }
  }
  if (promotersCreated > 0) {
    await batchPromoters.commit();
  }

  let eventsImported = 0;
  const batches: EventPreviewRow[][] = [];
  for (let i = 0; i < validRows.length; i += 400) {
    batches.push(validRows.slice(i, i + 400));
  }

  for (const batchRows of batches) {
    const batch = writeBatch(db);
    for (const row of batchRows) {
      const venue = venueMap.get(row.venueName.toLowerCase());
      const venueId = venue ? venue.id : '';
      let promoterId = '';
      if (row.promoterName) {
        promoterId = createdPromoterIds.get(row.promoterName.toLowerCase()) || '';
      }

      const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, 'events', eventId);

      const payload: Record<string, any> = {
        title: row.title,
        artists: row.artists,
        venueId,
        startAt: row.startAtDate ? Timestamp.fromDate(row.startAtDate) : Timestamp.now(),
        priceText: row.priceText,
        genres: row.genres,
        status: row.eventStatus,
        statusSource: 'admin',
        statusUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (promoterId) payload.promoterId = promoterId;
      if (row.ticketUrl) payload.ticketUrl = row.ticketUrl;
      if (row.igPostUrl) payload.igPostUrl = row.igPostUrl;

      batch.set(docRef, payload);
      eventsImported++;
    }
    await batch.commit();
    onProgress(eventsImported, validRows.length);
  }

  return { eventsImported, promotersCreated };
}

export async function deleteAllSampleData(): Promise<{
  venuesDeleted: number;
  promotersDeleted: number;
  eventsDeleted: number;
  reportsDeleted: number;
}> {
  const [venuesSnap, promotersSnap, eventsSnap] = await Promise.all([
    getDocs(query(collection(db, 'venues'), limit(1000))),
    getDocs(query(collection(db, 'promoters'), limit(1000))),
    getDocs(query(collection(db, 'events'), limit(1000))),
  ]);

  const sampleVenues = venuesSnap.docs.filter((d) => d.data().name?.toUpperCase().startsWith('SAMPLE'));
  const samplePromoters = promotersSnap.docs.filter((d) => d.data().name?.toUpperCase().startsWith('SAMPLE'));
  const sampleEvents = eventsSnap.docs.filter((d) => d.data().title?.toUpperCase().startsWith('SAMPLE'));

  let reportsDeleted = 0;
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const evDoc of sampleEvents) {
    try {
      const reportsSnap = await getDocs(collection(db, 'events', evDoc.id, 'reports'));
      for (const repDoc of reportsSnap.docs) {
        batch.delete(repDoc.ref);
        reportsDeleted++;
        batchCount++;
        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }
    } catch (e) {
      console.warn('Error deleting reports for sample event:', e);
    }

    batch.delete(evDoc.ref);
    batchCount++;
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  for (const vDoc of sampleVenues) {
    batch.delete(vDoc.ref);
    batchCount++;
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  for (const pDoc of samplePromoters) {
    batch.delete(pDoc.ref);
    batchCount++;
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return {
    venuesDeleted: sampleVenues.length,
    promotersDeleted: samplePromoters.length,
    eventsDeleted: sampleEvents.length,
    reportsDeleted,
  };
}
