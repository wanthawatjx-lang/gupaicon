import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { EventDraft } from '../types/draft';
import { EventStatus } from '../types/event';
import { parseStrictBangkokDate } from '../utils/dateUtils';

const COLLECTION_NAME = 'eventDrafts';
const EVENTS_COLLECTION = 'events';

export async function fetchEventDrafts(): Promise<EventDraft[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const rawStartAt =
        typeof data.startAt === 'string'
          ? data.startAt
          : data.startAt?.toDate
          ? data.startAt.toDate().toISOString()
          : '';
      return {
        id: docSnap.id,
        title: data.title ?? '',
        artists: Array.isArray(data.artists) ? data.artists : [],
        venueName: data.venueName ?? '',
        promoterName: data.promoterName || null,
        startAt: rawStartAt,
        priceText: data.priceText || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        ticketUrl: data.ticketUrl || null,
        sourceUrl: data.sourceUrl ?? '',
        sourceName: data.sourceName ?? '',
        confidence: Number(data.confidence ?? 0.5),
        notes: data.notes || null,
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        matchedVenueId: data.matchedVenueId || null,
        fingerprint: data.fingerprint ?? '',
        reviewStatus: data.reviewStatus ?? 'pending',
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function updateEventDraft(id: string, data: Partial<EventDraft>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventDraft(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function approveEventDraft(
  draft: EventDraft,
  selectedStatus: EventStatus = 'not_open'
): Promise<string> {
  const venueId = typeof draft.matchedVenueId === 'string' ? draft.matchedVenueId.trim() : '';
  if (!venueId || !/^[a-zA-Z0-9_-]{1,128}$/.test(venueId)) {
    throw new Error('Cannot approve event draft without a valid matched venue.');
  }

  // Dates: if startAt is invalid, throw an error and block approval instead of using the current time
  if (!draft.startAt || typeof draft.startAt !== 'string') {
    throw new Error('Event draft startAt date is missing or invalid.');
  }
  const startDate = parseStrictBangkokDate(draft.startAt);
  if (!startDate || isNaN(startDate.getTime())) {
    throw new Error(`Invalid startAt date "${draft.startAt}". Cannot approve draft.`);
  }
  const startTimestamp = Timestamp.fromDate(startDate);

  // Status: never guess status from notes/ticketUrl. Use admin's choice (defaulting to "not_open")
  const validStatuses: EventStatus[] = ['available', 'low', 'sold_out', 'not_open', 'cancelled'];
  const status: EventStatus = validStatuses.includes(selectedStatus) ? selectedStatus : 'not_open';

  const cleanTitle = (draft.title || '').trim().slice(0, 120);
  if (cleanTitle.length === 0) {
    throw new Error('Cannot approve event draft with an empty title.');
  }

  const eventId = `evt_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const path = `${EVENTS_COLLECTION}/${eventId}`;

  // firestore.rules reject null for optional fields.
  // Build the event object without optional keys when empty (promoterId, ticketUrl, igPostUrl, posterUrl, sourceUrl omitted).
  const cleanArtists = (Array.isArray(draft.artists) ? draft.artists : [])
    .map((a) => String(a || '').trim())
    .filter(Boolean)
    .slice(0, 20);
  const cleanGenres = (Array.isArray(draft.genres) ? draft.genres : [])
    .map((g) => String(g || '').trim())
    .filter(Boolean)
    .slice(0, 8);

  const eventPayload: Record<string, any> = {
    title: cleanTitle,
    artists: cleanArtists.length > 0 ? cleanArtists : [cleanTitle],
    venueId,
    startAt: startTimestamp,
    priceText: (typeof draft.priceText === 'string' && draft.priceText.trim()
      ? draft.priceText.trim()
      : 'Check ticket page'
    ).slice(0, 60),
    genres: cleanGenres,
    status,
    statusUpdatedAt: serverTimestamp(),
    statusSource: 'admin',
    origin: 'ai',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Only include optional keys if non-empty string, NEVER null
  if (typeof draft.ticketUrl === 'string' && draft.ticketUrl.trim().length > 0) {
    const cleanTicket = draft.ticketUrl.trim().slice(0, 500);
    if (!cleanTicket.startsWith('https://')) {
      throw new Error('Ticket URL must start with https:// when provided.');
    }
    eventPayload.ticketUrl = cleanTicket;
  }
  if (typeof draft.sourceUrl === 'string' && draft.sourceUrl.trim().length > 0) {
    eventPayload.sourceUrl = draft.sourceUrl.trim().slice(0, 500);
  }

  try {
    // 1. Create real event in Firestore
    await setDoc(eventRef, eventPayload);

    // 2. Delete approved draft
    await deleteEventDraft(draft.id);

    return eventId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function rejectEventDraft(draftId: string): Promise<void> {
  await updateEventDraft(draftId, { reviewStatus: 'rejected' });
  await deleteEventDraft(draftId);
}
